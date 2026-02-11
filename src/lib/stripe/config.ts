/**
 * Stripe Configuration
 * Server-side Stripe client initialization.
 */

import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set — Stripe features will not work')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      // @ts-expect-error -- Stripe SDK types may lag behind the latest API version
      apiVersion: '2025-01-27.acacia',
      typescript: true,
    })
  }
  return _stripe
}

/** @deprecated Use getStripe() instead */
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export const STRIPE_CONFIG = {
  currency: 'eur',
  paymentMethods: ['card', 'ideal'] as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
  minAmountCents: 1000,   // €10 minimum
  maxAmountCents: 50000,  // €500 maximum
  presetAmounts: [2500, 5000, 7500, 10000], // €25, €50, €75, €100
}
