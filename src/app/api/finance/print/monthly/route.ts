import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import {
  createPDFDocument,
  addCompanyFiscalHeader,
  addPDFSection,
  addPDFTable,
  addPDFFooter,
  formatCurrency,
  formatPercentage,
  type PDFTableColumn,
} from '@/lib/utils/pdf'
import { NextRequest, NextResponse } from 'next/server'
import type { CompanyFiscalData } from '@/types/expenses'

/**
 * GET /api/finance/print/monthly
 * Generate monthly P&L PDF
 * Query params: year (number), month (1-12)
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

  const year = parseInt(
    searchParams.get('year') || String(new Date().getFullYear()),
    10
  )
  const month = parseInt(
    searchParams.get('month') || String(new Date().getMonth() + 1),
    10
  )

  if (month < 1 || month > 12) {
    return NextResponse.json(
      { error: 'Month must be between 1 and 12' },
      { status: 400 }
    )
  }

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  try {
    // Fetch daily financials for the month
    const { data: dailyFinancials, error: finError } = await supabase
      .from('daily_financials')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (finError) {
      return NextResponse.json(
        { error: 'Failed to fetch financial data', details: finError.message },
        { status: 500 }
      )
    }

    // Fetch IVA totals for the month
    const { data: ivaData, error: ivaError } = await supabase
      .from('sales_iva_breakdown')
      .select('iva_rate, base_imponible, iva_amount, total')
      .gte('date', startDate)
      .lte('date', endDate)

    if (ivaError) {
      console.error('Failed to fetch IVA data:', ivaError)
    }

    // Fetch company fiscal data
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

    // Generate PDF
    const pdfBuffer = await generateMonthlyPDF(
      year,
      month,
      startDate,
      endDate,
      dailyFinancials || [],
      ivaData || [],
      fiscalData
    )

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ]

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="monthly-pl-${monthNames[month - 1]}-${year}.pdf"`,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Monthly P&L PDF generation error:', message)
    return NextResponse.json(
      { error: 'Failed to generate monthly P&L PDF', details: message },
      { status: 500 }
    )
  }
}

async function generateMonthlyPDF(
  year: number,
  month: number,
  startDate: string,
  endDate: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dailyFinancials: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ivaData: any[],
  fiscalData: CompanyFiscalData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = createPDFDocument()
      const chunks: Buffer[] = []

      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
      ]

      // Add company fiscal header
      addCompanyFiscalHeader(doc, fiscalData, {
        title: 'Monthly P&L Report',
        subtitle: `${monthNames[month - 1]} ${year}`,
        period: { start: startDate, end: endDate },
        generatedAt: new Date(),
      })

      // Calculate totals
      const totals = dailyFinancials.reduce(
        (acc, day) => ({
          revenue: acc.revenue + (day.revenue || 0),
          cost_of_goods_sold: acc.cost_of_goods_sold + (day.cost_of_goods_sold || 0),
          labor_cost: acc.labor_cost + (day.labor_cost || 0),
          overhead_cost: acc.overhead_cost + (day.overhead_cost || 0),
          profit: acc.profit + (day.profit || 0),
        }),
        { revenue: 0, cost_of_goods_sold: 0, labor_cost: 0, overhead_cost: 0, profit: 0 }
      )

      const totalCosts = totals.cost_of_goods_sold + totals.labor_cost + totals.overhead_cost
      const profitMargin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0

      // Summary section
      addPDFSection(doc, {
        title: 'Monthly Summary',
        data: [
          { label: 'Total Revenue', value: formatCurrency(totals.revenue) },
          { label: 'Total Costs', value: formatCurrency(totalCosts) },
          { label: 'COGS', value: formatCurrency(totals.cost_of_goods_sold) },
          { label: 'Labor', value: formatCurrency(totals.labor_cost) },
          { label: 'Overhead', value: formatCurrency(totals.overhead_cost) },
          { label: 'Net Profit', value: formatCurrency(totals.profit) },
          { label: 'Profit Margin', value: formatPercentage(profitMargin) },
          { label: 'Days with Data', value: String(dailyFinancials.length) },
        ],
      })

      // Cost ratios
      const foodCostRatio = totals.revenue > 0
        ? (totals.cost_of_goods_sold / totals.revenue) * 100
        : 0
      const laborCostRatio = totals.revenue > 0
        ? (totals.labor_cost / totals.revenue) * 100
        : 0
      const overheadRatio = totals.revenue > 0
        ? (totals.overhead_cost / totals.revenue) * 100
        : 0

      addPDFSection(doc, {
        title: 'Cost Ratios',
        data: [
          { label: 'Food Cost Ratio', value: formatPercentage(foodCostRatio) },
          { label: 'Labor Cost Ratio', value: formatPercentage(laborCostRatio) },
          { label: 'Overhead Ratio', value: formatPercentage(overheadRatio) },
        ],
      })

      // IVA totals for the month
      if (ivaData.length > 0) {
        const ivaTotals = ivaData.reduce(
          (acc, row) => ({
            base: acc.base + (row.base_imponible || 0),
            iva: acc.iva + (row.iva_amount || 0),
            total: acc.total + (row.total || 0),
          }),
          { base: 0, iva: 0, total: 0 }
        )

        addPDFSection(doc, {
          title: 'IVA Summary (Month)',
          data: [
            { label: 'Total Base Imponible', value: formatCurrency(ivaTotals.base) },
            { label: 'Total IVA', value: formatCurrency(ivaTotals.iva) },
            { label: 'Total with IVA', value: formatCurrency(ivaTotals.total) },
          ],
        })
      }

      // Daily breakdown table
      if (dailyFinancials.length > 0) {
        const columns: PDFTableColumn[] = [
          { header: 'Date', dataKey: 'date', width: 80 },
          {
            header: 'Revenue',
            dataKey: 'revenue',
            width: 70,
            align: 'right',
            format: (v) => formatCurrency(v || 0),
          },
          {
            header: 'COGS',
            dataKey: 'cost_of_goods_sold',
            width: 60,
            align: 'right',
            format: (v) => formatCurrency(v || 0),
          },
          {
            header: 'Labor',
            dataKey: 'labor_cost',
            width: 60,
            align: 'right',
            format: (v) => formatCurrency(v || 0),
          },
          {
            header: 'Overhead',
            dataKey: 'overhead_cost',
            width: 60,
            align: 'right',
            format: (v) => formatCurrency(v || 0),
          },
          {
            header: 'Profit',
            dataKey: 'profit',
            width: 70,
            align: 'right',
            format: (v) => formatCurrency(v || 0),
          },
        ]

        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('Daily Breakdown')
          .moveDown(0.5)

        addPDFTable(doc, columns, dailyFinancials as unknown as Record<string, unknown>[])
      }

      // Footer
      addPDFFooter(doc)

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
