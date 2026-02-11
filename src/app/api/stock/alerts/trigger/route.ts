import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/stock/alerts/trigger
 * Manually trigger stock alert checks for all products or specific product
 * This is useful for:
 * - Testing the alert system
 * - Manual stock checks
 * - Recovering from missed automatic alerts
 *
 * Access: managers only
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()

  // Parse optional product_id from request body
  let productId: string | null = null
  try {
    const body = await request.json()
    productId = body.product_id || null
  } catch {
    // No body or invalid JSON - will check all products
  }

  // If specific product ID provided, check only that product
  if (productId) {
    // Verify product exists
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, current_stock, min_stock')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Call the check function for this specific product
    const { error: checkError } = await supabase.rpc('check_low_stock_alert', {
      p_product_id: productId,
    })

    if (checkError) {
      return NextResponse.json(
        { error: checkError.message },
        { status: 500 }
      )
    }

    // Get any alerts created/resolved for this product
    const { data: alerts } = await supabase
      .from('stock_alerts')
      .select(`
        *,
        product:products(id, name, category, current_stock, min_stock)
      `)
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      success: true,
      message: `Alert check completed for product: ${product.name}`,
      product: {
        id: product.id,
        name: product.name,
        current_stock: product.current_stock,
        min_stock: product.min_stock,
      },
      recent_alerts: alerts,
    })
  }

  // Check all products
  const { data: results, error } = await supabase.rpc('trigger_all_stock_alerts')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get summary of newly created alerts
  const newAlertsCount = results?.length || 0
  const alertsByType = results?.reduce((acc: Record<string, number>, result: {
    alert_type: string
  }) => {
    acc[result.alert_type] = (acc[result.alert_type] || 0) + 1
    return acc
  }, {})

  // Get all unresolved alerts
  const { count: totalUnresolved } = await supabase
    .from('stock_alerts')
    .select('*', { count: 'exact', head: true })
    .eq('resolved', false)

  return NextResponse.json({
    success: true,
    message: 'Stock alert check completed for all products',
    summary: {
      products_checked: 'all',
      new_alerts_created: newAlertsCount,
      alerts_by_type: alertsByType || {},
      total_unresolved_alerts: totalUnresolved || 0,
    },
    new_alerts: results || [],
  })
}

/**
 * DELETE /api/stock/alerts/trigger
 * Resolve outdated alerts that are no longer valid
 * (e.g., stock was replenished but alert wasn't manually resolved)
 *
 * Access: managers only
 */
export async function DELETE(_request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()

  // Call the resolve outdated alerts function
  const { data: resolved, error } = await supabase.rpc('resolve_outdated_alerts')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const resolvedCount = resolved?.length || 0

  return NextResponse.json({
    success: true,
    message: `Resolved ${resolvedCount} outdated alert${resolvedCount !== 1 ? 's' : ''}`,
    resolved_alerts: resolved || [],
  })
}
