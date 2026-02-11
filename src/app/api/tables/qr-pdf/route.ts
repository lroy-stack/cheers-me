import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { generateStyledQR } from '@/lib/utils/qr-code'
import { NextRequest, NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { readFile } from 'fs/promises'
import { join } from 'path'

// A4 dimensions in points (72 points per inch)
const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 40
const COLS = 2
const ROWS = 3
const CELLS_PER_PAGE = COLS * ROWS

// Corporate colors
const NAVY = '#1a1a2e'
const GOLD = '#c9a84c'

/**
 * GET /api/tables/qr-pdf
 * Generate A4 PDF with all styled QR codes (managers/admins only)
 */
export async function GET(_request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()

  // Fetch all tables with their sections
  const { data: tables, error: tablesError } = await supabase
    .from('tables')
    .select('id, table_number, section_id, qr_generated_at, qr_code_url')
    .order('table_number', { ascending: true })

  if (tablesError) {
    return NextResponse.json({ error: tablesError.message }, { status: 500 })
  }

  // Fetch floor sections
  const { data: sections } = await supabase
    .from('floor_sections')
    .select('id, name')
    .order('sort_order', { ascending: true })

  const sectionMap = new Map(
    (sections || []).map((s) => [s.id, s.name])
  )

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheersmallorca.com'

  // Read logo for header
  let logoBuffer: Buffer | null = null
  try {
    logoBuffer = await readFile(
      join(process.cwd(), 'public', 'icons', 'logoheader.png')
    )
  } catch {
    // Logo optional
  }

  // Create PDF
  const doc = new PDFDocument({
    size: 'A4',
    margin: MARGIN,
    info: {
      Title: 'GrandCafe Cheers - Table QR Codes',
      Author: 'GrandCafe Cheers Mallorca',
      CreationDate: new Date(),
    },
  })

  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))

  const usableWidth = PAGE_WIDTH - MARGIN * 2
  const cellWidth = usableWidth / COLS
  const headerHeight = 80
  const footerHeight = 30
  const usableHeight = PAGE_HEIGHT - MARGIN * 2 - headerHeight - footerHeight
  const cellHeight = usableHeight / ROWS
  const qrSize = Math.min(cellWidth - 30, cellHeight - 60)

  // Generate QR images for all tables
  const qrImages: Map<string, Buffer> = new Map()
  for (const table of tables || []) {
    const menuUrl = `${baseUrl}/menu/digital?table=${table.table_number}`
    try {
      const qrBuffer = await generateStyledQR(menuUrl, 400)
      qrImages.set(table.id, qrBuffer)
    } catch {
      // Skip failed QR generation
    }
  }

  const allTables = tables || []
  const totalPages = Math.ceil(allTables.length / CELLS_PER_PAGE)
  const generatedDate = new Date().toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    if (pageIdx > 0) doc.addPage()

    // Header
    const headerY = MARGIN
    if (logoBuffer) {
      doc.image(logoBuffer, MARGIN, headerY, { width: 40, height: 40 })
    }
    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor(NAVY)
      .text(
        'GrandCafe Cheers — Table QR Codes',
        MARGIN + 50,
        headerY + 5,
        { width: usableWidth - 50 }
      )
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#666666')
      .text(`Generated: ${generatedDate}`, MARGIN + 50, headerY + 25, {
        width: usableWidth - 50,
      })

    // Gold line under header
    doc
      .moveTo(MARGIN, headerY + 50)
      .lineTo(PAGE_WIDTH - MARGIN, headerY + 50)
      .strokeColor(GOLD)
      .lineWidth(2)
      .stroke()

    // Cells
    const startIdx = pageIdx * CELLS_PER_PAGE
    const pageTables = allTables.slice(startIdx, startIdx + CELLS_PER_PAGE)

    for (let cellIdx = 0; cellIdx < pageTables.length; cellIdx++) {
      const table = pageTables[cellIdx]
      const col = cellIdx % COLS
      const row = Math.floor(cellIdx / COLS)

      const cellX = MARGIN + col * cellWidth
      const cellY = MARGIN + headerHeight + row * cellHeight

      // Section name
      const sectionName = sectionMap.get(table.section_id) || 'Unknown'
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#888888')
        .text(sectionName, cellX + 5, cellY + 5, {
          width: cellWidth - 10,
          align: 'center',
        })

      // Table number
      doc
        .font('Helvetica-Bold')
        .fontSize(20)
        .fillColor(NAVY)
        .text(table.table_number, cellX + 5, cellY + 18, {
          width: cellWidth - 10,
          align: 'center',
        })

      // QR code image
      const qrBuffer = qrImages.get(table.id)
      if (qrBuffer) {
        const qrX = cellX + (cellWidth - qrSize) / 2
        const qrY = cellY + 45
        doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize })
      }

      // Version badge
      const badgeY = cellY + 45 + qrSize + 5
      if (table.qr_generated_at) {
        const genDate = new Date(table.qr_generated_at)
        const hoursSinceGen =
          (Date.now() - genDate.getTime()) / (1000 * 60 * 60)

        if (hoursSinceGen < 24) {
          doc
            .font('Helvetica-Bold')
            .fontSize(7)
            .fillColor('#16a34a')
            .text('NEW', cellX + 5, badgeY, {
              width: cellWidth - 10,
              align: 'center',
            })
        } else {
          doc
            .font('Helvetica')
            .fontSize(7)
            .fillColor('#888888')
            .text(
              genDate.toLocaleDateString('en-GB'),
              cellX + 5,
              badgeY,
              { width: cellWidth - 10, align: 'center' }
            )
        }
      }

      // Menu URL text
      const menuUrl = `${baseUrl}/menu/digital?table=${table.table_number}`
      doc
        .font('Helvetica')
        .fontSize(6)
        .fillColor('#aaaaaa')
        .text(menuUrl, cellX + 5, badgeY + 10, {
          width: cellWidth - 10,
          align: 'center',
        })
    }

    // Footer
    const footerY = PAGE_HEIGHT - MARGIN - footerHeight + 10
    doc
      .moveTo(MARGIN, footerY)
      .lineTo(PAGE_WIDTH - MARGIN, footerY)
      .strokeColor('#eeeeee')
      .lineWidth(0.5)
      .stroke()
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#999999')
      .text(
        `Page ${pageIdx + 1} of ${totalPages}`,
        MARGIN,
        footerY + 5,
        { width: usableWidth, align: 'center' }
      )
  }

  doc.end()

  // Wait for all chunks
  const pdfBuffer = await new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="cheers-qr-codes-${new Date().toISOString().split('T')[0]}.pdf"`,
    },
  })
}
