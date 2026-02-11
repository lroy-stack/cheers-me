import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating waste log
const createWasteLogSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().min(0.01),
  reason: z.enum(['expired', 'damaged', 'overproduction', 'spoiled', 'customer_return', 'other']),
  notes: z.string().max(500).optional(),
})

/**
 * GET /api/stock/waste
 * List all waste logs with optional filters
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
  const productId = searchParams.get('product_id')
  const reason = searchParams.get('reason')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const limit = parseInt(searchParams.get('limit') || '100')

  let query = supabase
    .from('waste_logs')
    .select(`
      *,
      product:products(
        id,
        name,
        category,
        unit,
        cost_per_unit
      ),
      recorded_by_employee:employees!waste_logs_recorded_by_fkey(
        id,
        profile:profiles(
          full_name,
          email
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (productId) {
    query = query.eq('product_id', productId)
  }

  if (reason) {
    query = query.eq('reason', reason)
  }

  if (startDate) {
    query = query.gte('created_at', startDate)
  }

  if (endDate) {
    query = query.lte('created_at', endDate)
  }

  const { data: wasteLogs, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Add value calculation
  const wasteWithValue = wasteLogs?.map(log => ({
    ...log,
    value_lost: log.quantity * (log.product?.cost_per_unit || 0),
  }))

  return NextResponse.json(wasteWithValue)
}

/**
 * POST /api/stock/waste
 * Create a new waste log entry
 * Access: kitchen, bar, managers
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'kitchen', 'bar'])

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
  const validation = createWasteLogSchema.safeParse(body)
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

  // Get employee record for current user
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('profile_id', userData.profile.id)
    .single()

  // Get product details
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, current_stock, unit, cost_per_unit')
    .eq('id', validation.data.product_id)
    .single()

  if (productError || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  // Check if sufficient stock exists
  if (product.current_stock < validation.data.quantity) {
    return NextResponse.json(
      {
        error: `Insufficient stock to log waste. Current: ${product.current_stock} ${product.unit}`,
      },
      { status: 400 }
    )
  }

  // Prepare waste log data
  const wasteLogData = {
    ...validation.data,
    recorded_by: employee?.id || null,
  }

  // Create waste log
  const { data: newWasteLog, error: wasteError } = await supabase
    .from('waste_logs')
    .insert(wasteLogData)
    .select(`
      *,
      product:products(
        id,
        name,
        category,
        unit,
        cost_per_unit
      )
    `)
    .single()

  if (wasteError) {
    return NextResponse.json({ error: wasteError.message }, { status: 500 })
  }

  // Update product stock (reduce by waste quantity)
  const newStock = product.current_stock - validation.data.quantity

  const { error: updateError } = await supabase
    .from('products')
    .update({ current_stock: newStock })
    .eq('id', validation.data.product_id)

  if (updateError) {
    // Rollback: delete the waste log
    await supabase.from('waste_logs').delete().eq('id', newWasteLog.id)
    return NextResponse.json(
      { error: 'Failed to update product stock: ' + updateError.message },
      { status: 500 }
    )
  }

  // Also create a stock movement for tracking
  await supabase.from('stock_movements').insert({
    product_id: validation.data.product_id,
    movement_type: 'waste',
    quantity: -Math.abs(validation.data.quantity),
    reason: `Waste: ${validation.data.reason}`,
    recorded_by: employee?.id || null,
  })

  return NextResponse.json(
    {
      ...newWasteLog,
      value_lost: validation.data.quantity * product.cost_per_unit,
      previous_stock: product.current_stock,
      new_stock: newStock,
    },
    { status: 201 }
  )
}
