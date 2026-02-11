import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating purchase order
const updatePurchaseOrderSchema = z.object({
  status: z.enum(['pending', 'ordered', 'received', 'cancelled']).optional(),
  expected_delivery_date: z.string().date().optional(),
})

/**
 * GET /api/stock/purchase-orders/[id]
 * Get a single purchase order by ID
 * Access: managers only
 */
export async function GET(
  _request: NextRequest,
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
  const supabase = await createClient()

  const { data: purchaseOrder, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      supplier:suppliers(
        id,
        name,
        contact_person,
        email,
        phone,
        payment_terms
      ),
      items:purchase_order_items(
        *,
        product:products(
          id,
          name,
          unit,
          category,
          current_stock
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Calculate totals
  const total = purchaseOrder.items?.reduce(
    (sum: number, item: { quantity: number; unit_price: number }) =>
      sum + item.quantity * (item.unit_price || 0),
    0
  )

  const totalReceived = purchaseOrder.items?.reduce(
    (sum: number, item: { received_quantity: number; unit_price: number }) =>
      sum + (item.received_quantity || 0) * (item.unit_price || 0),
    0
  )

  return NextResponse.json({
    ...purchaseOrder,
    total_amount: total || 0,
    total_received_amount: totalReceived || 0,
    item_count: purchaseOrder.items?.length || 0,
  })
}

/**
 * PUT /api/stock/purchase-orders/[id]
 * Update a purchase order status
 * Access: managers only
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
  const validation = updatePurchaseOrderSchema.safeParse(body)
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

  // Update purchase order
  const { data: updatedOrder, error: updateError } = await supabase
    .from('purchase_orders')
    .update(validation.data)
    .eq('id', id)
    .select(`
      *,
      supplier:suppliers(
        id,
        name,
        contact_person,
        email,
        phone
      ),
      items:purchase_order_items(
        *,
        product:products(
          id,
          name,
          unit,
          category
        )
      )
    `)
    .single()

  if (updateError) {
    if (updateError.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Calculate total
  const total = updatedOrder.items?.reduce(
    (sum: number, item: { quantity: number; unit_price: number }) =>
      sum + item.quantity * (item.unit_price || 0),
    0
  )

  return NextResponse.json({
    ...updatedOrder,
    total_amount: total || 0,
  })
}

/**
 * DELETE /api/stock/purchase-orders/[id]
 * Delete a purchase order
 * Access: admins only
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params
  const supabase = await createClient()

  // Check if order can be deleted (only pending/cancelled orders)
  const { data: order } = await supabase
    .from('purchase_orders')
    .select('status')
    .eq('id', id)
    .single()

  if (order && !['pending', 'cancelled'].includes(order.status)) {
    return NextResponse.json(
      {
        error: 'Cannot delete ordered or received purchase orders',
      },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('purchase_orders')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
