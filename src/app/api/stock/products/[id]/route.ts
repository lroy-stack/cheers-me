import { createClient } from '@/lib/supabase/server'
import { requireRole, requireAuth } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating product
const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  category: z.enum(['food', 'drink', 'supplies', 'beer']).optional(),
  unit: z.string().min(1).max(50).optional(),
  current_stock: z.number().min(0).optional(),
  min_stock: z.number().min(0).optional(),
  max_stock: z.number().min(0).optional(),
  cost_per_unit: z.number().min(0).optional(),
  supplier_id: z.string().uuid().nullable().optional(),
})

/**
 * GET /api/stock/products/[id]
 * Get a single product by ID
 * Access: kitchen, bar, managers
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params
  const supabase = await createClient()

  const { data: product, error } = await supabase
    .from('products')
    .select(`
      *,
      supplier:suppliers(
        id,
        name,
        contact_person,
        email,
        phone,
        payment_terms
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(product)
}

/**
 * PUT /api/stock/products/[id]
 * Update a product
 * Access: managers/admins only
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
  const validation = updateProductSchema.safeParse(body)
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

  // Update product
  const { data: updatedProduct, error: updateError } = await supabase
    .from('products')
    .update(validation.data)
    .eq('id', id)
    .select(`
      *,
      supplier:suppliers(
        id,
        name,
        contact_person,
        email,
        phone,
        payment_terms
      )
    `)
    .single()

  if (updateError) {
    if (updateError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(updatedProduct)
}

/**
 * DELETE /api/stock/products/[id]
 * Delete a product
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

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
