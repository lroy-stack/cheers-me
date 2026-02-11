import { createClient } from '@/lib/supabase/server'
import { requireRole, requireAuth } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating product
const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  category: z.enum(['food', 'drink', 'supplies', 'beer']),
  unit: z.string().min(1).max(50),
  current_stock: z.number().min(0).default(0),
  min_stock: z.number().min(0).optional(),
  max_stock: z.number().min(0).optional(),
  cost_per_unit: z.number().min(0).default(0),
  supplier_id: z.string().uuid().optional(),
})

/**
 * GET /api/stock/products
 * List all products with optional filters
 * Access: kitchen, bar, managers
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  // Optional filters
  const category = searchParams.get('category')
  const lowStockOnly = searchParams.get('low_stock') === 'true'
  const supplierId = searchParams.get('supplier_id')
  const search = searchParams.get('search')

  let query = supabase
    .from('products')
    .select(`
      *,
      supplier:suppliers(
        id,
        name,
        contact_person,
        email,
        phone
      )
    `)
    .order('name', { ascending: true })

  if (category) {
    query = query.eq('category', category)
  }

  if (supplierId) {
    query = query.eq('supplier_id', supplierId)
  }

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const { data: products, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Filter low stock items if requested
  const filteredProducts = lowStockOnly
    ? products?.filter(p => p.min_stock && p.current_stock < p.min_stock)
    : products

  return NextResponse.json(filteredProducts)
}

/**
 * POST /api/stock/products
 * Create a new product
 * Access: managers/admins only
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
  const validation = createProductSchema.safeParse(body)
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

  // Create product
  const { data: newProduct, error: productError } = await supabase
    .from('products')
    .insert(validation.data)
    .select(`
      *,
      supplier:suppliers(
        id,
        name,
        contact_person,
        email,
        phone
      )
    `)
    .single()

  if (productError) {
    return NextResponse.json({ error: productError.message }, { status: 500 })
  }

  return NextResponse.json(newProduct, { status: 201 })
}
