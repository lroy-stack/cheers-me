import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating kitchen order
const createKitchenOrderSchema = z.object({
  table_id: z.string().uuid().optional(),
  waiter_id: z.string().uuid().optional(),
  items: z.array(z.object({
    menu_item_id: z.string().uuid(),
    quantity: z.number().int().min(1),
    notes: z.string().optional(),
  })).min(1),
})

/**
 * GET /api/kitchen/orders
 * List kitchen orders with optional filters (kitchen staff, waiters, managers)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'kitchen', 'waiter'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  // Optional filters
  const status = searchParams.get('status')
  const tableId = searchParams.get('table_id')
  const activeOnly = searchParams.get('active') === 'true' // pending or in_progress

  let query = supabase
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
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  if (tableId) {
    query = query.eq('table_id', tableId)
  }

  if (activeOnly) {
    query = query.in('status', ['pending', 'in_progress'])
  }

  const { data: orders, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(orders)
}

/**
 * POST /api/kitchen/orders
 * Create a new kitchen order (kitchen staff, waiters, managers)
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'kitchen', 'waiter'])

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
  const validation = createKitchenOrderSchema.safeParse(body)
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

  // Generate unique ticket number (format: KO-YYYYMMDD-NNNN)
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const { data: todayOrders } = await supabase
    .from('kitchen_orders')
    .select('ticket_number')
    .like('ticket_number', `KO-${today}-%`)
    .order('ticket_number', { ascending: false })
    .limit(1)

  let sequence = 1
  if (todayOrders && todayOrders.length > 0) {
    const lastTicket = todayOrders[0].ticket_number
    const lastSequence = parseInt(lastTicket.split('-')[2])
    sequence = lastSequence + 1
  }

  const ticketNumber = `KO-${today}-${sequence.toString().padStart(4, '0')}`

  // Create kitchen order
  const { data: newOrder, error: orderError } = await supabase
    .from('kitchen_orders')
    .insert({
      ticket_number: ticketNumber,
      table_id: validation.data.table_id,
      waiter_id: validation.data.waiter_id,
      status: 'pending',
    })
    .select()
    .single()

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 })
  }

  // Create order items
  const orderItems = validation.data.items.map(item => ({
    kitchen_order_id: newOrder.id,
    menu_item_id: item.menu_item_id,
    quantity: item.quantity,
    notes: item.notes,
    status: 'pending',
  }))

  const { error: itemsError } = await supabase
    .from('kitchen_order_items')
    .insert(orderItems)

  if (itemsError) {
    // Rollback: delete the order
    await supabase.from('kitchen_orders').delete().eq('id', newOrder.id)
    return NextResponse.json(
      { error: 'Failed to create order items: ' + itemsError.message },
      { status: 500 }
    )
  }

  // Fetch complete order with relations
  const { data: completeOrder, error: fetchError } = await supabase
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
    .eq('id', newOrder.id)
    .single()

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  return NextResponse.json(completeOrder, { status: 201 })
}
