import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const VALID_ALLERGENS = [
  'gluten','crustaceans','eggs','fish','peanuts','soybeans',
  'milk','nuts','celery','mustard','sesame','sulphites','lupin','molluscs',
] as const

const setAllergiesSchema = z.object({
  allergens: z.array(z.enum(VALID_ALLERGENS)),
})

/**
 * GET /api/crm/customers/[id]/allergies
 * Get allergens for a customer
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'waiter', 'bar', 'kitchen'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customer_allergies')
    .select('allergen_code')
    .eq('customer_id', id)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch allergies' }, { status: 500 })
  }

  return NextResponse.json({ allergens: data.map((r) => r.allergen_code) })
}

/**
 * PUT /api/crm/customers/[id]/allergies
 * Replace all allergens for a customer (full set)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'waiter'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = setAllergiesSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 })
  }

  const supabase = await createClient()

  // Delete all existing allergens for this customer
  const { error: deleteError } = await supabase
    .from('customer_allergies')
    .delete()
    .eq('customer_id', id)

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to update allergies' }, { status: 500 })
  }

  // Insert new set if any
  if (parsed.data.allergens.length > 0) {
    const rows = parsed.data.allergens.map((code) => ({
      customer_id: id,
      allergen_code: code,
    }))
    const { error: insertError } = await supabase
      .from('customer_allergies')
      .insert(rows)

    if (insertError) {
      return NextResponse.json({ error: 'Failed to save allergies' }, { status: 500 })
    }
  }

  return NextResponse.json({ allergens: parsed.data.allergens })
}
