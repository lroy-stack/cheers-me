/**
 * Gift Coupon PDF Generator
 * Generates A5 landscape vouchers with QR code and themed styling.
 * Pattern: training-pdf-generator.ts (PDFKit, buffer chunks, logo embed)
 */

import PDFDocument from 'pdfkit'
import type { GiftCoupon } from '@/types'
import { generateStyledQR } from '@/lib/utils/qr-code'
import fs from 'fs'
import path from 'path'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// A5 Landscape dimensions (points)
const PAGE_W = 595.28
const PAGE_H = 419.53
const MARGIN = 40

// Theme color palettes
const THEMES: Record<string, { primary: string; secondary: string; accent: string; bg: string }> = {
  elegant: {
    primary: '#1a1a2e',
    secondary: '#c9a84c',
    accent: '#e8d5a0',
    bg: '#fafaf8',
  },
  tropical: {
    primary: '#0d7377',
    secondary: '#e8632b',
    accent: '#14a085',
    bg: '#f0faf7',
  },
  celebration: {
    primary: '#5b2c6f',
    secondary: '#e74c8b',
    accent: '#af7ac5',
    bg: '#faf0f5',
  },
  seasonal: {
    primary: '#2c3e50',
    secondary: '#27ae60',
    accent: '#7dcea0',
    bg: '#f0faf2',
  },
}

// Corner decoration helper
function drawCornerDecorations(doc: PDFKit.PDFDocument, theme: { secondary: string }) {
  const inset = 20
  const len = 20
  const color = theme.secondary

  doc.lineWidth(1.5).strokeColor(color)

  // Top-left
  doc.moveTo(inset, inset + len).lineTo(inset, inset).lineTo(inset + len, inset).stroke()
  // Top-right
  doc.moveTo(PAGE_W - inset - len, inset).lineTo(PAGE_W - inset, inset).lineTo(PAGE_W - inset, inset + len).stroke()
  // Bottom-left
  doc.moveTo(inset, PAGE_H - inset - len).lineTo(inset, PAGE_H - inset).lineTo(inset + len, PAGE_H - inset).stroke()
  // Bottom-right
  doc.moveTo(PAGE_W - inset - len, PAGE_H - inset).lineTo(PAGE_W - inset, PAGE_H - inset).lineTo(PAGE_W - inset, PAGE_H - inset - len).stroke()
}

export async function generateCouponPdf(coupon: GiftCoupon): Promise<Buffer> {
  const theme = THEMES[coupon.theme] || THEMES.elegant

  const doc = new PDFDocument({
    size: [PAGE_W, PAGE_H],
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    bufferPages: true,
  })

  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))

  const promise = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })

  // Load logo
  let logoBuffer: Buffer | null = null
  try {
    logoBuffer = fs.readFileSync(path.join(process.cwd(), 'public', 'icons', 'logoheader.png'))
  } catch {
    // Logo not available
  }

  // Generate QR code
  const couponUrl = `${BASE_URL}/gift/${coupon.code}`
  let qrBuffer: Buffer | null = null
  try {
    qrBuffer = await generateStyledQR(couponUrl, 300)
  } catch {
    // QR generation failed
  }

  // --- Background ---
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(theme.bg)

  // --- Decorative border ---
  const borderInset = 15
  doc.rect(borderInset, borderInset, PAGE_W - borderInset * 2, PAGE_H - borderInset * 2)
    .lineWidth(2)
    .stroke(theme.secondary)

  doc.rect(borderInset + 4, borderInset + 4, PAGE_W - (borderInset + 4) * 2, PAGE_H - (borderInset + 4) * 2)
    .lineWidth(0.5)
    .stroke(theme.accent)

  // --- Corner decorations ---
  drawCornerDecorations(doc, theme)

  // --- Header area ---
  const headerY = MARGIN + 10

  // Logo (left side)
  if (logoBuffer) {
    doc.image(logoBuffer, MARGIN + 10, headerY, { width: 100 })
  }

  // "GIFT VOUCHER" text with character spacing
  doc.font('Helvetica-Bold')
    .fontSize(14)
    .fillColor(theme.secondary)
  doc.text('GIFT VOUCHER', MARGIN + 130, headerY + 5, { characterSpacing: 3 })

  doc.font('Helvetica')
    .fontSize(8)
    .fillColor(theme.primary)
    .text('GrandCafe Cheers — El Arenal, Mallorca', MARGIN + 130, headerY + 24)

  // --- Divider line ---
  const dividerY = headerY + 50
  doc.moveTo(MARGIN + 10, dividerY)
    .lineTo(PAGE_W - MARGIN - 10, dividerY)
    .lineWidth(1)
    .stroke(theme.secondary)

  // --- Main content area (left side) ---
  const contentX = MARGIN + 20
  const contentY = dividerY + 20

  // Amount — large display
  const amountStr = `€${(coupon.amount_cents / 100).toFixed(0)}`
  doc.font('Helvetica-Bold')
    .fontSize(56)
    .fillColor(theme.primary)
    .text(amountStr, contentX, contentY, { width: 300 })

  // Recipient
  let currentY = contentY + 70
  if (coupon.recipient_name) {
    doc.font('Helvetica')
      .fontSize(10)
      .fillColor(theme.secondary)
      .text('FOR', contentX, currentY)

    doc.font('Helvetica-Bold')
      .fontSize(16)
      .fillColor(theme.primary)
      .text(coupon.recipient_name, contentX, currentY + 14, { width: 280 })

    currentY += 40
  }

  // Personal message
  if (coupon.personal_message) {
    doc.font('Helvetica-Oblique')
      .fontSize(10)
      .fillColor('#555555')
      .text(`"${coupon.personal_message}"`, contentX, currentY, { width: 280 })

    currentY += 30
  }

  // --- QR code (right side) ---
  const qrX = PAGE_W - MARGIN - 140
  const qrY = dividerY + 20

  if (qrBuffer) {
    doc.image(qrBuffer, qrX, qrY, { width: 120, height: 120 })
  }

  // Coupon code below QR
  doc.font('Helvetica-Bold')
    .fontSize(14)
    .fillColor(theme.primary)
    .text(coupon.code, qrX, qrY + 125, { width: 120, align: 'center' })

  // --- Footer ---
  const footerY = PAGE_H - MARGIN - 50

  // Divider
  doc.moveTo(MARGIN + 10, footerY)
    .lineTo(PAGE_W - MARGIN - 10, footerY)
    .lineWidth(0.5)
    .stroke(theme.accent)

  // Expiry date
  const expiryDate = new Date(coupon.expires_at).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  doc.font('Helvetica')
    .fontSize(8)
    .fillColor(theme.primary)
    .text(`Valid until: ${expiryDate}`, MARGIN + 15, footerY + 8)

  // Restaurant info
  doc.font('Helvetica')
    .fontSize(7)
    .fillColor('#888888')
    .text(
      'GrandCafe Cheers · Carrer de Cartago 22, El Arenal, Mallorca 07600 · @cheersmallorca',
      MARGIN + 15,
      footerY + 22,
      { width: PAGE_W - MARGIN * 2 - 30 }
    )

  // Present this voucher text — more prominent
  doc.font('Helvetica-Bold')
    .fontSize(7)
    .fillColor('#666666')
    .text(
      'Present this voucher at GrandCafe Cheers to redeem. Not redeemable for cash. Non-transferable.',
      MARGIN + 15,
      footerY + 34,
      { width: PAGE_W - MARGIN * 2 - 30 }
    )

  doc.end()
  return promise
}
