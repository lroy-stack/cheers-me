import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating subscriber (public signup)
const createSubscriberSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255).optional().nullable(),
  language: z.enum(['nl', 'en', 'es']).default('en'),
})

/**
 * GET /api/marketing/subscribers
 * List all newsletter subscribers (managers/admins only)
 * Query params:
 * - language: filter by language (nl, en, es)
 * - is_active: filter by subscription status (true, false)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  // Build query with optional filters
  let query = supabase
    .from('newsletter_subscribers')
    .select('*')
    .order('subscribed_at', { ascending: false })

  // Apply filters
  const language = searchParams.get('language')
  if (language) {
    query = query.eq('language', language)
  }

  const isActive = searchParams.get('is_active')
  if (isActive !== null) {
    query = query.eq('is_active', isActive === 'true')
  }

  const { data: subscribers, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(subscribers)
}

/**
 * POST /api/marketing/subscribers
 * Subscribe to newsletter (public endpoint, no auth required)
 * This endpoint allows anyone to sign up for the newsletter
 */
export async function POST(request: NextRequest) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = createSubscriberSchema.safeParse(body)
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

  // Check if email already exists
  const { data: existingSubscriber } = await supabase
    .from('newsletter_subscribers')
    .select('id, is_active, unsubscribed_at')
    .eq('email', validation.data.email)
    .single()

  if (existingSubscriber) {
    // If previously unsubscribed, reactivate
    if (!existingSubscriber.is_active) {
      const { data: reactivated, error: reactivateError } = await supabase
        .from('newsletter_subscribers')
        .update({
          is_active: true,
          unsubscribed_at: null,
          subscribed_at: new Date().toISOString(),
          name: validation.data.name || null,
          language: validation.data.language,
        })
        .eq('id', existingSubscriber.id)
        .select()
        .single()

      if (reactivateError) {
        return NextResponse.json(
          { error: reactivateError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        message: 'Successfully resubscribed',
        subscriber: reactivated,
      }, { status: 200 })
    }

    return NextResponse.json(
      { error: 'Email is already subscribed' },
      { status: 400 }
    )
  }

  // Create new subscriber
  const { data: newSubscriber, error } = await supabase
    .from('newsletter_subscribers')
    .insert({
      email: validation.data.email,
      name: validation.data.name || null,
      language: validation.data.language,
      is_active: true,
      subscribed_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    // Handle unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Email is already subscribed' },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    message: 'Successfully subscribed',
    subscriber: newSubscriber,
  }, { status: 201 })
}
