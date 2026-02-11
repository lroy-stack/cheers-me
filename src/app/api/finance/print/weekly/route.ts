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
 * GET /api/finance/print/weekly
 * Generate weekly P&L PDF for gestor
 * Query params: start_date (YYYY-MM-DD, should be a Monday)
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

  const startDate = searchParams.get('start_date')

  if (!startDate) {
    return NextResponse.json(
      { error: 'start_date is required (YYYY-MM-DD, Monday of the week)' },
      { status: 400 }
    )
  }

  // Calculate end date (7 days from start)
  const start = new Date(startDate)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const endDate = end.toISOString().split('T')[0]

  try {
    // Fetch daily financials for the 7-day period
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
    const pdfBuffer = await generateWeeklyPDF(
      startDate,
      endDate,
      dailyFinancials || [],
      fiscalData
    )

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="weekly-pl-${startDate}.pdf"`,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Weekly P&L PDF generation error:', message)
    return NextResponse.json(
      { error: 'Failed to generate weekly P&L PDF', details: message },
      { status: 500 }
    )
  }
}

async function generateWeeklyPDF(
  startDate: string,
  endDate: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dailyFinancials: any[],
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
        title: 'Weekly P&L Report',
        subtitle: 'Informe Semanal de P&G',
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
        title: 'Weekly Summary',
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

      // Ratios section
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

      // Trend section: compare to previous week if we have the data
      if (dailyFinancials.length > 1) {
        const firstDay = dailyFinancials[0]
        const lastDay = dailyFinancials[dailyFinancials.length - 1]

        addPDFSection(doc, {
          title: 'Week Trend',
          data: [
            {
              label: `Revenue ${firstDay.date}`,
              value: formatCurrency(firstDay.revenue || 0),
            },
            {
              label: `Revenue ${lastDay.date}`,
              value: formatCurrency(lastDay.revenue || 0),
            },
          ],
        })
      }

      // Footer
      addPDFFooter(doc)

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
