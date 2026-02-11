import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/stock/alerts/summary
 * Get comprehensive summary of stock alerts for dashboard display
 *
 * Returns:
 * - Alert statistics by category
 * - Critical alerts requiring immediate attention
 * - Alert trends
 * - Recipients who would receive notifications
 *
 * Access: kitchen, bar, managers
 */
export async function GET(_request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'kitchen', 'bar'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()

  // 1. Get alert statistics by category
  const { data: alertStats } = await supabase
    .from('v_stock_alert_stats')
    .select('*')

  // 2. Get critical unresolved alerts
  const { data: criticalAlerts } = await supabase
    .from('v_critical_stock_alerts')
    .select('*')
    .limit(20) // Top 20 most critical

  // 3. Get overall counts
  const { count: totalAlerts } = await supabase
    .from('stock_alerts')
    .select('*', { count: 'exact', head: true })

  const { count: unresolvedAlerts } = await supabase
    .from('stock_alerts')
    .select('*', { count: 'exact', head: true })
    .eq('resolved', false)

  const { count: resolvedToday } = await supabase
    .from('stock_alerts')
    .select('*', { count: 'exact', head: true })
    .eq('resolved', true)
    .gte('resolved_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())

  const { count: createdToday } = await supabase
    .from('stock_alerts')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())

  // 4. Get alerts by type breakdown
  const { data: allUnresolvedAlerts } = await supabase
    .from('stock_alerts')
    .select('alert_type')
    .eq('resolved', false)

  const alertsByType = allUnresolvedAlerts?.reduce((acc: Record<string, number>, alert: {
    alert_type: string
  }) => {
    acc[alert.alert_type] = (acc[alert.alert_type] || 0) + 1
    return acc
  }, {}) || {}

  // 5. Get alert recipients (staff who receive notifications)
  const { data: recipients } = await supabase.rpc('get_stock_alert_recipients')

  // 6. Get recent alert activity (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: recentActivity } = await supabase
    .from('stock_alerts')
    .select('created_at, alert_type, resolved')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: true })

  // Group by day for trend chart
  const activityByDay = recentActivity?.reduce((acc: Record<string, {
    date: string
    created: number
    resolved: number
  }>, alert: {
    created_at: string
    resolved: boolean
  }) => {
    const date = new Date(alert.created_at).toISOString().split('T')[0]
    if (!acc[date]) {
      acc[date] = { date, created: 0, resolved: 0 }
    }
    acc[date].created += 1
    if (alert.resolved) {
      acc[date].resolved += 1
    }
    return acc
  }, {})

  const alertTrend = Object.values(activityByDay || {}).sort((a, b) =>
    a.date.localeCompare(b.date)
  )

  // 7. Calculate average resolution time for resolved alerts
  const { data: resolvedAlertsData } = await supabase
    .from('stock_alerts')
    .select('created_at, resolved_at')
    .eq('resolved', true)
    .not('resolved_at', 'is', null)
    .gte('created_at', sevenDaysAgo.toISOString())

  let avgResolutionHours = 0
  if (resolvedAlertsData && resolvedAlertsData.length > 0) {
    const totalHours = resolvedAlertsData.reduce((sum, alert) => {
      const created = new Date(alert.created_at).getTime()
      const resolved = new Date(alert.resolved_at!).getTime()
      return sum + (resolved - created) / (1000 * 60 * 60)
    }, 0)
    avgResolutionHours = Math.round((totalHours / resolvedAlertsData.length) * 10) / 10
  }

  // 8. Get products with most frequent alerts
  const { data: frequentAlertProducts } = await supabase
    .from('stock_alerts')
    .select(`
      product_id,
      product:products(id, name, category)
    `)
    .gte('created_at', sevenDaysAgo.toISOString())

  const productAlertCounts = (frequentAlertProducts as any[])?.reduce((acc: Record<string, {
    product_id: string
    product_name: string
    category: string
    alert_count: number
  }>, alert: {
    product_id: string
    product: { id: string; name: string; category: string }
  }) => {
    const key = alert.product_id
    if (!acc[key]) {
      acc[key] = {
        product_id: alert.product_id,
        product_name: alert.product.name,
        category: alert.product.category,
        alert_count: 0,
      }
    }
    acc[key].alert_count += 1
    return acc
  }, {})

  const topAlertProducts = Object.values(
    (productAlertCounts || {}) as Record<string, { product_id: string; product_name: string; category: string; alert_count: number }>
  )
    .sort((a, b) => b.alert_count - a.alert_count)
    .slice(0, 10)

  // Return comprehensive summary
  return NextResponse.json({
    summary: {
      total_alerts: totalAlerts || 0,
      unresolved_alerts: unresolvedAlerts || 0,
      resolved_today: resolvedToday || 0,
      created_today: createdToday || 0,
      avg_resolution_hours: avgResolutionHours,
    },
    alerts_by_type: alertsByType,
    critical_alerts: criticalAlerts || [],
    alert_statistics_by_category: alertStats || [],
    alert_trend_7_days: alertTrend,
    top_alert_products: topAlertProducts,
    notification_recipients: {
      total: recipients?.length || 0,
      recipients: recipients || [],
    },
  })
}
