/**
 * Stripe Webhook Handler
 * Processes checkout.session.completed events for gift coupons.
 * Idempotent: uses processed_webhook_events table to prevent duplicate processing.
 */

import { stripe } from './config'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Verify Stripe webhook signature and parse event
 */
export function verifyWebhookSignature(
  body: string,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
  }
  return stripe.webhooks.constructEvent(body, signature, webhookSecret)
}

/**
 * Handle checkout.session.completed event
 * Activates the coupon after successful payment.
 * Uses processed_webhook_events table to ensure idempotent processing.
 */
export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  eventId: string
): Promise<{ success: boolean; error?: string; duplicate?: boolean }> {
  // Use service role client (webhook has no user session)
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Check if this event has already been processed (idempotency check)
  const { data: existingEvent } = await supabase
    .from('processed_webhook_events')
    .select('id')
    .eq('event_id', eventId)
    .single()

  if (existingEvent) {
    // Already processed — return success without re-processing
    return { success: true, duplicate: true }
  }

  const couponId = session.metadata?.coupon_id
  const couponCode = session.metadata?.coupon_code

  if (!couponId || !couponCode) {
    return { success: false, error: 'Missing coupon metadata in session' }
  }

  // Activate the coupon
  const { error: updateError } = await supabase
    .from('gift_coupons')
    .update({
      status: 'active',
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || null,
      purchased_at: new Date().toISOString(),
    })
    .eq('id', couponId)
    .eq('status', 'pending_payment')

  if (updateError) {
    return { success: false, error: 'Failed to activate coupon' }
  }

  // Record the processed event to prevent duplicate processing
  await supabase
    .from('processed_webhook_events')
    .insert({
      event_id: eventId,
      event_type: 'checkout.session.completed',
    })

  return { success: true }
}
