import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/finance/reports/daily
 * Get daily P&L report with detailed breakdown
 * Query params: date (optional, defaults to today), start_date, end_date (for range)
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

  const date = searchParams.get('date')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')

  // If date range provided, get multiple days
  if (startDate && endDate) {
    const { data: dailyReports, error } = await supabase
      .from('daily_financials')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate totals for the range
    const totals = dailyReports?.reduce(
      (acc, day) => ({
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

    return NextResponse.json({
      period: {
        start: startDate,
        end: endDate,
      },
      daily_reports: dailyReports || [],
      totals: totals || null,
      days_count: dailyReports?.length || 0,
    })
  }

  // Single day report
  const targetDate = date || new Date().toISOString().split('T')[0]

  const { data: dailyFinancials, error } = await supabase
    .from('daily_financials')
    .select('*')
    .eq('date', targetDate)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!dailyFinancials) {
    return NextResponse.json(
      {
        date: targetDate,
        message: 'No financial data available for this date',
        daily_financials: null,
      },
      { status: 200 }
    )
  }

  // Get detailed sales breakdown for the day
  const { data: dailySales } = await supabase
    .from('daily_sales')
    .select('*')
    .eq('date', targetDate)
    .single()

  // Get overhead expenses for the day
  const { data: overhead } = await supabase
    .from('overhead_expenses')
    .select('*')
    .eq('date', targetDate)
    .order('amount', { ascending: false })

  // Get cash flow for the day
  const { data: cashFlow } = await supabase
    .from('cash_flow_transactions')
    .select('*')
    .eq('date', targetDate)
    .order('created_at', { ascending: false })

  // Calculate profit margin
  const profitMargin =
    dailyFinancials.revenue > 0
      ? Number(((dailyFinancials.profit / dailyFinancials.revenue) * 100).toFixed(2))
      : 0

  return NextResponse.json({
    date: targetDate,
    daily_financials: dailyFinancials,
    profit_margin: profitMargin,
    sales_breakdown: dailySales || null,
    overhead_expenses: overhead || [],
    cash_flow: cashFlow || [],
    summary: {
      total_revenue: dailyFinancials.revenue,
      total_costs:
        dailyFinancials.cost_of_goods_sold +
        dailyFinancials.labor_cost +
        dailyFinancials.overhead_cost,
      net_profit: dailyFinancials.profit,
      profit_margin: profitMargin,
    },
  })
}
