import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const requestSchema = z.object({
  type: z.enum(['access', 'erasure', 'portability', 'correction']),
  email: z.string().email(),
  full_name: z.string().max(255).optional(),
  message: z.string().max(2000).optional(),
})

/**
 * POST /api/public/data-request
 * Public GDPR DSAR endpoint — no auth required.
 * Creates a data_requests record for admin review.
 * Returns generic success regardless of whether email is known (prevent enumeration).
 */
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validation = requestSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.errors },
      { status: 400 }
    )
  }

  const { type, email, full_name, message } = validation.data

  // Use admin client to bypass RLS (public endpoint)
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('data_requests')
    .insert({
      type,
      email,
      full_name: full_name ?? null,
      message: message ?? null,
      status: 'pending',
    })

  if (error) {
    console.error('[data-request] insert error:', error.code)
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })
  }

  // Generic response — do not confirm whether email is in our system
  return NextResponse.json({
    success: true,
    message: 'Your request has been received. We will respond within 30 days as required by GDPR.',
  })
}
