import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating subscriber
const updateSubscriberSchema = z.object({
  name: z.string().min(1).max(255).optional().nullable(),
  language: z.enum(['nl', 'en', 'es']).optional(),
  is_active: z.boolean().optional(),
})

/**
 * PATCH /api/marketing/subscribers/[id]
 * Update a subscriber's preferences (managers/admins only)
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

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = updateSubscriberSchema.safeParse(body)
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

  // Build update object
  const updateData: Record<string, unknown> = { ...validation.data }

  // If unsubscribing, set unsubscribed_at timestamp
  if (validation.data.is_active === false) {
    updateData.unsubscribed_at = new Date().toISOString()
  } else if (validation.data.is_active === true) {
    updateData.unsubscribed_at = null
  }

  // Update subscriber
  const { data: updatedSubscriber, error } = await supabase
    .from('newsletter_subscribers')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updatedSubscriber)
}

/**
 * DELETE /api/marketing/subscribers/[id]
 * Delete a subscriber (managers/admins only)
 * This permanently removes the subscriber from the database (GDPR compliance)
 */
export async function DELETE(
  _request: NextRequest,
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

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  const supabase = await createClient()

  // Delete subscriber permanently
  const { error } = await supabase
    .from('newsletter_subscribers')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
