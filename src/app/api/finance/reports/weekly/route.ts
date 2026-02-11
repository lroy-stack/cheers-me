import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/finance/reports/weekly
 * Get weekly aggregated financial summary
 * Query params: limit (number of weeks to return, default: 12)
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

  const limit = parseInt(searchParams.get('limit') || '12', 10)

  // Get weekly financials from the view
  const { data: weeklyReports, error } = await supabase
    .from('weekly_financials')
    .select('*')
    .order('week_start', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Calculate summary statistics
  const summary = weeklyReports?.reduce(
    (acc, week) => {
      acc.total_revenue += week.total_revenue || 0
      acc.total_profit += week.total_profit || 0
      acc.avg_food_cost_ratio += week.avg_food_cost_ratio || 0
      acc.avg_beverage_cost_ratio += week.avg_beverage_cost_ratio || 0
      acc.avg_labor_cost_ratio += week.avg_labor_cost_ratio || 0
      acc.weeks_count += 1
      return acc
    },
    {
      total_revenue: 0,
      total_profit: 0,
      avg_food_cost_ratio: 0,
      avg_beverage_cost_ratio: 0,
      avg_labor_cost_ratio: 0,
      weeks_count: 0,
    }
  )

  const averages = summary
    ? {
        avg_weekly_revenue: Number((summary.total_revenue / summary.weeks_count).toFixed(2)),
        avg_weekly_profit: Number((summary.total_profit / summary.weeks_count).toFixed(2)),
        avg_food_cost_ratio: Number((summary.avg_food_cost_ratio / summary.weeks_count).toFixed(2)),
        avg_beverage_cost_ratio: Number(
          (summary.avg_beverage_cost_ratio / summary.weeks_count).toFixed(2)
        ),
        avg_labor_cost_ratio: Number((summary.avg_labor_cost_ratio / summary.weeks_count).toFixed(2)),
      }
    : null

  return NextResponse.json({
    weekly_reports: weeklyReports || [],
    summary: {
      weeks_count: summary?.weeks_count || 0,
      total_revenue: summary?.total_revenue || 0,
      total_profit: summary?.total_profit || 0,
    },
    averages,
  })
}
