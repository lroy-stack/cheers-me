import QRCode from 'qrcode'
import sharp from 'sharp'
import { readFile } from 'fs/promises'
import { join } from 'path'

const QR_SIZE = 800
const LOGO_SIZE_RATIO = 0.2 // Logo takes 20% of QR area

/**
 * Generate a styled QR code with company logo centered
 * Uses error correction level H (30% redundancy) to allow logo overlay
 */
export async function generateStyledQR(
  menuUrl: string,
  size: number = QR_SIZE
): Promise<Buffer> {
  // Generate base QR code as PNG buffer
  const qrBuffer = await QRCode.toBuffer(menuUrl, {
    errorCorrectionLevel: 'H',
    width: size,
    margin: 2,
    color: {
      dark: '#1a1a2e', // Navy corporate color
      light: '#FFFFFF',
    },
  })

  // Read logo file
  let logoBuffer: Buffer
  try {
    logoBuffer = await readFile(
      join(process.cwd(), 'public', 'icons', 'logoheader.png')
    )
  } catch {
    // If logo not found, return QR without logo
    return qrBuffer
  }

  // Calculate logo dimensions
  const logoTargetSize = Math.round(size * LOGO_SIZE_RATIO)
  const backgroundPadding = Math.round(logoTargetSize * 0.15)
  const bgSize = logoTargetSize + backgroundPadding * 2

  // Resize logo
  const resizedLogo = await sharp(logoBuffer)
    .resize(logoTargetSize, logoTargetSize, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .toBuffer()

  // Create circular white background for logo
  const circleRadius = Math.round(bgSize / 2)
  const circleSvg = Buffer.from(
    `<svg width="${bgSize}" height="${bgSize}">
      <circle cx="${circleRadius}" cy="${circleRadius}" r="${circleRadius}" fill="white"/>
    </svg>`
  )

  const circleBackground = await sharp(circleSvg).png().toBuffer()

  // Composite: white circle background + logo on top
  const logoWithBackground = await sharp(circleBackground)
    .composite([
      {
        input: resizedLogo,
        left: backgroundPadding,
        top: backgroundPadding,
      },
    ])
    .png()
    .toBuffer()

  // Composite logo onto QR code center
  const qrCenter = Math.round((size - bgSize) / 2)
  const finalQR = await sharp(qrBuffer)
    .composite([
      {
        input: logoWithBackground,
        left: qrCenter,
        top: qrCenter,
      },
    ])
    .png()
    .toBuffer()

  return finalQR
}

/**
 * Generate QR code as base64 data URL for browser preview
 */
export async function generateQRDataUrl(menuUrl: string): Promise<string> {
  const buffer = await generateStyledQR(menuUrl, 400)
  return `data:image/png;base64,${buffer.toString('base64')}`
}
