import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating stock take
const createStockTakeSchema = z.object({
  product_id: z.string().uuid(),
  physical_count: z.number().min(0),
  date: z.string().date().optional(),
})

/**
 * GET /api/stock/stock-takes
 * List all stock takes with optional filters
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
  const date = searchParams.get('date')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const limit = parseInt(searchParams.get('limit') || '100')

  let query = supabase
    .from('stock_takes')
    .select(`
      *,
      product:products(
        id,
        name,
        category,
        unit,
        current_stock
      ),
      recorded_by_employee:employees!stock_takes_recorded_by_fkey(
        id,
        profile:profiles(
          full_name,
          email
        )
      )
    `)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (productId) {
    query = query.eq('product_id', productId)
  }

  if (date) {
    query = query.eq('date', date)
  }

  if (startDate) {
    query = query.gte('date', startDate)
  }

  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data: stockTakes, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(stockTakes)
}

/**
 * POST /api/stock/stock-takes
 * Create a new stock take (physical inventory count)
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
  const validation = createStockTakeSchema.safeParse(body)
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

  // Get current system stock
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, current_stock, unit')
    .eq('id', validation.data.product_id)
    .single()

  if (productError || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  // Calculate variance
  const variance = validation.data.physical_count - product.current_stock

  // Prepare stock take data
  const stockTakeData = {
    product_id: validation.data.product_id,
    physical_count: validation.data.physical_count,
    system_count: product.current_stock,
    variance,
    date: validation.data.date || new Date().toISOString().split('T')[0],
    recorded_by: employee?.id || null,
  }

  // Create stock take record
  const { data: newStockTake, error: stockTakeError } = await supabase
    .from('stock_takes')
    .insert(stockTakeData)
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

  if (stockTakeError) {
    return NextResponse.json(
      { error: stockTakeError.message },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      ...newStockTake,
      variance_percentage:
        product.current_stock > 0
          ? Math.round((variance / product.current_stock) * 100)
          : 0,
    },
    { status: 201 }
  )
}
