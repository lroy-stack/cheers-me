import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for receiving items
const receiveItemsSchema = z.object({
  items: z
    .array(
      z.object({
        item_id: z.string().uuid(),
        received_quantity: z.number().min(0),
      })
    )
    .min(1),
})

/**
 * POST /api/stock/purchase-orders/[id]/receive
 * Mark purchase order items as received and update stock
 * Access: managers only
 */
export async function POST(
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
  const validation = receiveItemsSchema.safeParse(body)
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
  const { data: userData } = authResult

  // Get employee record
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('profile_id', userData.profile.id)
    .single()

  // Get purchase order with items
  const { data: purchaseOrder, error: orderError } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      items:purchase_order_items(
        *,
        product:products(id, name, current_stock, unit)
      )
    `)
    .eq('id', id)
    .single()

  if (orderError) {
    if (orderError.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }
    return NextResponse.json({ error: orderError.message }, { status: 500 })
  }

  if (purchaseOrder.status === 'received') {
    return NextResponse.json(
      { error: 'Purchase order already fully received' },
      { status: 400 }
    )
  }

  if (purchaseOrder.status === 'cancelled') {
    return NextResponse.json(
      { error: 'Cannot receive cancelled purchase order' },
      { status: 400 }
    )
  }

  const updatedItems = []
  const stockUpdates = []

  // Process each received item
  for (const receivedItem of validation.data.items) {
    // Find the order item
    const orderItem = purchaseOrder.items?.find(
      (item: { id: string }) => item.id === receivedItem.item_id
    )

    if (!orderItem) {
      return NextResponse.json(
        { error: `Order item ${receivedItem.item_id} not found` },
        { status: 404 }
      )
    }

    // Update order item with received quantity
    const { data: updatedItem, error: updateItemError } = await supabase
      .from('purchase_order_items')
      .update({ received_quantity: receivedItem.received_quantity })
      .eq('id', receivedItem.item_id)
      .select()
      .single()

    if (updateItemError) {
      return NextResponse.json(
        { error: `Failed to update item: ${updateItemError.message}` },
        { status: 500 }
      )
    }

    updatedItems.push(updatedItem)

    // Update product stock
    const newStock =
      orderItem.product.current_stock + receivedItem.received_quantity

    const { error: stockError } = await supabase
      .from('products')
      .update({ current_stock: newStock })
      .eq('id', orderItem.product_id)

    if (stockError) {
      return NextResponse.json(
        { error: `Failed to update product stock: ${stockError.message}` },
        { status: 500 }
      )
    }

    stockUpdates.push({
      product_id: orderItem.product_id,
      product_name: orderItem.product.name,
      previous_stock: orderItem.product.current_stock,
      received_quantity: receivedItem.received_quantity,
      new_stock: newStock,
    })

    // Create stock movement record
    await supabase.from('stock_movements').insert({
      product_id: orderItem.product_id,
      movement_type: 'in',
      quantity: receivedItem.received_quantity,
      reason: `Purchase order received - PO: ${id}`,
      reference: id,
      recorded_by: employee?.id || null,
    })
  }

  // Check if all items are fully received
  const { data: allItems } = await supabase
    .from('purchase_order_items')
    .select('quantity, received_quantity')
    .eq('purchase_order_id', id)

  const allReceived = allItems?.every(
    (item: { quantity: number; received_quantity: number | null }) =>
      item.received_quantity !== null && item.received_quantity >= item.quantity
  )

  // Update order status if all items received
  if (allReceived) {
    await supabase
      .from('purchase_orders')
      .update({ status: 'received' })
      .eq('id', id)
  } else if (purchaseOrder.status === 'pending') {
    // Partially received - update status to ordered
    await supabase
      .from('purchase_orders')
      .update({ status: 'ordered' })
      .eq('id', id)
  }

  return NextResponse.json({
    success: true,
    purchase_order_id: id,
    items_updated: updatedItems.length,
    stock_updates: stockUpdates,
    order_status: allReceived ? 'received' : 'ordered',
  })
}
