import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const validateSchema = z.object({
  amount_cents: z.number().int().min(1),
  validation_method: z.enum(['qr_scan', 'code_entry', 'ai_assistant']).default('code_entry'),
  notes: z.string().max(500).optional(),
})

/**
 * POST /api/coupons/[id]/validate — Validate & redeem coupon (waiter+)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner', 'waiter', 'bar'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = validateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = await createClient()

  // Get current coupon state
  const { data: coupon, error: couponError } = await supabase
    .from('gift_coupons')
    .select('*')
    .eq('id', id)
    .single()

  if (couponError || !coupon) {
    return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
  }

  // Validate coupon status
  if (coupon.status === 'expired') {
    return NextResponse.json({ error: 'Coupon has expired' }, { status: 400 })
  }
  if (coupon.status === 'fully_used') {
    return NextResponse.json({ error: 'Coupon has been fully used' }, { status: 400 })
  }
  if (coupon.status === 'cancelled') {
    return NextResponse.json({ error: 'Coupon has been cancelled' }, { status: 400 })
  }
  if (coupon.status === 'pending_payment') {
    return NextResponse.json({ error: 'Coupon payment is still pending' }, { status: 400 })
  }

  // Check expiry date
  if (new Date(coupon.expires_at) < new Date()) {
    await supabase.from('gift_coupons').update({ status: 'expired' }).eq('id', id)
    return NextResponse.json({ error: 'Coupon has expired' }, { status: 400 })
  }

  // Check sufficient balance
  if (parsed.data.amount_cents > coupon.remaining_cents) {
    return NextResponse.json({
      error: `Insufficient balance. Remaining: €${(coupon.remaining_cents / 100).toFixed(2)}`,
    }, { status: 400 })
  }

  const newRemaining = coupon.remaining_cents - parsed.data.amount_cents
  const newStatus = newRemaining === 0 ? 'fully_used' : 'partially_used'

  // Create redemption record
  const { error: redemptionError } = await supabase
    .from('gift_coupon_redemptions')
    .insert({
      coupon_id: id,
      amount_cents: parsed.data.amount_cents,
      validated_by: authResult.data.user.id,
      validation_method: parsed.data.validation_method,
      notes: parsed.data.notes || null,
    })

  if (redemptionError) {
    return NextResponse.json({ error: redemptionError.message }, { status: 500 })
  }

  // Update coupon balance
  const { data: updatedCoupon, error: updateError } = await supabase
    .from('gift_coupons')
    .update({
      remaining_cents: newRemaining,
      status: newStatus,
    })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    message: 'Coupon redeemed successfully',
    coupon: updatedCoupon,
    redeemed_amount_cents: parsed.data.amount_cents,
    remaining_cents: newRemaining,
  })
}
