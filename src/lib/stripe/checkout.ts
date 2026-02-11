/**
 * Stripe Checkout Session Creator
 * Creates payment sessions for gift coupon purchases.
 */

import { stripe, STRIPE_CONFIG } from './config'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

interface CreateCheckoutParams {
  couponId: string
  amountCents: number
  email: string
  name: string
  code: string
  recipientName?: string
}

export async function createCouponCheckoutSession(params: CreateCheckoutParams) {
  const { couponId, amountCents, email, name, code, recipientName } = params

  if (amountCents < STRIPE_CONFIG.minAmountCents || amountCents > STRIPE_CONFIG.maxAmountCents) {
    throw new Error(`Amount must be between €${STRIPE_CONFIG.minAmountCents / 100} and €${STRIPE_CONFIG.maxAmountCents / 100}`)
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: STRIPE_CONFIG.paymentMethods,
    customer_email: email,
    line_items: [
      {
        price_data: {
          currency: STRIPE_CONFIG.currency,
          unit_amount: amountCents,
          product_data: {
            name: `GrandCafe Cheers Gift Voucher — ${code}`,
            description: recipientName
              ? `Gift voucher for ${recipientName}`
              : `Gift voucher worth €${amountCents / 100}`,
            images: [`${BASE_URL}/icons/logoheader.png`],
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      coupon_id: couponId,
      coupon_code: code,
      purchaser_name: name,
    },
    success_url: `${BASE_URL}/gift/success?code=${code}`,
    cancel_url: `${BASE_URL}/gift/cancelled`,
  })

  return session
}
