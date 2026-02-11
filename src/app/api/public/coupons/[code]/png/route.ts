import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateCouponPng } from '@/lib/utils/coupon-png-generator'

/**
 * GET /api/public/coupons/[code]/png — Download coupon PNG (public)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  const supabase = await createClient()
  const { data: coupon, error } = await supabase
    .from('gift_coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (error || !coupon) {
    return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
  }

  if (coupon.status === 'pending_payment') {
    return NextResponse.json({ error: 'Coupon payment is pending' }, { status: 400 })
  }

  const pngBuffer = await generateCouponPng(coupon)

  return new NextResponse(new Uint8Array(pngBuffer), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="GrandCafe-Cheers-Gift-${coupon.code}.png"`,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
