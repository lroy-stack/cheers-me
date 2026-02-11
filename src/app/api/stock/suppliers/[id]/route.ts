import { createClient } from '@/lib/supabase/server'
import { requireRole, requireAuth } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating supplier
const updateSupplierSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  contact_person: z.string().max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  payment_terms: z.string().max(255).optional(),
})

/**
 * GET /api/stock/suppliers/[id]
 * Get a single supplier with their products
 * Access: authenticated users
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

  // Get supplier
  const { data: supplier, error: supplierError } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .single()

  if (supplierError) {
    if (supplierError.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: supplierError.message },
      { status: 500 }
    )
  }

  // Get products from this supplier
  const { data: products } = await supabase
    .from('products')
    .select('id, name, category, unit, current_stock, min_stock, cost_per_unit')
    .eq('supplier_id', id)
    .order('name')

  return NextResponse.json({
    ...supplier,
    products: products || [],
  })
}

/**
 * PUT /api/stock/suppliers/[id]
 * Update a supplier
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
  const validation = updateSupplierSchema.safeParse(body)
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

  // Update supplier
  const { data: updatedSupplier, error: updateError } = await supabase
    .from('suppliers')
    .update(validation.data)
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    if (updateError.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    )
  }

  return NextResponse.json(updatedSupplier)
}

/**
 * DELETE /api/stock/suppliers/[id]
 * Delete a supplier
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

  // Check if any products are linked to this supplier
  const { data: products } = await supabase
    .from('products')
    .select('id')
    .eq('supplier_id', id)
    .limit(1)

  if (products && products.length > 0) {
    return NextResponse.json(
      {
        error: 'Cannot delete supplier with linked products. Remove product associations first.',
      },
      { status: 400 }
    )
  }

  const { error } = await supabase.from('suppliers').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
