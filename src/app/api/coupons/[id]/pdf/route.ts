import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { generateCouponPdf } from '@/lib/pdf/coupon-pdf-generator'

/**
 * GET /api/coupons/[id]/pdf — Generate/download coupon PDF (manager+)
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

  const { data: coupon, error } = await supabase
    .from('gift_coupons')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !coupon) {
    return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
  }

  // If PDF already exists and coupon is active, redirect to stored PDF
  if (coupon.pdf_url && coupon.status !== 'pending_payment') {
    return NextResponse.redirect(coupon.pdf_url)
  }

  // Generate new PDF
  const pdfBuffer = await generateCouponPdf(coupon)

  // Upload to storage
  const filePath = `${coupon.code}/${Date.now()}.pdf`
  const { error: uploadError } = await supabase.storage
    .from('coupon-pdfs')
    .upload(filePath, pdfBuffer, {
      contentType: 'application/pdf',
      cacheControl: '86400',
    })

  if (uploadError) {
    // Still return the generated PDF even if upload fails
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="GrandCafe-Cheers-Gift-${coupon.code}.pdf"`,
      },
    })
  }

  const { data: { publicUrl } } = supabase.storage.from('coupon-pdfs').getPublicUrl(filePath)

  // Update coupon with PDF URL
  await supabase
    .from('gift_coupons')
    .update({ pdf_url: publicUrl, pdf_generated_at: new Date().toISOString() })
    .eq('id', id)

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="GrandCafe-Cheers-Gift-${coupon.code}.pdf"`,
    },
  })
}
