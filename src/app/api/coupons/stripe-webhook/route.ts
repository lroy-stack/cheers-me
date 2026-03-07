import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, handleCheckoutCompleted } from '@/lib/stripe/webhook'

/**
 * POST /api/coupons/stripe-webhook — Stripe webhook handler
 * Must read raw body for signature verification.
 * Idempotent: duplicate events are detected via processed_webhook_events table.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 })
  }

  let event
  try {
    event = verifyWebhookSignature(rawBody, signature)
  } catch {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const result = await handleCheckoutCompleted(session, event.id)

      if (result.duplicate) {
        // Already processed — acknowledge without re-processing
        return NextResponse.json({ received: true })
      }

      if (!result.success) {
        // Log error server-side but return 500 so Stripe retries
        console.error('Webhook handler error for event', event.id)
        return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
      }
      break
    }
    default:
      // Ignore other event types
      break
  }

  return NextResponse.json({ received: true })
}
