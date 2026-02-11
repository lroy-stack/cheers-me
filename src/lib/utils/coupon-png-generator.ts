/**
 * Gift Coupon PNG Generator
 * Generates 1200×630px OG-image-style voucher with logo, QR, and themed styling.
 * Renders SVG inline then converts to PNG with sharp.
 */

import sharp from 'sharp'
import type { GiftCoupon } from '@/types'
import { generateStyledQR } from '@/lib/utils/qr-code'
import { readFile } from 'fs/promises'
import { join } from 'path'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

const W = 1200
const H = 630

const THEMES: Record<string, { gradStart: string; gradEnd: string; accent: string }> = {
  elegant: { gradStart: '#1a1a2e', gradEnd: '#2d2d4e', accent: '#c9a84c' },
  tropical: { gradStart: '#0d7377', gradEnd: '#14a085', accent: '#ffa726' },
  celebration: { gradStart: '#5b2c6f', gradEnd: '#e74c8b', accent: '#f8bbd0' },
  seasonal: { gradStart: '#2c3e50', gradEnd: '#27ae60', accent: '#7dcea0' },
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function generateCouponPng(coupon: GiftCoupon): Promise<Buffer> {
  const theme = THEMES[coupon.theme] || THEMES.elegant

  // Load logo as base64
  let logoDataUri = ''
  try {
    const logoBuf = await readFile(join(process.cwd(), 'public', 'icons', 'logoheader.png'))
    logoDataUri = `data:image/png;base64,${logoBuf.toString('base64')}`
  } catch {
    // Logo not available
  }

  // Generate QR as base64
  let qrDataUri = ''
  try {
    const couponUrl = `${BASE_URL}/gift/${coupon.code}`
    const qrBuf = await generateStyledQR(couponUrl, 300)
    qrDataUri = `data:image/png;base64,${qrBuf.toString('base64')}`
  } catch {
    // QR not available
  }

  const amountStr = `€${(coupon.amount_cents / 100).toFixed(0)}`
  const expiryDate = new Date(coupon.expires_at).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const recipientLine = coupon.recipient_name
    ? `<text x="600" y="390" font-family="Helvetica, Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.9)" text-anchor="middle">for ${escapeXml(coupon.recipient_name)}</text>`
    : ''

  const messageLine = coupon.personal_message
    ? `<text x="600" y="480" font-family="Helvetica, Arial, sans-serif" font-size="16" fill="rgba(255,255,255,0.7)" text-anchor="middle" font-style="italic">"${escapeXml(coupon.personal_message.slice(0, 80))}"</text>`
    : ''

  const logoElement = logoDataUri
    ? `<image href="${logoDataUri}" x="40" y="30" width="60" height="60" />`
    : ''

  const qrElement = qrDataUri
    ? `<image href="${qrDataUri}" x="1010" y="180" width="150" height="150" />`
    : ''

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.gradStart}" />
      <stop offset="100%" stop-color="${theme.gradEnd}" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bg)" rx="16" />

  <!-- Decorative inner border -->
  <rect x="12" y="12" width="${W - 24}" height="${H - 24}" rx="10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1" />

  <!-- Logo -->
  ${logoElement}

  <!-- GIFT VOUCHER title -->
  <text x="120" y="60" font-family="Helvetica, Arial, sans-serif" font-size="16" fill="${theme.accent}" font-weight="bold" letter-spacing="4">GIFT VOUCHER</text>
  <text x="120" y="80" font-family="Helvetica, Arial, sans-serif" font-size="11" fill="rgba(255,255,255,0.5)">GrandCafe Cheers · Mallorca</text>

  <!-- Code top-right -->
  <text x="${W - 40}" y="55" font-family="monospace" font-size="14" fill="rgba(255,255,255,0.4)" text-anchor="end">${escapeXml(coupon.code)}</text>

  <!-- Divider line -->
  <line x1="40" y1="110" x2="${W - 40}" y2="110" stroke="${theme.accent}" stroke-width="1" opacity="0.4" />

  <!-- Amount (centered) -->
  <text x="600" y="310" font-family="Helvetica, Arial, sans-serif" font-size="96" fill="${theme.accent}" font-weight="bold" text-anchor="middle">${escapeXml(amountStr)}</text>

  <!-- Recipient -->
  ${recipientLine}

  <!-- Message -->
  ${messageLine}

  <!-- QR code -->
  ${qrElement}

  <!-- QR label -->
  ${qrDataUri ? `<text x="1085" y="355" font-family="Helvetica, Arial, sans-serif" font-size="10" fill="rgba(255,255,255,0.5)" text-anchor="middle">Scan to redeem</text>` : ''}

  <!-- Footer divider -->
  <line x1="40" y1="${H - 70}" x2="${W - 40}" y2="${H - 70}" stroke="rgba(255,255,255,0.15)" stroke-width="0.5" />

  <!-- Footer text -->
  <text x="40" y="${H - 42}" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="rgba(255,255,255,0.5)">Valid until ${escapeXml(expiryDate)}</text>
  <text x="${W - 40}" y="${H - 42}" font-family="Helvetica, Arial, sans-serif" font-size="11" fill="rgba(255,255,255,0.35)" text-anchor="end">GrandCafe Cheers · El Arenal, Mallorca</text>
  <text x="40" y="${H - 22}" font-family="Helvetica, Arial, sans-serif" font-size="9" fill="rgba(255,255,255,0.3)">Present this voucher at GrandCafe Cheers to redeem. Not redeemable for cash.</text>
</svg>`.trim()

  const pngBuffer = await sharp(Buffer.from(svg))
    .resize(W, H)
    .png()
    .toBuffer()

  return pngBuffer
}
