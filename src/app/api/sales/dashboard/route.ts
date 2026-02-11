import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/sales/dashboard
 * Get comprehensive sales dashboard metrics
 * Includes: today's revenue, week trend, category split, ticket averages, variances
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
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const monthAgo = new Date(today)
  monthAgo.setDate(monthAgo.getDate() - 30)

  const todayStr = today.toISOString().split('T')[0]
  const weekAgoStr = weekAgo.toISOString().split('T')[0]
  const monthAgoStr = monthAgo.toISOString().split('T')[0]

  // Execute all independent queries in parallel
  const [
    { data: todaySales },
    { data: weekTrend },
    { data: monthTrend },
    { data: comparison },
    { data: registerClose },
  ] = await Promise.all([
    supabase.from('daily_sales').select('*').eq('date', todayStr).single(),
    supabase.from('daily_sales').select('*').gte('date', weekAgoStr).lte('date', todayStr).order('date', { ascending: true }),
    supabase.from('daily_sales').select('date, total_revenue, ticket_count').gte('date', monthAgoStr).lte('date', todayStr).order('date', { ascending: true }),
    supabase.rpc('get_sales_comparison', { target_date: todayStr }),
    supabase.from('cash_register_closes').select('*').eq('date', todayStr).single(),
  ])

  // Calculate week totals
  const weekTotals = weekTrend?.reduce(
    (acc, day) => ({
      total_revenue: acc.total_revenue + (day.total_revenue || 0),
      food_revenue: acc.food_revenue + (day.food_revenue || 0),
      drinks_revenue: acc.drinks_revenue + (day.drinks_revenue || 0),
      cocktails_revenue: acc.cocktails_revenue + (day.cocktails_revenue || 0),
      desserts_revenue: acc.desserts_revenue + (day.desserts_revenue || 0),
      other_revenue: acc.other_revenue + (day.other_revenue || 0),
      tips: acc.tips + (day.tips || 0),
      ticket_count: acc.ticket_count + (day.ticket_count || 0),
    }),
    {
      total_revenue: 0,
      food_revenue: 0,
      drinks_revenue: 0,
      cocktails_revenue: 0,
      desserts_revenue: 0,
      other_revenue: 0,
      tips: 0,
      ticket_count: 0,
    }
  )

  // Calculate week average ticket
  const weekAvgTicket =
    weekTotals && weekTotals.ticket_count > 0
      ? Number((weekTotals.total_revenue / weekTotals.ticket_count).toFixed(2))
      : 0

  // Calculate month totals
  const monthTotals = monthTrend?.reduce(
    (acc, day) => ({
      total_revenue: acc.total_revenue + (day.total_revenue || 0),
      ticket_count: acc.ticket_count + (day.ticket_count || 0),
    }),
    {
      total_revenue: 0,
      ticket_count: 0,
    }
  )

  // Category breakdown (from today or week)
  const categoryBreakdown = todaySales
    ? {
        food: todaySales.food_revenue || 0,
        drinks: todaySales.drinks_revenue || 0,
        cocktails: todaySales.cocktails_revenue || 0,
        desserts: todaySales.desserts_revenue || 0,
        other: todaySales.other_revenue || 0,
      }
    : weekTotals
    ? {
        food: weekTotals.food_revenue,
        drinks: weekTotals.drinks_revenue,
        cocktails: weekTotals.cocktails_revenue,
        desserts: weekTotals.desserts_revenue,
        other: weekTotals.other_revenue,
      }
    : null

  // Calculate percentages for category breakdown
  const categoryPercentages =
    categoryBreakdown && weekTotals && weekTotals.total_revenue > 0
      ? {
          food: Number(((categoryBreakdown.food / weekTotals.total_revenue) * 100).toFixed(1)),
          drinks: Number(((categoryBreakdown.drinks / weekTotals.total_revenue) * 100).toFixed(1)),
          cocktails: Number(((categoryBreakdown.cocktails / weekTotals.total_revenue) * 100).toFixed(1)),
          desserts: Number(((categoryBreakdown.desserts / weekTotals.total_revenue) * 100).toFixed(1)),
          other: Number(((categoryBreakdown.other / weekTotals.total_revenue) * 100).toFixed(1)),
        }
      : null

  // Return comprehensive dashboard data
  return NextResponse.json({
    date: todayStr,
    today: todaySales || null,
    week: {
      trend: weekTrend || [],
      totals: weekTotals || null,
      avg_ticket: weekAvgTicket,
      days_count: weekTrend?.length || 0,
    },
    month: {
      trend: monthTrend || [],
      totals: monthTotals || null,
      days_count: monthTrend?.length || 0,
    },
    comparison: comparison?.[0] || null,
    category_breakdown: {
      amounts: categoryBreakdown,
      percentages: categoryPercentages,
    },
    register_close: registerClose || null,
  })
}
