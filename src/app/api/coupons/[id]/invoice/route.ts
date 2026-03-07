import { createAdminClient, createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import PDFDocumentCtor from 'pdfkit'

/**
 * GET /api/coupons/[id]/invoice
 * Generate factura simplificada PDF with NIF, IVA (21%) breakdown, sequential number.
 * Access: admin/owner/manager only.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'owner', 'manager'])
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

  if (coupon.status === 'pending_payment') {
    return NextResponse.json({ error: 'Coupon payment not yet completed' }, { status: 400 })
  }

  // Assign invoice number if not already assigned
  let invoiceNumber = coupon.invoice_number
  if (!invoiceNumber) {
    const adminSupabase = createAdminClient()
    // Generate sequential invoice number
    const { data: seqRow } = await adminSupabase
      .rpc('nextval', { seq: 'coupon_invoice_seq' })
      .single()

    const year = new Date().getFullYear()
    invoiceNumber = `FAC-${year}-${String((seqRow as number) || 1).padStart(5, '0')}`

    await adminSupabase
      .from('gift_coupons')
      .update({ invoice_number: invoiceNumber })
      .eq('id', id)
  }

  // IVA (Spain) — 21% included in the price
  const totalCents = coupon.amount_cents
  const totalEur = totalCents / 100
  // Base imponible (excl. IVA): total / 1.21
  const baseImponible = totalEur / 1.21
  const ivaAmount = totalEur - baseImponible
  const ivaRate = 21

  // Business info (configurable via env or settings)
  const businessName = 'GrandCafe Cheers S.L.'
  const businessNIF = process.env.BUSINESS_NIF || 'B12345678'
  const businessAddress = 'Carrer de la Platja 1, Palma de Mallorca, 07001, Spain'

  // Generate PDF
  const doc = new PDFDocumentCtor({ size: 'A4', margin: 50 })
  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))

  await new Promise<void>((resolve) => {
    doc.on('end', resolve)

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('FACTURA SIMPLIFICADA', { align: 'center' })
    doc.moveDown(0.5)
    doc.fontSize(12).font('Helvetica').text(`Nº: ${invoiceNumber}`, { align: 'center' })
    doc.moveDown(1)

    // Business info
    doc.fontSize(10).font('Helvetica-Bold').text('Emisor:')
    doc.font('Helvetica')
      .text(businessName)
      .text(`NIF: ${businessNIF}`)
      .text(businessAddress)
    doc.moveDown(1)

    // Purchaser info
    doc.font('Helvetica-Bold').text('Cliente:')
    doc.font('Helvetica').text(coupon.purchaser_name)
    if (coupon.purchaser_email) doc.text(coupon.purchaser_email)
    doc.moveDown(1)

    // Invoice date
    const invoiceDate = coupon.purchased_at
      ? new Date(coupon.purchased_at).toLocaleDateString('es-ES')
      : new Date().toLocaleDateString('es-ES')
    doc.font('Helvetica-Bold').text(`Fecha: `, { continued: true })
    doc.font('Helvetica').text(invoiceDate)
    doc.moveDown(1)

    // Line item
    doc.font('Helvetica-Bold').text('Concepto', { width: 300, continued: true })
    doc.text('Importe', { align: 'right' })
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke()
    doc.moveDown(0.3)

    doc.font('Helvetica')
      .text(`Vale regalo / Gift coupon (${coupon.code})`, { width: 300, continued: true })
      .text(`€${baseImponible.toFixed(2)}`, { align: 'right' })
    doc.moveDown(0.5)

    // IVA breakdown
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke()
    doc.moveDown(0.3)
    doc.font('Helvetica').text(`Base imponible:`, { width: 400, continued: true })
      .text(`€${baseImponible.toFixed(2)}`, { align: 'right' })
    doc.text(`IVA ${ivaRate}%:`, { width: 400, continued: true })
      .text(`€${ivaAmount.toFixed(2)}`, { align: 'right' })
    doc.moveDown(0.3)
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke()
    doc.moveDown(0.3)
    doc.font('Helvetica-Bold').text(`TOTAL:`, { width: 400, continued: true })
      .text(`€${totalEur.toFixed(2)}`, { align: 'right' })

    doc.moveDown(2)
    doc.fontSize(8).font('Helvetica').fillColor('grey')
      .text('Documento generado automáticamente — Factura simplificada conforme al R.D. 1619/2012', { align: 'center' })

    doc.end()
  })

  const pdfBuffer = Buffer.concat(chunks)

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="factura-${invoiceNumber}.pdf"`,
      'Content-Length': String(pdfBuffer.length),
    },
  })
}
