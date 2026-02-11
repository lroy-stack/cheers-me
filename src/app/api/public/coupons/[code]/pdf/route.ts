import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateCouponPdf } from '@/lib/pdf/coupon-pdf-generator'

/**
 * GET /api/public/coupons/[code]/pdf — Download coupon PDF (public)
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

  // If PDF already generated, redirect
  if (coupon.pdf_url) {
    return NextResponse.redirect(coupon.pdf_url)
  }

  // Generate on-demand
  const pdfBuffer = await generateCouponPdf(coupon)

  // Upload to storage
  const filePath = `${coupon.code}/${Date.now()}.pdf`
  const { error: uploadError } = await supabase.storage
    .from('coupon-pdfs')
    .upload(filePath, pdfBuffer, {
      contentType: 'application/pdf',
      cacheControl: '86400',
    })

  if (!uploadError) {
    const { data: { publicUrl } } = supabase.storage.from('coupon-pdfs').getPublicUrl(filePath)
    await supabase
      .from('gift_coupons')
      .update({ pdf_url: publicUrl, pdf_generated_at: new Date().toISOString() })
      .eq('id', coupon.id)
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="GrandCafe-Cheers-Gift-${coupon.code}.pdf"`,
    },
  })
}
