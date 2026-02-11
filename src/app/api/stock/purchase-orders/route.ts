import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating purchase order
const createPurchaseOrderSchema = z.object({
  supplier_id: z.string().uuid(),
  order_date: z.string().date(),
  expected_delivery_date: z.string().date().optional(),
  status: z.enum(['pending', 'ordered', 'received', 'cancelled']).default('pending'),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().min(0.01),
        unit_price: z.number().min(0).optional(),
      })
    )
    .min(1),
})

/**
 * GET /api/stock/purchase-orders
 * List all purchase orders with optional filters
 * Access: managers only
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  // Optional filters
  const supplierId = searchParams.get('supplier_id')
  const status = searchParams.get('status')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')

  let query = supabase
    .from('purchase_orders')
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
    .order('order_date', { ascending: false })

  if (supplierId) {
    query = query.eq('supplier_id', supplierId)
  }

  if (status) {
    query = query.eq('status', status)
  }

  if (startDate) {
    query = query.gte('order_date', startDate)
  }

  if (endDate) {
    query = query.lte('order_date', endDate)
  }

  const { data: purchaseOrders, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Calculate totals for each order
  const ordersWithTotals = purchaseOrders?.map(order => {
    const total = order.items?.reduce(
      (sum: number, item: { quantity: number; unit_price: number }) =>
        sum + item.quantity * (item.unit_price || 0),
      0
    )
    return {
      ...order,
      total_amount: total || 0,
      item_count: order.items?.length || 0,
    }
  })

  return NextResponse.json(ordersWithTotals)
}

/**
 * POST /api/stock/purchase-orders
 * Create a new purchase order
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

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = createPurchaseOrderSchema.safeParse(body)
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

  // Verify supplier exists
  const { data: supplier, error: supplierError } = await supabase
    .from('suppliers')
    .select('id, name')
    .eq('id', validation.data.supplier_id)
    .single()

  if (supplierError || !supplier) {
    return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
  }

  // Create purchase order
  const { items, ...orderData } = validation.data

  const { data: newOrder, error: orderError } = await supabase
    .from('purchase_orders')
    .insert(orderData)
    .select()
    .single()

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 })
  }

  // Create order items
  const orderItems = items.map(item => ({
    purchase_order_id: newOrder.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price || null,
    received_quantity: null,
  }))

  const { data: createdItems, error: itemsError } = await supabase
    .from('purchase_order_items')
    .insert(orderItems)
    .select(`
      *,
      product:products(
        id,
        name,
        unit,
        category
      )
    `)

  if (itemsError) {
    // Rollback: delete the order
    await supabase.from('purchase_orders').delete().eq('id', newOrder.id)
    return NextResponse.json(
      { error: 'Failed to create order items: ' + itemsError.message },
      { status: 500 }
    )
  }

  // Calculate total
  const total = createdItems?.reduce(
    (sum, item) => sum + item.quantity * (item.unit_price || 0),
    0
  )

  return NextResponse.json(
    {
      ...newOrder,
      supplier,
      items: createdItems,
      total_amount: total || 0,
    },
    { status: 201 }
  )
}
