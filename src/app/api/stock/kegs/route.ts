import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating keg
const createKegSchema = z.object({
  product_id: z.string().uuid(),
  keg_size_liters: z.number().min(1).max(200).default(20),
  initial_liters: z.number().min(0),
  current_liters: z.number().min(0).optional(),
  tapped_at: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
})

/**
 * GET /api/stock/kegs
 * List all kegs with optional filters
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
  const status = searchParams.get('status')
  const productId = searchParams.get('product_id')
  const activeOnly = searchParams.get('active') === 'true'

  let query = supabase
    .from('kegs')
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
    .order('tapped_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  if (productId) {
    query = query.eq('product_id', productId)
  }

  if (activeOnly) {
    query = query.eq('status', 'active')
  }

  const { data: kegs, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Calculate percentage remaining and liters consumed for each keg
  const kegsWithPercentage = kegs?.map(keg => ({
    ...keg,
    percent_remaining: keg.keg_size_liters > 0
      ? Math.round((keg.current_liters / keg.keg_size_liters) * 100)
      : 0,
    liters_consumed: keg.initial_liters - keg.current_liters,
  }))

  return NextResponse.json(kegsWithPercentage)
}

/**
 * POST /api/stock/kegs
 * Tap a new keg (create keg record)
 * Access: bar, managers
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'bar'])

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
  const validation = createKegSchema.safeParse(body)
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

  // Verify product exists and is a beer
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, category')
    .eq('id', validation.data.product_id)
    .single()

  if (productError || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  if (product.category !== 'beer') {
    return NextResponse.json(
      { error: 'Product must be a beer to track as keg' },
      { status: 400 }
    )
  }

  // Set current_liters to initial_liters if not provided
  const kegData = {
    ...validation.data,
    current_liters: validation.data.current_liters ?? validation.data.initial_liters,
    status: 'active',
  }

  // Create keg record
  const { data: newKeg, error: kegError } = await supabase
    .from('kegs')
    .insert(kegData)
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

  if (kegError) {
    return NextResponse.json({ error: kegError.message }, { status: 500 })
  }

  // Calculate percentage and liters consumed
  const kegWithPercentage = {
    ...newKeg,
    percent_remaining: newKeg.keg_size_liters > 0
      ? Math.round((newKeg.current_liters / newKeg.keg_size_liters) * 100)
      : 0,
    liters_consumed: newKeg.initial_liters - newKeg.current_liters,
  }

  return NextResponse.json(kegWithPercentage, { status: 201 })
}
