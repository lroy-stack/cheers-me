import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating review
const updateReviewSchema = z.object({
  customer_id: z.string().uuid().optional().nullable(),
  platform: z.string().min(1).max(100).optional(),
  rating: z.number().min(0).max(5).optional().nullable(),
  review_text: z.string().optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  response_draft: z.string().optional().nullable(),
})

/**
 * GET /api/crm/reviews/[id]
 * Get a specific review by ID
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params
  const supabase = await createClient()

  const { data: review, error } = await supabase
    .from('customer_reviews')
    .select(`
      *,
      customer:customers(
        id,
        name,
        email,
        phone,
        vip,
        visit_count
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(review)
}

/**
 * PATCH /api/crm/reviews/[id]
 * Update a review (for editing drafts, sentiment, etc.)
 */
export async function PATCH(
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
  const validation = updateReviewSchema.safeParse(body)
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

  // If customer_id provided, verify it exists
  if (validation.data.customer_id !== undefined) {
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', validation.data.customer_id)
      .single()

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }
  }

  // Update review record
  const { data: updatedReview, error } = await supabase
    .from('customer_reviews')
    .update({
      ...validation.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      *,
      customer:customers(
        id,
        name,
        email,
        vip
      )
    `)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updatedReview)
}

/**
 * DELETE /api/crm/reviews/[id]
 * Delete a review (admins only)
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
    .from('customer_reviews')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
