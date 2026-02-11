import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import {
  createPDFDocument,
  addCompanyFiscalHeader,
  addIVABreakdownTable,
  addPDFSection,
  addPDFFooter,
  formatCurrency,
} from '@/lib/utils/pdf'
import { NextRequest, NextResponse } from 'next/server'
import type { CompanyFiscalData } from '@/types/expenses'

/**
 * GET /api/sales/print/daily-report
 * Generate daily report PDF or JSON
 * Query params: date (YYYY-MM-DD), format (pdf|json)
 * Accessible by: admin, manager, owner
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
  const format = searchParams.get('format') || 'pdf'

  try {
    // Fetch daily sales
    const { data: dailySales, error: salesError } = await supabase
      .from('daily_sales')
      .select('*')
      .eq('date', date)
      .single()

    if (salesError && salesError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Failed to fetch daily sales', details: salesError.message },
        { status: 500 }
      )
    }

    // Fetch sales IVA breakdown
    const { data: ivaBreakdown, error: ivaError } = await supabase
      .from('sales_iva_breakdown')
      .select('*')
      .eq('date', date)

    if (ivaError) {
      return NextResponse.json(
        { error: 'Failed to fetch IVA breakdown', details: ivaError.message },
        { status: 500 }
      )
    }

    // Fetch company fiscal data from restaurant_settings
    const { data: settings } = await supabase
      .from('restaurant_settings')
      .select('value')
      .eq('key', 'company_fiscal')
      .single()

    const fiscalData: CompanyFiscalData = settings?.value || {
      razon_social: 'GrandCafe Cheers S.L.',
      cif: 'B12345678',
      direccion: 'Carrer de Cartago 22, El Arenal',
      codigo_postal: '07600',
      ciudad: 'Mallorca',
      provincia: 'Illes Balears',
      pais: 'Spain',
      telefono: '',
      email: '',
    }

    if (format === 'json') {
      return NextResponse.json({
        date,
        daily_sales: dailySales || {},
        iva_breakdown: ivaBreakdown || [],
        fiscal_data: fiscalData,
      })
    }

    // Generate PDF
    const pdfBuffer = await generateDailyReportPDF(
      date,
      dailySales,
      ivaBreakdown || [],
      fiscalData
    )

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="daily-report-${date}.pdf"`,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Daily report generation error:', message)
    return NextResponse.json(
      { error: 'Failed to generate daily report', details: message },
      { status: 500 }
    )
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateDailyReportPDF(
  date: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dailySales: any,
  ivaBreakdown: Array<{
    category: string
    base_imponible: number
    iva_rate: number
    iva_amount: number
    total: number
  }>,
  fiscalData: CompanyFiscalData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = createPDFDocument()
      const chunks: Buffer[] = []

      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // Add company fiscal header
      addCompanyFiscalHeader(doc, fiscalData, {
        title: 'Informe Diario de Ventas',
        subtitle: `Fecha: ${date}`,
        generatedAt: new Date(),
      })

      // Revenue by category section
      if (dailySales) {
        const revenueData: Array<{ label: string; value: string | number }> = []

        if (dailySales.food_revenue !== undefined) {
          revenueData.push({ label: 'Food Revenue', value: formatCurrency(dailySales.food_revenue || 0) })
        }
        if (dailySales.beverage_revenue !== undefined) {
          revenueData.push({ label: 'Beverage Revenue', value: formatCurrency(dailySales.beverage_revenue || 0) })
        }
        if (dailySales.other_revenue !== undefined) {
          revenueData.push({ label: 'Other Revenue', value: formatCurrency(dailySales.other_revenue || 0) })
        }

        const totalRevenue =
          (dailySales.food_revenue || 0) +
          (dailySales.beverage_revenue || 0) +
          (dailySales.other_revenue || 0)
        revenueData.push({ label: 'Total Revenue', value: formatCurrency(totalRevenue) })

        if (dailySales.total_covers !== undefined) {
          revenueData.push({ label: 'Total Covers', value: dailySales.total_covers || 0 })
        }

        if (dailySales.total_covers && totalRevenue) {
          const avgTicket = totalRevenue / dailySales.total_covers
          revenueData.push({ label: 'Average Ticket', value: formatCurrency(avgTicket) })
        }

        addPDFSection(doc, {
          title: 'Revenue Summary',
          data: revenueData,
        })
      }

      // IVA Breakdown table
      if (ivaBreakdown.length > 0) {
        addIVABreakdownTable(doc, ivaBreakdown)
      }

      // Add footer with page numbers
      addPDFFooter(doc)

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
