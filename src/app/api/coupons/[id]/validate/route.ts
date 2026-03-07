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
 * Uses atomic redeem_coupon RPC with FOR UPDATE row lock to prevent race conditions.
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

  // Use atomic RPC with FOR UPDATE row lock to prevent race conditions (P-02/B-02 fix)
  const { data, error } = await supabase.rpc('redeem_coupon', {
    p_coupon_id: id,
    p_amount_cents: parsed.data.amount_cents,
    p_validated_by: authResult.data.user.id,
    p_validation_method: parsed.data.validation_method,
    p_notes: parsed.data.notes || null,
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to redeem coupon' }, { status: 500 })
  }

  const result = data as {
    success: boolean
    error?: string
    coupon_id?: string
    redeemed_amount_cents?: number
    remaining_cents?: number
    new_status?: string
  }

  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Redemption failed' }, { status: 400 })
  }

  return NextResponse.json({
    message: 'Coupon redeemed successfully',
    coupon_id: result.coupon_id,
    redeemed_amount_cents: result.redeemed_amount_cents,
    remaining_cents: result.remaining_cents,
    status: result.new_status,
  })
}
