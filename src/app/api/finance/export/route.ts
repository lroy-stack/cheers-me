import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import {
  createPDFDocument,
  addPDFHeader,
  addPDFSection,
  addPDFTable,
  addPDFFooter,
  formatCurrency,
  formatPercentage,
  type PDFTableColumn,
} from '@/lib/utils/pdf'
import { generateCSV, formatCSVCurrency, type CSVColumn } from '@/lib/utils/csv'

/**
 * GET /api/finance/export
 * Export financial reports in CSV or PDF format
 * Query params:
 *   - report_type: daily | weekly | monthly | custom
 *   - format: csv | pdf
 *   - start_date, end_date (required for custom, optional for others)
 *   - date (optional for daily, defaults to today)
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

  const reportType = searchParams.get('report_type') || 'daily'
  const format = searchParams.get('format') || 'csv'
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const date = searchParams.get('date')

  // Validate format
  if (!['csv', 'pdf'].includes(format)) {
    return NextResponse.json(
      { error: 'Invalid format. Must be csv or pdf' },
      { status: 400 }
    )
  }

  try {
    let reportData: any
    let filename: string

    switch (reportType) {
      case 'daily':
        reportData = await generateDailyReport(supabase, date)
        filename = `daily-report-${reportData.date}.${format}`
        break

      case 'weekly':
        reportData = await generateWeeklyReport(supabase, startDate, endDate)
        filename = `weekly-report-${reportData.period.start}_${reportData.period.end}.${format}`
        break

      case 'monthly':
        reportData = await generateMonthlyReport(supabase, startDate, endDate)
        filename = `monthly-report-${reportData.period.start}_${reportData.period.end}.${format}`
        break

      case 'custom':
        if (!startDate || !endDate) {
          return NextResponse.json(
            { error: 'start_date and end_date are required for custom reports' },
            { status: 400 }
          )
        }
        reportData = await generateCustomReport(supabase, startDate, endDate)
        filename = `custom-report-${startDate}_${endDate}.${format}`
        break

      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        )
    }

    if (format === 'csv') {
      const csvContent = generateCSVReport(reportData, reportType)
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } else {
      // PDF format
      const pdfBuffer = await generatePDFReport(reportData, reportType)
      return new NextResponse(pdfBuffer as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }
  } catch (error: any) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to generate export', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Generate daily report data
 */
async function generateDailyReport(supabase: any, date?: string | null) {
  const targetDate = date || new Date().toISOString().split('T')[0]

  const { data: dailyFinancials, error } = await supabase
    .from('daily_financials')
    .select('*')
    .eq('date', targetDate)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message)
  }

  // Get sales breakdown
  const { data: salesBreakdown } = await supabase
    .from('daily_sales')
    .select('*')
    .eq('date', targetDate)
    .single()

  // Get overhead expenses
  const { data: overhead } = await supabase
    .from('overhead_expenses')
    .select('*')
    .eq('date', targetDate)
    .order('amount', { ascending: false })

  return {
    type: 'daily',
    date: targetDate,
    financials: dailyFinancials || {},
    sales_breakdown: salesBreakdown || {},
    overhead_expenses: overhead || [],
  }
}

/**
 * Generate weekly report data
 */
async function generateWeeklyReport(
  supabase: any,
  startDate?: string | null,
  endDate?: string | null
) {
  // If no dates provided, use current week
  const end = endDate || new Date().toISOString().split('T')[0]
  const start =
    startDate ||
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: weeklyData, error } = await supabase
    .from('daily_financials')
    .select('*')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  // Calculate totals
  const totals = weeklyData?.reduce(
    (acc: any, day: any) => ({
      revenue: acc.revenue + (day.revenue || 0),
      cost_of_goods_sold: acc.cost_of_goods_sold + (day.cost_of_goods_sold || 0),
      labor_cost: acc.labor_cost + (day.labor_cost || 0),
      overhead_cost: acc.overhead_cost + (day.overhead_cost || 0),
      profit: acc.profit + (day.profit || 0),
    }),
    {
      revenue: 0,
      cost_of_goods_sold: 0,
      labor_cost: 0,
      overhead_cost: 0,
      profit: 0,
    }
  )

  // Calculate average ratios
  const avgRatios = weeklyData?.reduce(
    (acc: any, day: any, index: number, array: any[]) => {
      if (index === array.length - 1) {
        return {
          food_cost_ratio: acc.food_cost_ratio / array.length,
          beverage_cost_ratio: acc.beverage_cost_ratio / array.length,
          labor_cost_ratio: acc.labor_cost_ratio / array.length,
        }
      }
      return {
        food_cost_ratio: acc.food_cost_ratio + (day.food_cost_ratio || 0),
        beverage_cost_ratio:
          acc.beverage_cost_ratio + (day.beverage_cost_ratio || 0),
        labor_cost_ratio: acc.labor_cost_ratio + (day.labor_cost_ratio || 0),
      }
    },
    {
      food_cost_ratio: 0,
      beverage_cost_ratio: 0,
      labor_cost_ratio: 0,
    }
  )

  return {
    type: 'weekly',
    period: { start, end },
    daily_data: weeklyData || [],
    totals: totals || {},
    average_ratios: avgRatios || {},
    days_count: weeklyData?.length || 0,
  }
}

/**
 * Generate monthly report data
 */
async function generateMonthlyReport(
  supabase: any,
  startDate?: string | null,
  endDate?: string | null
) {
  // If no dates provided, use current month
  const now = new Date()
  const end =
    endDate ||
    new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0]
  const start =
    startDate ||
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  const { data: monthlyData, error } = await supabase
    .from('daily_financials')
    .select('*')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  // Calculate totals
  const totals = monthlyData?.reduce(
    (acc: any, day: any) => ({
      revenue: acc.revenue + (day.revenue || 0),
      cost_of_goods_sold: acc.cost_of_goods_sold + (day.cost_of_goods_sold || 0),
      labor_cost: acc.labor_cost + (day.labor_cost || 0),
      overhead_cost: acc.overhead_cost + (day.overhead_cost || 0),
      profit: acc.profit + (day.profit || 0),
    }),
    {
      revenue: 0,
      cost_of_goods_sold: 0,
      labor_cost: 0,
      overhead_cost: 0,
      profit: 0,
    }
  )

  // Calculate profit margin
  const profitMargin =
    totals && totals.revenue > 0
      ? (totals.profit / totals.revenue) * 100
      : 0

  return {
    type: 'monthly',
    period: { start, end },
    daily_data: monthlyData || [],
    totals: totals || {},
    profit_margin: profitMargin,
    days_count: monthlyData?.length || 0,
  }
}

/**
 * Generate custom report data
 */
async function generateCustomReport(
  supabase: any,
  startDate: string,
  endDate: string
) {
  return generateMonthlyReport(supabase, startDate, endDate)
}

/**
 * Generate CSV from report data
 */
function generateCSVReport(reportData: any, reportType: string): string {
  const columns: CSVColumn[] = [
    { header: 'Date', dataKey: 'date' },
    {
      header: 'Revenue',
      dataKey: 'revenue',
      format: (v) => formatCSVCurrency(v || 0),
    },
    {
      header: 'Cost of Goods Sold',
      dataKey: 'cost_of_goods_sold',
      format: (v) => formatCSVCurrency(v || 0),
    },
    {
      header: 'Labor Cost',
      dataKey: 'labor_cost',
      format: (v) => formatCSVCurrency(v || 0),
    },
    {
      header: 'Overhead Cost',
      dataKey: 'overhead_cost',
      format: (v) => formatCSVCurrency(v || 0),
    },
    {
      header: 'Net Profit',
      dataKey: 'profit',
      format: (v) => formatCSVCurrency(v || 0),
    },
    {
      header: 'Food Cost %',
      dataKey: 'food_cost_ratio',
      format: (v) => (v || 0).toFixed(2),
    },
    {
      header: 'Beverage Cost %',
      dataKey: 'beverage_cost_ratio',
      format: (v) => (v || 0).toFixed(2),
    },
    {
      header: 'Labor Cost %',
      dataKey: 'labor_cost_ratio',
      format: (v) => (v || 0).toFixed(2),
    },
  ]

  let data: any[] = []

  if (reportType === 'daily') {
    data = [reportData.financials]
  } else {
    data = reportData.daily_data || []
  }

  // Add totals row for multi-day reports
  if (reportType !== 'daily' && reportData.totals) {
    data.push({})
    data.push({
      date: 'TOTALS',
      ...reportData.totals,
    })
  }

  return generateCSV(columns, data)
}

/**
 * Generate PDF from report data
 */
async function generatePDFReport(
  reportData: any,
  reportType: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = createPDFDocument()
      const chunks: Buffer[] = []

      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // Add header
      let title = ''
      let subtitle = ''
      let period = undefined

      if (reportType === 'daily') {
        title = 'Daily Financial Report'
        subtitle = `Date: ${reportData.date}`
      } else if (reportType === 'weekly') {
        title = 'Weekly Financial Report'
        subtitle = 'Aggregated Weekly Performance'
        period = reportData.period
      } else if (reportType === 'monthly') {
        title = 'Monthly Financial Report'
        subtitle = 'Aggregated Monthly Performance'
        period = reportData.period
      } else {
        title = 'Custom Financial Report'
        period = reportData.period
      }

      addPDFHeader(doc, { title, subtitle, period, generatedAt: new Date() })

      // Add summary section
      if (reportData.totals) {
        addPDFSection(doc, {
          title: 'Summary',
          data: [
            {
              label: 'Total Revenue',
              value: formatCurrency(reportData.totals.revenue || 0),
            },
            {
              label: 'Total Costs',
              value: formatCurrency(
                (reportData.totals.cost_of_goods_sold || 0) +
                  (reportData.totals.labor_cost || 0) +
                  (reportData.totals.overhead_cost || 0)
              ),
            },
            {
              label: 'Net Profit',
              value: formatCurrency(reportData.totals.profit || 0),
            },
            {
              label: 'Profit Margin',
              value: formatPercentage(reportData.profit_margin || 0),
            },
            {
              label: 'Days Included',
              value: String(reportData.days_count || 1),
            },
          ],
        })
      }

      // Add table with daily breakdown
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

      let tableData: any[] = []

      if (reportType === 'daily') {
        tableData = [reportData.financials]
      } else {
        tableData = reportData.daily_data || []
      }

      if (tableData.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Daily Breakdown').moveDown(0.5)
        addPDFTable(doc, columns, tableData)
      }

      // Add footer
      addPDFFooter(doc)

      // Finalize PDF
      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
