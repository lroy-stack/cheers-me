import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating single alert
const updateAlertSchema = z.object({
  resolved: z.boolean(),
})

/**
 * GET /api/stock/alerts/[id]
 * Get a single alert by ID
 * Access: kitchen, bar, managers
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'kitchen', 'bar'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params
  const supabase = await createClient()

  const { data: alert, error } = await supabase
    .from('stock_alerts')
    .select(`
      *,
      product:products(
        id,
        name,
        category,
        unit,
        current_stock,
        min_stock,
        max_stock
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(alert)
}

/**
 * PUT /api/stock/alerts/[id]
 * Resolve/unresolve a single alert
 * Access: managers
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = updateAlertSchema.safeParse(body)
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

  // Prepare update data
  const updateData: Record<string, unknown> = {
    resolved: validation.data.resolved,
  }

  if (validation.data.resolved) {
    updateData.resolved_at = new Date().toISOString()
  } else {
    updateData.resolved_at = null
  }

  // Update alert
  const { data: updatedAlert, error: updateError } = await supabase
    .from('stock_alerts')
    .update(updateData)
    .eq('id', id)
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
    .single()

  if (updateError) {
    if (updateError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(updatedAlert)
}
