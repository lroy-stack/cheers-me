import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/finance/dashboard
 * Get key financial KPIs for dashboard display
 * Includes: today's metrics, week-to-date, month-to-date, ratio alerts, trend arrows
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

  // Optional date parameter (defaults to today)
  const targetDate = searchParams.get('date') || new Date().toISOString().split('T')[0]

  // Calculate date ranges
  const today = new Date(targetDate)
  const weekStart = new Date(today)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Start of week (Sunday)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const todayStr = today.toISOString().split('T')[0]
  const weekStartStr = weekStart.toISOString().split('T')[0]
  const monthStartStr = monthStart.toISOString().split('T')[0]
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  // Execute all independent queries in parallel
  const [
    { data: todayFinancials },
    { data: yesterdayFinancials },
    { data: weekFinancials },
    { data: monthFinancials },
    { data: targets },
  ] = await Promise.all([
    supabase.from('daily_financials').select('*').eq('date', todayStr).single(),
    supabase.from('daily_financials').select('*').eq('date', yesterdayStr).single(),
    supabase.from('daily_financials').select('*').gte('date', weekStartStr).lte('date', todayStr).order('date', { ascending: true }),
    supabase.from('daily_financials').select('*').gte('date', monthStartStr).lte('date', todayStr).order('date', { ascending: true }),
    supabase.from('financial_targets').select('*').lte('period_start', todayStr).gte('period_end', todayStr).single(),
  ])

  // Calculate week totals
  const weekTotals = weekFinancials?.reduce(
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

  // Calculate week average ratios
  const weekAvgRatios = weekFinancials?.reduce(
    (acc, day) => ({
      food_cost_ratio: acc.food_cost_ratio + (day.food_cost_ratio || 0),
      beverage_cost_ratio: acc.beverage_cost_ratio + (day.beverage_cost_ratio || 0),
      labor_cost_ratio: acc.labor_cost_ratio + (day.labor_cost_ratio || 0),
      count: acc.count + 1,
    }),
    {
      food_cost_ratio: 0,
      beverage_cost_ratio: 0,
      labor_cost_ratio: 0,
      count: 0,
    }
  )

  const weekAvg = weekAvgRatios
    ? {
        food_cost_ratio: Number((weekAvgRatios.food_cost_ratio / weekAvgRatios.count).toFixed(2)),
        beverage_cost_ratio: Number(
          (weekAvgRatios.beverage_cost_ratio / weekAvgRatios.count).toFixed(2)
        ),
        labor_cost_ratio: Number((weekAvgRatios.labor_cost_ratio / weekAvgRatios.count).toFixed(2)),
      }
    : null

  // Calculate month totals
  const monthTotals = monthFinancials?.reduce(
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

  // Calculate month profit margin
  const monthProfitMargin =
    monthTotals && monthTotals.revenue > 0
      ? Number(((monthTotals.profit / monthTotals.revenue) * 100).toFixed(2))
      : 0

  // Check for ratio alerts (when actual > target)
  const alerts = []
  if (todayFinancials && targets) {
    if (todayFinancials.food_cost_ratio > targets.target_food_cost_ratio) {
      alerts.push({
        type: 'food_cost',
        message: `Food cost ratio (${todayFinancials.food_cost_ratio.toFixed(1)}%) exceeds target (${targets.target_food_cost_ratio.toFixed(1)}%)`,
        severity: 'warning',
        actual: todayFinancials.food_cost_ratio,
        target: targets.target_food_cost_ratio,
      })
    }
    if (todayFinancials.beverage_cost_ratio > targets.target_beverage_cost_ratio) {
      alerts.push({
        type: 'beverage_cost',
        message: `Beverage cost ratio (${todayFinancials.beverage_cost_ratio.toFixed(1)}%) exceeds target (${targets.target_beverage_cost_ratio.toFixed(1)}%)`,
        severity: 'warning',
        actual: todayFinancials.beverage_cost_ratio,
        target: targets.target_beverage_cost_ratio,
      })
    }
    if (todayFinancials.labor_cost_ratio > targets.target_labor_cost_ratio) {
      alerts.push({
        type: 'labor_cost',
        message: `Labor cost ratio (${todayFinancials.labor_cost_ratio.toFixed(1)}%) exceeds target (${targets.target_labor_cost_ratio.toFixed(1)}%)`,
        severity: 'warning',
        actual: todayFinancials.labor_cost_ratio,
        target: targets.target_labor_cost_ratio,
      })
    }
  }

  // Calculate trend arrows (comparing today vs yesterday)
  const trends = {
    revenue:
      todayFinancials && yesterdayFinancials
        ? todayFinancials.revenue > yesterdayFinancials.revenue
          ? 'up'
          : todayFinancials.revenue < yesterdayFinancials.revenue
          ? 'down'
          : 'stable'
        : 'stable',
    profit:
      todayFinancials && yesterdayFinancials
        ? todayFinancials.profit > yesterdayFinancials.profit
          ? 'up'
          : todayFinancials.profit < yesterdayFinancials.profit
          ? 'down'
          : 'stable'
        : 'stable',
  }

  // Prepare 7-day daily data for trend chart
  const weekDaily = (weekFinancials || []).map((day) => ({
    date: day.date,
    revenue: day.revenue || 0,
    cost_of_goods_sold: day.cost_of_goods_sold || 0,
    labor_cost: day.labor_cost || 0,
    overhead_cost: day.overhead_cost || 0,
    profit: day.profit || 0,
  }))

  // Return dashboard data
  return NextResponse.json({
    date: todayStr,
    today: todayFinancials || null,
    yesterday: yesterdayFinancials || null,
    week_to_date: {
      totals: weekTotals || null,
      avg_ratios: weekAvg,
      days_count: weekFinancials?.length || 0,
    },
    week_daily: weekDaily,
    month_to_date: {
      totals: monthTotals || null,
      profit_margin: monthProfitMargin,
      days_count: monthFinancials?.length || 0,
    },
    targets: targets || null,
    alerts,
    trends,
  })
}
