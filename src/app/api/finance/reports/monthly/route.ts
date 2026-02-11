import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/finance/reports/monthly
 * Get monthly aggregated financial summary
 * Query params: year (optional, defaults to current year)
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

  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString(), 10)

  // Get monthly financials from the view
  const { data: monthlyReports, error } = await supabase
    .from('monthly_financials')
    .select('*')
    .eq('year', year)
    .order('month', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Calculate year totals
  const yearTotals = monthlyReports?.reduce(
    (acc, month) => ({
      revenue: acc.revenue + (month.total_revenue || 0),
      cogs: acc.cogs + (month.total_cogs || 0),
      labor: acc.labor + (month.total_labor || 0),
      overhead: acc.overhead + (month.total_overhead || 0),
      profit: acc.profit + (month.total_profit || 0),
    }),
    {
      revenue: 0,
      cogs: 0,
      labor: 0,
      overhead: 0,
      profit: 0,
    }
  )

  // Calculate year profit margin
  const yearProfitMargin =
    yearTotals && yearTotals.revenue > 0
      ? Number(((yearTotals.profit / yearTotals.revenue) * 100).toFixed(2))
      : 0

  // Calculate year average ratios
  const yearAvgRatios = monthlyReports?.reduce(
    (acc, month) => {
      acc.food_cost_ratio += month.avg_food_cost_ratio || 0
      acc.beverage_cost_ratio += month.avg_beverage_cost_ratio || 0
      acc.labor_cost_ratio += month.avg_labor_cost_ratio || 0
      acc.count += 1
      return acc
    },
    {
      food_cost_ratio: 0,
      beverage_cost_ratio: 0,
      labor_cost_ratio: 0,
      count: 0,
    }
  )

  const yearAverages = yearAvgRatios
    ? {
        avg_food_cost_ratio: Number((yearAvgRatios.food_cost_ratio / yearAvgRatios.count).toFixed(2)),
        avg_beverage_cost_ratio: Number(
          (yearAvgRatios.beverage_cost_ratio / yearAvgRatios.count).toFixed(2)
        ),
        avg_labor_cost_ratio: Number((yearAvgRatios.labor_cost_ratio / yearAvgRatios.count).toFixed(2)),
      }
    : null

  // Get month-over-month growth rates
  const monthlyWithGrowth = monthlyReports?.map((month, index) => {
    if (index === 0 || !monthlyReports[index - 1]) {
      return { ...month, revenue_growth_pct: null, profit_growth_pct: null }
    }

    const prevMonth = monthlyReports[index - 1]
    const revenueGrowth =
      prevMonth.total_revenue > 0
        ? Number((((month.total_revenue - prevMonth.total_revenue) / prevMonth.total_revenue) * 100).toFixed(2))
        : null
    const profitGrowth =
      prevMonth.total_profit > 0
        ? Number((((month.total_profit - prevMonth.total_profit) / prevMonth.total_profit) * 100).toFixed(2))
        : null

    return {
      ...month,
      revenue_growth_pct: revenueGrowth,
      profit_growth_pct: profitGrowth,
    }
  })

  return NextResponse.json({
    year,
    monthly_reports: monthlyWithGrowth || [],
    year_totals: yearTotals || null,
    year_profit_margin: yearProfitMargin,
    year_averages: yearAverages,
    months_with_data: monthlyReports?.length || 0,
  })
}
