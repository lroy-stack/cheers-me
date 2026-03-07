import { createAdminClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { getStripe } from '@/lib/stripe/config'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/coupons/[id]/refund
 * Admin-only: Refund a paid coupon via Stripe and mark it as refunded.
 * Requires coupon to be in 'active' or 'sold' status with a stripe_payment_intent_id.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  const supabase = createAdminClient()

  // Fetch coupon
  const { data: coupon, error: fetchError } = await supabase
    .from('gift_coupons')
    .select('id, status, stripe_payment_intent_id, amount_cents, code')
    .eq('id', id)
    .single()

  if (fetchError || !coupon) {
    return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
  }

  if (!['active', 'sold'].includes(coupon.status)) {
    return NextResponse.json(
      { error: `Cannot refund coupon with status '${coupon.status}'. Must be active or sold.` },
      { status: 400 }
    )
  }

  if (!coupon.stripe_payment_intent_id) {
    return NextResponse.json(
      { error: 'No Stripe payment found for this coupon. Cannot process refund.' },
      { status: 400 }
    )
  }

  // Create Stripe refund
  let refund
  try {
    const stripe = getStripe()
    refund = await stripe.refunds.create({
      payment_intent: coupon.stripe_payment_intent_id,
    })
  } catch (stripeErr) {
    console.error('[coupons/refund] Stripe error:', stripeErr)
    return NextResponse.json({ error: 'Stripe refund failed' }, { status: 502 })
  }

  if (refund.status !== 'succeeded' && refund.status !== 'pending') {
    return NextResponse.json(
      { error: `Stripe refund status: ${refund.status}` },
      { status: 502 }
    )
  }

  // Mark coupon as refunded
  const { error: updateError } = await supabase
    .from('gift_coupons')
    .update({
      status: 'refunded',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    console.error('[coupons/refund] DB update error:', updateError.message)
    // Stripe refund went through — log the inconsistency but return partial success
    return NextResponse.json(
      { error: 'Stripe refund succeeded but failed to update coupon status. Contact support.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    refund_id: refund.id,
    refund_status: refund.status,
    coupon_id: id,
    coupon_code: coupon.code,
  })
}
