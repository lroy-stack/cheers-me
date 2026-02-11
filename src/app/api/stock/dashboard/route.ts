import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/stock/dashboard
 * Get comprehensive stock dashboard data
 * Access: kitchen, bar, managers
 *
 * Returns:
 * - Total stock value
 * - Low stock alerts count
 * - Top consumed items (last 30 days)
 * - Waste percentage
 * - Reorder alerts
 * - Active beer kegs status
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

  // Pre-compute date ranges
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // Execute all independent queries in parallel
  const [
    { data: products },
    { data: lowStockProducts },
    { count: alertsCount },
    { data: movements },
    { data: wasteLogs },
    { data: activeKegs },
    { count: pendingOrdersCount },
    { data: recentMovements },
  ] = await Promise.all([
    // 1. Products for stock value
    supabase.from('products').select('current_stock, cost_per_unit'),
    // 2. Low stock products
    supabase.from('products').select('id, name, current_stock, min_stock').not('min_stock', 'is', null),
    // 3. Unresolved alerts count
    supabase.from('stock_alerts').select('*', { count: 'exact', head: true }).eq('resolved', false),
    // 4. Stock movements (last 30 days)
    supabase.from('stock_movements').select(`
      product_id, quantity, product:products(id, name, category, unit)
    `).in('movement_type', ['out', 'waste']).gte('created_at', thirtyDaysAgo.toISOString()),
    // 5. Waste logs (last 30 days)
    supabase.from('waste_logs').select(`
      quantity, reason, product:products(cost_per_unit, unit, category)
    `).gte('created_at', thirtyDaysAgo.toISOString()),
    // 6. Active kegs
    supabase.from('kegs').select(`
      id, current_liters, keg_size_liters, tapped_at, product:products(id, name)
    `).eq('status', 'active').order('current_liters', { ascending: true }),
    // 7. Pending purchase orders
    supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).eq('status', 'ordered'),
    // 8. Recent movements (last 7 days)
    supabase.from('stock_movements').select('movement_type, quantity').gte('created_at', sevenDaysAgo.toISOString()),
  ])

  // Process results
  const totalStockValue = products?.reduce(
    (sum, p) => sum + p.current_stock * (p.cost_per_unit || 0),
    0
  ) || 0

  const lowStockItems = lowStockProducts?.filter(
    p => p.current_stock < (p.min_stock || 0)
  ) || []

  const outOfStockItems = lowStockProducts?.filter(
    p => p.current_stock <= 0
  ) || []

  // Aggregate consumption by product
  const consumptionByProduct = new Map<string, {
    product_id: string
    product_name: string
    category: string
    unit: string
    total_consumed: number
  }>()

  movements?.forEach((movement) => {
    const product = Array.isArray(movement.product) ? movement.product[0] : movement.product
    if (!product) return
    const existing = consumptionByProduct.get(movement.product_id)
    if (existing) {
      existing.total_consumed += Math.abs(movement.quantity)
    } else {
      consumptionByProduct.set(movement.product_id, {
        product_id: movement.product_id,
        product_name: product.name,
        category: product.category,
        unit: product.unit,
        total_consumed: Math.abs(movement.quantity),
      })
    }
  })

  const topConsumedItems = Array.from(consumptionByProduct.values())
    .sort((a, b) => b.total_consumed - a.total_consumed)
    .slice(0, 10)

  const totalWasteValue = wasteLogs?.reduce(
    (sum, log) => {
      const product = Array.isArray(log.product) ? log.product[0] : log.product
      return sum + log.quantity * (product?.cost_per_unit || 0)
    },
    0
  ) || 0

  const totalWasteQuantity = wasteLogs?.length || 0

  const wasteByReason = wasteLogs?.reduce((acc: Record<string, number>, log) => {
    const product = Array.isArray(log.product) ? log.product[0] : log.product
    const value = log.quantity * (product?.cost_per_unit || 0)
    acc[log.reason] = (acc[log.reason] || 0) + value
    return acc
  }, {})

  const wastePercentage = totalStockValue > 0
    ? (totalWasteValue / totalStockValue) * 100
    : 0

  const kegsStatus = activeKegs?.map(keg => {
    const product = Array.isArray(keg.product) ? keg.product[0] : keg.product
    return {
    id: keg.id,
    beer_name: product?.name,
    current_liters: keg.current_liters,
    keg_size_liters: keg.keg_size_liters,
    percent_remaining: keg.keg_size_liters > 0
      ? Math.round((keg.current_liters / keg.keg_size_liters) * 100)
      : 0,
    status: keg.current_liters <= 0
      ? 'empty'
      : keg.current_liters / keg.keg_size_liters < 0.2
      ? 'critical'
      : keg.current_liters / keg.keg_size_liters < 0.4
      ? 'low'
      : 'ok',
    days_on_tap: keg.tapped_at
      ? Math.floor(
          (Date.now() - new Date(keg.tapped_at).getTime()) / (1000 * 60 * 60 * 24)
        )
      : 0,
  }})

  const movementsSummary = {
    in: 0,
    out: 0,
    waste: 0,
    adjustment: 0,
  }

  recentMovements?.forEach(m => {
    if (m.movement_type in movementsSummary) {
      movementsSummary[m.movement_type as keyof typeof movementsSummary] += Math.abs(m.quantity)
    }
  })

  // Return comprehensive dashboard data
  return NextResponse.json({
    summary: {
      total_stock_value: Math.round(totalStockValue * 100) / 100,
      low_stock_count: lowStockItems.length,
      out_of_stock_count: outOfStockItems.length,
      unresolved_alerts_count: alertsCount || 0,
      waste_percentage: Math.round(wastePercentage * 100) / 100,
      pending_orders_count: pendingOrdersCount || 0,
    },
    top_consumed_items: topConsumedItems,
    waste_statistics: {
      total_value: Math.round(totalWasteValue * 100) / 100,
      total_incidents: totalWasteQuantity,
      by_reason: wasteByReason,
      percentage_of_stock: Math.round(wastePercentage * 100) / 100,
    },
    active_kegs: {
      total_active: kegsStatus?.length || 0,
      critical_count: kegsStatus?.filter(k => k.status === 'critical').length || 0,
      low_count: kegsStatus?.filter(k => k.status === 'low').length || 0,
      kegs: kegsStatus,
    },
    low_stock_items: lowStockItems.map(item => ({
      id: item.id,
      name: item.name,
      current_stock: item.current_stock,
      min_stock: item.min_stock,
      shortage: (item.min_stock || 0) - item.current_stock,
    })),
    out_of_stock_items: outOfStockItems.map(item => ({
      id: item.id,
      name: item.name,
    })),
    recent_movements_summary: movementsSummary,
  })
}
