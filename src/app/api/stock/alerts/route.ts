import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * GET /api/stock/alerts
 * List all stock alerts with optional filters
 * Access: kitchen, bar, managers
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'kitchen', 'bar'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  // Optional filters
  const unresolvedOnly = searchParams.get('unresolved') === 'true'
  const alertType = searchParams.get('alert_type')
  const productId = searchParams.get('product_id')

  let query = supabase
    .from('stock_alerts')
    .select(`
      *,
      product:products(
        id,
        name,
        category,
        unit,
        current_stock,
        min_stock
      )
    `)
    .order('created_at', { ascending: false })

  if (unresolvedOnly) {
    query = query.eq('resolved', false)
  }

  if (alertType) {
    query = query.eq('alert_type', alertType)
  }

  if (productId) {
    query = query.eq('product_id', productId)
  }

  const { data: alerts, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(alerts)
}

/**
 * PUT /api/stock/alerts
 * Resolve multiple alerts (bulk operation)
 * Access: managers
 */
export async function PUT(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body - expecting { alert_ids: string[], resolved: boolean }
  const schema = z.object({
    alert_ids: z.array(z.string().uuid()).min(1),
    resolved: z.boolean(),
  })

  const validation = schema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: validation.error.errors,
      },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Update alerts
  const updateData: Record<string, unknown> = {
    resolved: validation.data.resolved,
  }

  if (validation.data.resolved) {
    updateData.resolved_at = new Date().toISOString()
  }

  const { data: updatedAlerts, error: updateError } = await supabase
    .from('stock_alerts')
    .update(updateData)
    .in('id', validation.data.alert_ids)
    .select()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    updated_count: updatedAlerts?.length || 0,
    alerts: updatedAlerts,
  })
}
