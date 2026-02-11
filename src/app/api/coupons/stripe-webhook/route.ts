import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, handleCheckoutCompleted } from '@/lib/stripe/webhook'

/**
 * POST /api/coupons/stripe-webhook — Stripe webhook handler
 * Must read raw body for signature verification
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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signature verification failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const result = await handleCheckoutCompleted(session)
      if (!result.success) {
        console.error('Webhook handler error:', result.error)
        return NextResponse.json({ error: result.error }, { status: 500 })
      }
      break
    }
    default:
      // Ignore other event types
      break
  }

  return NextResponse.json({ received: true })
}
