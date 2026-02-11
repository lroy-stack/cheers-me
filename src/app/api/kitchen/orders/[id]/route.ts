import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating kitchen order
const updateKitchenOrderSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'ready', 'served', 'cancelled']).optional(),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
})

/**
 * GET /api/kitchen/orders/[id]
 * Get a single kitchen order with items (kitchen staff, waiters, managers)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'kitchen', 'waiter'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params
  const supabase = await createClient()

  const { data: order, error } = await supabase
    .from('kitchen_orders')
    .select(`
      *,
      table:tables(
        id,
        table_number,
        section
      ),
      waiter:employees!kitchen_orders_waiter_id_fkey(
        id,
        profile:profiles(
          id,
          full_name
        )
      ),
      items:kitchen_order_items(
        id,
        menu_item_id,
        quantity,
        notes,
        status,
        created_at,
        completed_at,
        menu_item:menu_items(
          id,
          name_en,
          name_nl,
          name_es,
          prep_time_minutes,
          photo_url
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Kitchen order not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(order)
}

/**
 * PUT /api/kitchen/orders/[id]
 * Update a kitchen order status (kitchen staff, managers)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'kitchen'])

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
  const validation = updateKitchenOrderSchema.safeParse(body)
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

  // Auto-set timestamps based on status changes
  const updateData: Record<string, unknown> = { ...validation.data }

  if (validation.data.status === 'in_progress' && !validation.data.started_at) {
    updateData.started_at = new Date().toISOString()
  }

  if ((validation.data.status === 'ready' || validation.data.status === 'served')
      && !validation.data.completed_at) {
    updateData.completed_at = new Date().toISOString()
  }

  // Update kitchen order
  const { error: updateError } = await supabase
    .from('kitchen_orders')
    .update(updateData)
    .eq('id', id)

  if (updateError) {
    if (updateError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Kitchen order not found' }, { status: 404 })
    }
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // If order status changes, update all items to match (unless they're individually tracked)
  if (validation.data.status) {
    await supabase
      .from('kitchen_order_items')
      .update({
        status: validation.data.status,
        completed_at: updateData.completed_at as string | undefined
      })
      .eq('kitchen_order_id', id)
  }

  // Fetch updated order
  const { data: updatedOrder, error: fetchError } = await supabase
    .from('kitchen_orders')
    .select(`
      *,
      table:tables(
        id,
        table_number,
        section
      ),
      waiter:employees!kitchen_orders_waiter_id_fkey(
        id,
        profile:profiles(
          id,
          full_name
        )
      ),
      items:kitchen_order_items(
        id,
        menu_item_id,
        quantity,
        notes,
        status,
        created_at,
        completed_at,
        menu_item:menu_items(
          id,
          name_en,
          name_nl,
          name_es,
          prep_time_minutes,
          photo_url
        )
      )
    `)
    .eq('id', id)
    .single()

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  return NextResponse.json(updatedOrder)
}

/**
 * DELETE /api/kitchen/orders/[id]
 * Cancel a kitchen order (kitchen staff, managers)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'kitchen'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params
  const supabase = await createClient()

  // Soft delete: mark as cancelled instead of hard delete
  const { error } = await supabase
    .from('kitchen_orders')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
