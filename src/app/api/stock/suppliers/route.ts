import { createClient } from '@/lib/supabase/server'
import { requireRole, requireAuth } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating supplier
const createSupplierSchema = z.object({
  name: z.string().min(1).max(255),
  contact_person: z.string().max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  payment_terms: z.string().max(255).optional(),
})

/**
 * GET /api/stock/suppliers
 * List all suppliers
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

  const search = searchParams.get('search')

  let query = supabase
    .from('suppliers')
    .select('*')
    .order('name', { ascending: true })

  if (search) {
    query = query.or(`name.ilike.%${search}%,contact_person.ilike.%${search}%`)
  }

  const { data: suppliers, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(suppliers)
}

/**
 * POST /api/stock/suppliers
 * Create a new supplier
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
  const validation = createSupplierSchema.safeParse(body)
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

  // Create supplier
  const { data: newSupplier, error: supplierError } = await supabase
    .from('suppliers')
    .insert(validation.data)
    .select()
    .single()

  if (supplierError) {
    return NextResponse.json(
      { error: supplierError.message },
      { status: 500 }
    )
  }

  return NextResponse.json(newSupplier, { status: 201 })
}
