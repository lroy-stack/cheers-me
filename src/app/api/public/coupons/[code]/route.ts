import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/public/coupons/[code] — Public coupon view (GDPR safe)
 * Does NOT expose email, Stripe IDs, or purchaser details
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  const supabase = await createClient()
  const { data: coupon, error } = await supabase
    .from('gift_coupons')
    .select('code, amount_cents, remaining_cents, currency, theme, recipient_name, personal_message, status, pdf_url, purchased_at, expires_at')
    .eq('code', code.toUpperCase())
    .single()

  if (error || !coupon) {
    return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
  }

  // Don't expose pending payment coupons publicly
  if (coupon.status === 'pending_payment') {
    return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
  }

  return NextResponse.json(coupon)
}
