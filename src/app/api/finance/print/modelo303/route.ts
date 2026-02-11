import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { getQuarterDateRange } from '@/lib/utils/spanish-tax'
import {
  createPDFDocument,
  addPDFFooter,
  formatCurrency,
} from '@/lib/utils/pdf'
import { NextRequest, NextResponse } from 'next/server'
import type { CompanyFiscalData } from '@/types/expenses'

/**
 * GET /api/finance/print/modelo303
 * Generate Modelo 303 PDF — structured like the official AEAT form
 * Query params: year (number), quarter (1-4)
 * Accessible by: admin, manager, owner
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10)
  const quarter = parseInt(searchParams.get('quarter') || '1', 10)

  if (quarter < 1 || quarter > 4) {
    return NextResponse.json(
      { error: 'Quarter must be between 1 and 4' },
      { status: 400 }
    )
  }

  const { start, end } = getQuarterDateRange(year, quarter)

  try {
    // Fetch IVA Repercutido (sales)
    const { data: salesIVA, error: salesError } = await supabase
      .from('sales_iva_breakdown')
      .select('iva_rate, base_imponible, iva_amount, total')
      .gte('date', start)
      .lte('date', end)

    if (salesError) {
      return NextResponse.json(
        { error: 'Failed to fetch sales IVA data', details: salesError.message },
        { status: 500 }
      )
    }

    // Fetch IVA Soportado (deductible expenses)
    const { data: expenses, error: expensesError } = await supabase
      .from('overhead_expenses')
      .select('category, iva_rate, iva_amount, base_imponible')
      .eq('is_deductible', true)
      .gte('date', start)
      .lte('date', end)

    if (expensesError) {
      return NextResponse.json(
        { error: 'Failed to fetch expense IVA data', details: expensesError.message },
        { status: 500 }
      )
    }

    // Fetch company fiscal data
    const { data: settings } = await supabase
      .from('restaurant_settings')
      .select('value')
      .eq('key', 'company_fiscal')
      .single()

    const fiscalData: CompanyFiscalData = settings?.value || {
      razon_social: 'GrandCafe Cheers S.L.',
      cif: 'B12345678',
      direccion: 'Carrer de Cartago 22, El Arenal',
      codigo_postal: '07600',
      ciudad: 'Mallorca',
      provincia: 'Illes Balears',
      pais: 'Spain',
      telefono: '',
      email: '',
    }

    // Calculate by rate
    const byRate = (salesIVA || []).reduce(
      (acc, row) => {
        const rate = row.iva_rate || 0
        const key = String(rate)
        if (!acc[key]) acc[key] = { rate, base: 0, iva: 0 }
        acc[key].base += row.base_imponible || 0
        acc[key].iva += row.iva_amount || 0
        return acc
      },
      {} as Record<string, { rate: number; base: number; iva: number }>
    )

    const soportadoByCategory = (expenses || []).reduce(
      (acc, row) => {
        const cat = row.category || 'other'
        if (!acc[cat]) acc[cat] = { category: cat, base: 0, iva: 0 }
        acc[cat].base += row.base_imponible || 0
        acc[cat].iva += row.iva_amount || 0
        return acc
      },
      {} as Record<string, { category: string; base: number; iva: number }>
    )

    // Casillas del Modelo 303
    const c01 = byRate['4']?.base || 0   // Base superreducido 4%
    const c02 = 4                          // Tipo 4%
    const c03 = byRate['4']?.iva || 0     // Cuota superreducido
    const c04 = byRate['10']?.base || 0   // Base reducido 10%
    const c05 = 10                         // Tipo 10%
    const c06 = byRate['10']?.iva || 0    // Cuota reducido
    const c07 = byRate['21']?.base || 0   // Base general 21%
    const c08 = 21                         // Tipo 21%
    const c09 = byRate['21']?.iva || 0    // Cuota general
    const c27 = c03 + c06 + c09           // Total cuotas devengadas
    const totalBaseRepercutido = c01 + c04 + c07

    const ivaSoportadoBase = Object.values(soportadoByCategory).reduce((s, c) => s + c.base, 0)
    const c29 = Object.values(soportadoByCategory).reduce((s, c) => s + c.iva, 0)  // Cuotas soportadas
    const c45 = c29                        // Total a deducir
    const c46 = c27 - c45                  // Diferencia
    const c64 = 0                          // Cuotas a compensar periodos anteriores
    const c66 = c46 - c64                  // Resultado regimen general
    const c69 = 0                          // Otros regimenes
    const c71 = c66 + c69                  // Resultado de la liquidacion

    // Generate PDF
    const pdfBuffer = await generatePDF({
      year, quarter, start: start, end: end, fiscalData,
      c01, c02, c03, c04, c05, c06, c07, c08, c09,
      c27, c29, c45, c46, c64, c66, c69, c71,
      totalBaseRepercutido, ivaSoportadoBase,
      repercutidoByRate: Object.values(byRate),
      soportadoByCategory: Object.values(soportadoByCategory),
    })

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="modelo-303-${quarter}T-${year}.pdf"`,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Modelo 303 PDF generation error:', message)
    return NextResponse.json(
      { error: 'Failed to generate Modelo 303 PDF', details: message },
      { status: 500 }
    )
  }
}

interface PDFData {
  year: number; quarter: number; start: string; end: string
  fiscalData: CompanyFiscalData
  c01: number; c02: number; c03: number
  c04: number; c05: number; c06: number
  c07: number; c08: number; c09: number
  c27: number; c29: number; c45: number; c46: number
  c64: number; c66: number; c69: number; c71: number
  totalBaseRepercutido: number; ivaSoportadoBase: number
  repercutidoByRate: Array<{ rate: number; base: number; iva: number }>
  soportadoByCategory: Array<{ category: string; base: number; iva: number }>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = any

function drawAEATHeader(doc: Doc, data: PDFData) {
  // Dark blue header bar
  doc.rect(50, 40, doc.page.width - 100, 60).fill('#003366')
  doc.fontSize(10).font('Helvetica').fillColor('#ffffff')
    .text('MINISTERIO DE HACIENDA', 60, 48)
  doc.fontSize(14).font('Helvetica-Bold')
    .text('AGENCIA TRIBUTARIA', 60, 62)
  doc.fontSize(28).font('Helvetica-Bold')
    .text('303', doc.page.width - 130, 52)

  // Form title
  doc.fillColor('#003366').fontSize(14).font('Helvetica-Bold')
    .text('Impuesto sobre el Valor Anadido — Autoliquidacion', 50, 110)
  doc.fontSize(10).font('Helvetica').fillColor('#666666')
    .text(`Ejercicio: ${data.year}    Periodo: ${data.quarter}T    (${data.start} a ${data.end})`, 50, 130)

  // Declarant identification box
  doc.rect(50, 150, doc.page.width - 100, 45).lineWidth(1).stroke('#cccccc')
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#003366')
    .text('IDENTIFICACION DEL SUJETO PASIVO', 60, 155)
  doc.fontSize(9).font('Helvetica').fillColor('#000000')
    .text(`NIF/CIF: ${data.fiscalData.cif}`, 60, 170)
    .text(`Razon social: ${data.fiscalData.razon_social}`, 200, 170)
    .text(`${data.fiscalData.direccion}, ${data.fiscalData.codigo_postal} ${data.fiscalData.ciudad}`, 60, 183)
}

function drawCasillaRow(doc: Doc, y: number, casilla: string, label: string, value: number, options?: { bold?: boolean; color?: string }) {
  const w = doc.page.width - 100
  // Casilla number box
  doc.rect(50, y, 35, 18).lineWidth(0.5).stroke('#999999')
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#003366').text(casilla, 53, y + 5)
  // Label
  doc.fontSize(8).font(options?.bold ? 'Helvetica-Bold' : 'Helvetica')
    .fillColor(options?.color || '#000000')
    .text(label, 90, y + 4, { width: w - 150 })
  // Value
  doc.fontSize(9).font(options?.bold ? 'Helvetica-Bold' : 'Helvetica')
    .fillColor(options?.color || '#000000')
    .text(formatCurrency(value), w - 60, y + 4, { width: 110, align: 'right' })
}

function drawSectionHeader(doc: Doc, y: number, title: string): number {
  doc.rect(50, y, doc.page.width - 100, 18).fill('#e8f0fe')
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#003366')
    .text(title, 55, y + 4)
  return y + 22
}

async function generatePDF(data: PDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = createPDFDocument()
      const chunks: Buffer[] = []
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // === PAGE 1: HEADER + IVA DEVENGADO + IVA DEDUCIBLE ===
      drawAEATHeader(doc, data)

      let y = 205

      // IVA DEVENGADO (Regimen General)
      y = drawSectionHeader(doc, y, 'IVA DEVENGADO — Regimen General')

      // Column headers
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#666666')
        .text('Casilla', 55, y).text('Concepto', 95, y)
        .text('Base Imponible', 330, y).text('Tipo %', 410, y).text('Cuota', 460, y)
      y += 14

      // Rate rows
      const rates = [
        { casillas: ['01', '02', '03'], label: 'Regimen general — Superreducido (4%)', base: data.c01, rate: data.c02, cuota: data.c03 },
        { casillas: ['04', '05', '06'], label: 'Regimen general — Reducido (10%)', base: data.c04, rate: data.c05, cuota: data.c06 },
        { casillas: ['07', '08', '09'], label: 'Regimen general — General (21%)', base: data.c07, rate: data.c08, cuota: data.c09 },
      ]

      for (const r of rates) {
        doc.rect(50, y, doc.page.width - 100, 20).lineWidth(0.3).stroke('#dddddd')
        doc.fontSize(7).font('Helvetica').fillColor('#003366')
          .text(`[${r.casillas[0]}][${r.casillas[1]}][${r.casillas[2]}]`, 52, y + 3)
        doc.fontSize(8).font('Helvetica').fillColor('#000000')
          .text(r.label, 115, y + 5)
        doc.fontSize(9).font('Helvetica')
          .text(formatCurrency(r.base), 300, y + 5, { width: 80, align: 'right' })
          .text(`${r.rate}%`, 395, y + 5, { width: 40, align: 'right' })
          .text(formatCurrency(r.cuota), 445, y + 5, { width: 90, align: 'right' })
        y += 22
      }

      // Total devengado
      y += 4
      drawCasillaRow(doc, y, '27', 'Total cuotas devengadas', data.c27, { bold: true, color: '#003366' })
      y += 26

      // IVA DEDUCIBLE
      y = drawSectionHeader(doc, y, 'IVA DEDUCIBLE')

      // Soportado breakdown by category
      if (data.soportadoByCategory.length > 0) {
        for (const cat of data.soportadoByCategory) {
          doc.rect(50, y, doc.page.width - 100, 18).lineWidth(0.3).stroke('#dddddd')
          doc.fontSize(8).font('Helvetica').fillColor('#000000')
            .text(cat.category, 60, y + 4, { width: 200 })
            .text(formatCurrency(cat.base), 300, y + 4, { width: 80, align: 'right' })
            .text(formatCurrency(cat.iva), 445, y + 4, { width: 90, align: 'right' })
          y += 20
        }
      }

      drawCasillaRow(doc, y, '29', 'Por cuotas soportadas en operaciones interiores corrientes', data.c29)
      y += 22
      drawCasillaRow(doc, y, '45', 'Total a deducir', data.c45, { bold: true, color: '#003366' })
      y += 30

      // RESULTADO
      y = drawSectionHeader(doc, y, 'RESULTADO')
      drawCasillaRow(doc, y, '46', 'Diferencia [27] - [45]', data.c46, { bold: true })
      y += 22
      drawCasillaRow(doc, y, '64', 'Cuotas a compensar de periodos anteriores', data.c64)
      y += 22
      drawCasillaRow(doc, y, '66', 'Resultado regimen general', data.c66, { bold: true })
      y += 22
      drawCasillaRow(doc, y, '69', 'Suma de resultados (otros regimenes)', data.c69)
      y += 26

      // Final result - highlighted
      const resultColor = data.c71 >= 0 ? '#cc0000' : '#006600'
      doc.rect(50, y, doc.page.width - 100, 30).fill(data.c71 >= 0 ? '#fff0f0' : '#f0fff0')
      drawCasillaRow(doc, y + 5, '71', 'RESULTADO DE LA LIQUIDACION', data.c71, { bold: true, color: resultColor })
      doc.fontSize(9).font('Helvetica').fillColor(resultColor)
        .text(data.c71 >= 0 ? '(A ingresar)' : '(A compensar)', 400, y + 20)
      y += 40

      // Filing deadline
      const deadlines: Record<number, string> = { 1: '20 de abril', 2: '20 de julio', 3: '20 de octubre', 4: '30 de enero' }
      doc.fontSize(8).font('Helvetica').fillColor('#666666')
        .text(`Plazo de presentacion: ${deadlines[data.quarter]} de ${data.quarter === 4 ? data.year + 1 : data.year}`, 50, y + 5)
      y += 20

      // Disclaimer
      doc.fontSize(8).font('Helvetica').fillColor('#999999')
        .text('BORRADOR — Este documento es un calculo generado automaticamente por GrandCafe Cheers Management Platform.', 50, y)
        .text('Consulte con su asesor fiscal antes de presentar la declaracion oficial ante la Agencia Tributaria.', 50, y + 12)
        .text(`Generado: ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`, 50, y + 24)

      addPDFFooter(doc)
      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
