import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating stock movement
const createStockMovementSchema = z.object({
  product_id: z.string().uuid(),
  movement_type: z.enum(['in', 'out', 'adjustment', 'waste']),
  quantity: z.number(),
  reason: z.string().max(500).optional(),
  reference: z.string().max(255).optional(),
})

/**
 * GET /api/stock/movements
 * List all stock movements with optional filters
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
  const movementType = searchParams.get('movement_type')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const limit = parseInt(searchParams.get('limit') || '100')

  let query = supabase
    .from('stock_movements')
    .select(`
      *,
      product:products(
        id,
        name,
        category,
        unit
      ),
      recorded_by_employee:employees!stock_movements_recorded_by_fkey(
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

  if (movementType) {
    query = query.eq('movement_type', movementType)
  }

  if (startDate) {
    query = query.gte('created_at', startDate)
  }

  if (endDate) {
    query = query.lte('created_at', endDate)
  }

  const { data: movements, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(movements)
}

/**
 * POST /api/stock/movements
 * Create a new stock movement (and update product stock)
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
  const validation = createStockMovementSchema.safeParse(body)
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

  // Prepare movement data
  const movementData = {
    ...validation.data,
    recorded_by: employee?.id || null,
  }

  // Get current product stock
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, current_stock, unit')
    .eq('id', validation.data.product_id)
    .single()

  if (productError || !product) {
    return NextResponse.json(
      { error: 'Product not found' },
      { status: 404 }
    )
  }

  // Calculate new stock level
  let newStock = product.current_stock
  const { movement_type, quantity } = validation.data

  switch (movement_type) {
    case 'in':
      newStock += Math.abs(quantity)
      break
    case 'out':
    case 'waste':
      newStock -= Math.abs(quantity)
      break
    case 'adjustment':
      newStock += quantity // Can be positive or negative
      break
  }

  // Ensure stock doesn't go negative
  if (newStock < 0) {
    return NextResponse.json(
      { error: `Insufficient stock. Current: ${product.current_stock} ${product.unit}` },
      { status: 400 }
    )
  }

  // Create movement record
  const { data: newMovement, error: movementError } = await supabase
    .from('stock_movements')
    .insert(movementData)
    .select(`
      *,
      product:products(
        id,
        name,
        category,
        unit
      )
    `)
    .single()

  if (movementError) {
    return NextResponse.json(
      { error: movementError.message },
      { status: 500 }
    )
  }

  // Update product stock
  const { error: updateError } = await supabase
    .from('products')
    .update({ current_stock: newStock })
    .eq('id', validation.data.product_id)

  if (updateError) {
    // Rollback: delete the movement
    await supabase.from('stock_movements').delete().eq('id', newMovement.id)
    return NextResponse.json(
      { error: 'Failed to update product stock: ' + updateError.message },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      ...newMovement,
      previous_stock: product.current_stock,
      new_stock: newStock,
    },
    { status: 201 }
  )
}
