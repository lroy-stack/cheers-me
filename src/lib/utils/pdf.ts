/**
 * PDF Generation Utilities
 * Using PDFKit for server-side PDF generation
 */

import PDFDocumentCtor from 'pdfkit'

type PDFDocument = InstanceType<typeof PDFDocumentCtor>

export interface PDFReportOptions {
  title: string
  subtitle?: string
  period?: {
    start: string
    end: string
  }
  generatedAt?: Date
}

export interface PDFTableColumn {
  header: string
  dataKey: string
  width?: number
  align?: 'left' | 'center' | 'right'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  format?: (value: any) => string
}

export interface PDFSection {
  title: string
  data: Array<{ label: string; value: string | number }>
}

/**
 * Create a new PDF document with GrandCafe Cheers branding
 */
export function createPDFDocument(): PDFDocument {
  return new PDFDocumentCtor({
    size: 'A4',
    margins: {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50,
    },
    info: {
      Title: 'GrandCafe Cheers Financial Report',
      Author: 'GrandCafe Cheers Management Platform',
      Creator: 'GrandCafe Cheers App',
    },
  })
}

/**
 * Add header to PDF
 */
export function addPDFHeader(
  doc: PDFDocument,
  options: PDFReportOptions
): PDFDocument {
  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('GrandCafe Cheers', 50, 50)
    .fontSize(10)
    .font('Helvetica')
    .text('Carrer de Cartago 22, El Arenal, Mallorca 07600', 50, 75)
    .moveDown()

  // Report title
  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .text(options.title, 50, 110)

  // Subtitle
  if (options.subtitle) {
    doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor('#666666')
      .text(options.subtitle, 50, 135)
  }

  // Period
  if (options.period) {
    const y = options.subtitle ? 155 : 135
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#999999')
      .text(
        `Period: ${formatDate(options.period.start)} - ${formatDate(options.period.end)}`,
        50,
        y
      )
  }

  // Generated date
  const generatedY = options.period
    ? options.subtitle
      ? 170
      : 150
    : options.subtitle
      ? 150
      : 135
  doc
    .fontSize(9)
    .fillColor('#999999')
    .text(
      `Generated: ${formatDate((options.generatedAt || new Date()).toISOString())}`,
      50,
      generatedY,
      { align: 'right' }
    )

  doc.fillColor('#000000').moveDown(2)

  return doc
}

/**
 * Add a section with key-value pairs
 */
export function addPDFSection(
  doc: PDFDocument,
  section: PDFSection
): PDFDocument {
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .text(section.title)
    .moveDown(0.5)

  section.data.forEach((item) => {
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(item.label, { continued: true, width: 200 })
      .font('Helvetica')
      .text(`: ${item.value}`, { align: 'left' })
  })

  doc.moveDown(1)

  return doc
}

/**
 * Add a table to PDF
 */
export function addPDFTable(
  doc: PDFDocument,
  columns: PDFTableColumn[],
  data: Record<string, unknown>[]
): PDFDocument {
  const tableTop = doc.y
  const pageWidth = doc.page.width - 100 // margins
  const cellPadding = 5
  const rowHeight = 25

  // Calculate column widths
  const totalWidth = columns.reduce((sum, col) => sum + (col.width || 100), 0)
  const widthScale = pageWidth / totalWidth

  let x = 50

  // Draw header
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000')

  columns.forEach((col) => {
    const colWidth = (col.width || 100) * widthScale
    doc.text(col.header, x + cellPadding, tableTop + cellPadding, {
      width: colWidth - cellPadding * 2,
      align: col.align || 'left',
    })
    x += colWidth
  })

  // Draw header line
  doc
    .strokeColor('#cccccc')
    .lineWidth(1)
    .moveTo(50, tableTop + rowHeight)
    .lineTo(doc.page.width - 50, tableTop + rowHeight)
    .stroke()

  // Draw rows
  doc.fontSize(9).font('Helvetica').fillColor('#333333')

  data.forEach((row, rowIndex) => {
    const y = tableTop + rowHeight + rowHeight * (rowIndex + 1)

    // Check if we need a new page
    if (y > doc.page.height - 100) {
      doc.addPage()
      return
    }

    x = 50
    columns.forEach((col) => {
      const colWidth = (col.width || 100) * widthScale
      const value = row[col.dataKey]
      const formattedValue = col.format ? col.format(value) : String(value || '')

      doc.text(formattedValue, x + cellPadding, y + cellPadding, {
        width: colWidth - cellPadding * 2,
        align: col.align || 'left',
      })
      x += colWidth
    })

    // Draw row line
    doc
      .strokeColor('#eeeeee')
      .lineWidth(0.5)
      .moveTo(50, y + rowHeight)
      .lineTo(doc.page.width - 50, y + rowHeight)
      .stroke()
  })

  doc.moveDown(2)

  return doc
}

/**
 * Add footer to PDF
 */
export function addPDFFooter(doc: PDFDocument): PDFDocument {
  const pageCount = doc.bufferedPageRange().count

  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i)

    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#999999')
      .text(
        `Page ${i + 1} of ${pageCount}`,
        50,
        doc.page.height - 50,
        {
          align: 'center',
        }
      )

    doc
      .text('GrandCafe Cheers Management Platform', 50, doc.page.height - 35, {
        align: 'center',
      })
  }

  return doc
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`
}

/**
 * Add company fiscal header (reads from company_fiscal settings)
 */
export function addCompanyFiscalHeader(
  doc: PDFDocument,
  fiscalData: {
    razon_social: string
    cif: string
    direccion: string
    codigo_postal: string
    ciudad: string
    provincia: string
    telefono?: string
    email?: string
  },
  options: PDFReportOptions
): PDFDocument {
  // Company name and CIF
  doc
    .fontSize(18)
    .font('Helvetica-Bold')
    .text(fiscalData.razon_social, 50, 50)
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#333333')
    .text(`CIF: ${fiscalData.cif}`, 50, 73)
    .text(`${fiscalData.direccion}, ${fiscalData.codigo_postal} ${fiscalData.ciudad}`, 50, 87)

  if (fiscalData.telefono || fiscalData.email) {
    const contactParts: string[] = []
    if (fiscalData.telefono) contactParts.push(`Tel: ${fiscalData.telefono}`)
    if (fiscalData.email) contactParts.push(fiscalData.email)
    doc.text(contactParts.join(' | '), 50, 101)
  }

  // Separator line
  const lineY = fiscalData.telefono || fiscalData.email ? 118 : 104
  doc
    .strokeColor('#cccccc')
    .lineWidth(1)
    .moveTo(50, lineY)
    .lineTo(doc.page.width - 50, lineY)
    .stroke()

  // Report title
  const titleY = lineY + 15
  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .fillColor('#000000')
    .text(options.title, 50, titleY)

  if (options.subtitle) {
    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#666666')
      .text(options.subtitle, 50, titleY + 22)
  }

  if (options.period) {
    const periodY = options.subtitle ? titleY + 40 : titleY + 22
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#999999')
      .text(
        `Periodo: ${formatDate(options.period.start)} - ${formatDate(options.period.end)}`,
        50,
        periodY
      )
  }

  // Generated date (right-aligned)
  doc
    .fontSize(9)
    .fillColor('#999999')
    .text(
      `Generado: ${formatDate((options.generatedAt || new Date()).toISOString())}`,
      50,
      titleY,
      { align: 'right' }
    )

  doc.fillColor('#000000').moveDown(3)

  return doc
}

/**
 * Add IVA breakdown table
 */
export function addIVABreakdownTable(
  doc: PDFDocument,
  data: Array<{ category: string; base_imponible: number; iva_rate: number; iva_amount: number; total: number }>
): PDFDocument {
  doc
    .fontSize(13)
    .font('Helvetica-Bold')
    .text('Desglose IVA')
    .moveDown(0.5)

  const columns: PDFTableColumn[] = [
    { header: 'Concepto', dataKey: 'category', width: 120 },
    { header: 'Base Imponible', dataKey: 'base_imponible', width: 90, align: 'right', format: (v) => formatCurrency(v || 0) },
    { header: 'Tipo IVA', dataKey: 'iva_rate', width: 60, align: 'center', format: (v) => `${v}%` },
    { header: 'Cuota IVA', dataKey: 'iva_amount', width: 90, align: 'right', format: (v) => formatCurrency(v || 0) },
    { header: 'Total', dataKey: 'total', width: 90, align: 'right', format: (v) => formatCurrency(v || 0) },
  ]

  // Add totals row
  const totalBase = data.reduce((sum, row) => sum + (row.base_imponible || 0), 0)
  const totalIVA = data.reduce((sum, row) => sum + (row.iva_amount || 0), 0)
  const totalAmount = data.reduce((sum, row) => sum + (row.total || 0), 0)

  const dataWithTotals = [
    ...data,
    { category: 'TOTAL', base_imponible: totalBase, iva_rate: 0, iva_amount: totalIVA, total: totalAmount },
  ]

  addPDFTable(doc, columns, dataWithTotals as unknown as Record<string, unknown>[])

  return doc
}

/**
 * Add signature area to PDF
 */
export function addSignatureArea(
  doc: PDFDocument,
  signatureUrl?: string
): PDFDocument {
  const y = doc.y + 20

  // Check if we need a new page
  if (y > doc.page.height - 150) {
    doc.addPage()
  }

  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#000000')
    .text('Firma:', 50, doc.y + 20)

  if (signatureUrl) {
    // If we have a signature image, draw a placeholder box
    // (actual image embedding would need the image buffer)
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#666666')
      .text('[Firma digital adjunta]', 50, doc.y + 5)
  } else {
    // Draw signature line
    const lineY = doc.y + 50
    doc
      .strokeColor('#cccccc')
      .lineWidth(1)
      .moveTo(50, lineY)
      .lineTo(250, lineY)
      .stroke()

    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#999999')
      .text('Firma', 50, lineY + 5)
  }

  // Date and time
  doc
    .fontSize(8)
    .font('Helvetica')
    .fillColor('#666666')
    .text(
      `Fecha: ${new Date().toLocaleDateString('es-ES')} Hora: ${new Date().toLocaleTimeString('es-ES')}`,
      300,
      doc.y - 15
    )

  doc.moveDown(2)

  return doc
}
