/**
 * Stripe Configuration
 * Server-side Stripe client initialization.
 */

import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is not set — Stripe features will not work')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  // @ts-expect-error -- Stripe SDK types may lag behind the latest API version
  apiVersion: '2025-01-27.acacia',
  typescript: true,
})

export const STRIPE_CONFIG = {
  currency: 'eur',
  paymentMethods: ['card', 'ideal'] as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
  minAmountCents: 1000,   // €10 minimum
  maxAmountCents: 50000,  // €500 maximum
  presetAmounts: [2500, 5000, 7500, 10000], // €25, €50, €75, €100
}
