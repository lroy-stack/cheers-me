import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/coupons/[id] — Get coupon detail with redemptions (manager+)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  const supabase = await createClient()

  const [couponResult, redemptionsResult] = await Promise.all([
    supabase.from('gift_coupons').select('*').eq('id', id).single(),
    supabase.from('gift_coupon_redemptions').select('*').eq('coupon_id', id).order('created_at', { ascending: false }),
  ])

  if (couponResult.error || !couponResult.data) {
    return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
  }

  return NextResponse.json({
    ...couponResult.data,
    redemptions: redemptionsResult.data || [],
  })
}

/**
 * PATCH /api/coupons/[id] — Update coupon (manager+)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
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

  // Only allow updating status and expiry
  const allowedFields: Record<string, unknown> = {}
  if (body.status && ['active', 'cancelled', 'expired'].includes(body.status)) {
    allowedFields.status = body.status
  }
  if (body.expires_at) {
    allowedFields.expires_at = body.expires_at
  }

  if (Object.keys(allowedFields).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('gift_coupons')
    .update(allowedFields)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
