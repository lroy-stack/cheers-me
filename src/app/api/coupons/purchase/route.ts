import { createClient } from '@/lib/supabase/server'
import { createCouponCheckoutSession } from '@/lib/stripe/checkout'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const purchaseSchema = z.object({
  amount_cents: z.number().int().min(1000).max(50000),
  purchaser_name: z.string().min(1).max(100),
  purchaser_email: z.string().email(),
  recipient_name: z.string().max(100).optional(),
  personal_message: z.string().max(500).optional(),
  theme: z.enum(['elegant', 'tropical', 'celebration', 'seasonal']).default('elegant'),
  gdpr_consent: z.literal(true, { errorMap: () => ({ message: 'GDPR consent is required' }) }),
})

/**
 * POST /api/coupons/purchase — Create coupon + Stripe checkout session (public)
 */
export async function POST(request: NextRequest) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = purchaseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const { amount_cents, purchaser_name, purchaser_email, recipient_name, personal_message, theme, gdpr_consent } = parsed.data

  const supabase = await createClient()

  // Create coupon record (pending payment)
  const { data: coupon, error: insertError } = await supabase
    .from('gift_coupons')
    .insert({
      amount_cents,
      remaining_cents: amount_cents,
      purchaser_name,
      purchaser_email,
      recipient_name: recipient_name || null,
      personal_message: personal_message || null,
      theme,
      gdpr_consent,
      gdpr_consent_at: new Date().toISOString(),
      status: 'pending_payment',
    })
    .select()
    .single()

  if (insertError || !coupon) {
    return NextResponse.json({ error: insertError?.message || 'Failed to create coupon' }, { status: 500 })
  }

  try {
    const session = await createCouponCheckoutSession({
      couponId: coupon.id,
      amountCents: amount_cents,
      email: purchaser_email,
      name: purchaser_name,
      code: coupon.code,
      recipientName: recipient_name,
    })

    // Store checkout session ID
    await supabase
      .from('gift_coupons')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', coupon.id)

    return NextResponse.json({
      checkout_url: session.url,
      coupon_code: coupon.code,
    })
  } catch (err) {
    // Clean up the pending coupon if Stripe fails
    await supabase.from('gift_coupons').delete().eq('id', coupon.id)

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
