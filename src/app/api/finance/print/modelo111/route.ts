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
 * GET /api/finance/print/modelo111
 * Generate Modelo 111 PDF — structured like the official AEAT form
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
    // Fetch employees with IRPF retention
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, profiles(full_name), gross_salary, irpf_retention')
      .gt('irpf_retention', 0)
      .gt('gross_salary', 0)

    if (empError) {
      return NextResponse.json(
        { error: 'Failed to fetch employee data', details: empError.message },
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

    const MONTHS_IN_QUARTER = 3
    const employeeBreakdown = (employees || []).map((emp) => {
      const profile = (emp.profiles as { full_name: string }[] | null)?.[0] ?? null
      const grossSalary = emp.gross_salary || 0
      const irpfRate = emp.irpf_retention || 0
      const irpfAmount = Math.round(grossSalary * (irpfRate / 100) * MONTHS_IN_QUARTER * 100) / 100
      return {
        name: profile?.full_name || 'Unknown',
        gross_salary: grossSalary,
        irpf_rate: irpfRate,
        irpf_amount: irpfAmount,
        quarterly_gross: Math.round(grossSalary * MONTHS_IN_QUARTER * 100) / 100,
      }
    })

    // Casillas del Modelo 111 - Section I: Rendimientos del trabajo
    const campo01 = employeeBreakdown.length                           // Nro de perceptores
    const campo02 = employeeBreakdown.reduce((s, e) => s + e.quarterly_gross, 0) // Base retenciones
    const campo03 = employeeBreakdown.reduce((s, e) => s + e.irpf_amount, 0)     // Retenciones practicadas

    // Sections II-V = 0 (restaurant only has payroll)
    const campo04 = 0  // Nro perceptores actividades economicas
    const campo05 = 0  // Base actividades economicas
    const campo06 = 0  // Retenciones actividades economicas
    const campo07 = 0  // Nro perceptores premios
    const campo08 = 0  // Base premios
    const campo09 = 0  // Retenciones premios
    const campo10 = 0  // Nro perceptores ganancias
    const campo11 = 0  // Base ganancias
    const campo12 = 0  // Retenciones ganancias
    const campo13 = 0  // Nro perceptores imputaciones renta
    const campo14 = 0  // Base imputaciones
    const campo15 = 0  // Retenciones imputaciones

    // Totals
    const campo28 = campo03 + campo06 + campo09 + campo12 + campo15 // Total retenciones
    const campo30 = campo28 // Resultado de la liquidacion (sin compensaciones)

    const pdfBuffer = await generatePDF({
      year, quarter, start, end, fiscalData,
      employeeBreakdown,
      campo01, campo02, campo03,
      campo04, campo05, campo06,
      campo07, campo08, campo09,
      campo10, campo11, campo12,
      campo13, campo14, campo15,
      campo28, campo30,
    })

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="modelo-111-${quarter}T-${year}.pdf"`,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Modelo 111 PDF generation error:', message)
    return NextResponse.json(
      { error: 'Failed to generate Modelo 111 PDF', details: message },
      { status: 500 }
    )
  }
}

interface PDFData {
  year: number; quarter: number; start: string; end: string
  fiscalData: CompanyFiscalData
  employeeBreakdown: Array<{ name: string; gross_salary: number; irpf_rate: number; irpf_amount: number; quarterly_gross: number }>
  campo01: number; campo02: number; campo03: number
  campo04: number; campo05: number; campo06: number
  campo07: number; campo08: number; campo09: number
  campo10: number; campo11: number; campo12: number
  campo13: number; campo14: number; campo15: number
  campo28: number; campo30: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = any

function drawSectionHeader(doc: Doc, y: number, title: string): number {
  doc.rect(50, y, doc.page.width - 100, 18).fill('#fff3e0')
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#cc6600')
    .text(title, 55, y + 4)
  return y + 22
}

function drawFormRow(doc: Doc, y: number, casilla: string, label: string, value: number | string, options?: { bold?: boolean; isCount?: boolean }) {
  const w = doc.page.width - 100
  doc.rect(50, y, 35, 18).lineWidth(0.5).stroke('#999999')
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#cc6600').text(casilla, 53, y + 5)
  doc.fontSize(8).font(options?.bold ? 'Helvetica-Bold' : 'Helvetica').fillColor('#000000')
    .text(label, 90, y + 4, { width: w - 150 })
  const displayValue = options?.isCount ? String(value) : formatCurrency(value as number)
  doc.fontSize(9).font(options?.bold ? 'Helvetica-Bold' : 'Helvetica').fillColor('#000000')
    .text(displayValue, w - 60, y + 4, { width: 110, align: 'right' })
}

async function generatePDF(data: PDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = createPDFDocument()
      const chunks: Buffer[] = []
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // === HEADER ===
      doc.rect(50, 40, doc.page.width - 100, 60).fill('#cc6600')
      doc.fontSize(10).font('Helvetica').fillColor('#ffffff')
        .text('MINISTERIO DE HACIENDA', 60, 48)
      doc.fontSize(14).font('Helvetica-Bold')
        .text('AGENCIA TRIBUTARIA', 60, 62)
      doc.fontSize(28).font('Helvetica-Bold')
        .text('111', doc.page.width - 130, 52)

      doc.fillColor('#cc6600').fontSize(13).font('Helvetica-Bold')
        .text('Retenciones e ingresos a cuenta del IRPF', 50, 110)
      doc.fontSize(10).font('Helvetica').fillColor('#666666')
        .text(`Ejercicio: ${data.year}    Periodo: ${data.quarter}T    (${data.start} a ${data.end})`, 50, 128)

      // Declarant box
      doc.rect(50, 148, doc.page.width - 100, 40).lineWidth(1).stroke('#cccccc')
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#cc6600')
        .text('IDENTIFICACION DEL DECLARANTE', 60, 153)
      doc.fontSize(9).font('Helvetica').fillColor('#000000')
        .text(`NIF/CIF: ${data.fiscalData.cif}`, 60, 167)
        .text(`Razon social: ${data.fiscalData.razon_social}`, 200, 167)
        .text(`${data.fiscalData.direccion}, ${data.fiscalData.codigo_postal} ${data.fiscalData.ciudad}`, 60, 179)

      let y = 200

      // === SECTION I: Rendimientos del trabajo ===
      y = drawSectionHeader(doc, y, 'I. RENDIMIENTOS DEL TRABAJO')
      drawFormRow(doc, y, '01', 'Numero de perceptores', data.campo01, { isCount: true })
      y += 22
      drawFormRow(doc, y, '02', 'Importe de las percepciones', data.campo02)
      y += 22
      drawFormRow(doc, y, '03', 'Importe de las retenciones', data.campo03)
      y += 28

      // Employee detail table
      if (data.employeeBreakdown.length > 0) {
        doc.rect(50, y, doc.page.width - 100, 16).fill('#f5f5f5')
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#333333')
          .text('EMPLEADO', 58, y + 4)
          .text('SALARIO MENSUAL', 220, y + 4)
          .text('IRPF %', 340, y + 4)
          .text('SALARIO TRIM.', 400, y + 4)
          .text('RETENCION TRIM.', 480, y + 4)
        y += 18

        for (const emp of data.employeeBreakdown) {
          doc.rect(50, y, doc.page.width - 100, 16).lineWidth(0.3).stroke('#eeeeee')
          doc.fontSize(8).font('Helvetica').fillColor('#000000')
            .text(emp.name, 58, y + 3, { width: 150 })
            .text(formatCurrency(emp.gross_salary), 205, y + 3, { width: 80, align: 'right' })
            .text(`${emp.irpf_rate}%`, 340, y + 3, { width: 40, align: 'right' })
            .text(formatCurrency(emp.quarterly_gross), 385, y + 3, { width: 80, align: 'right' })
            .text(formatCurrency(emp.irpf_amount), 470, y + 3, { width: 80, align: 'right' })
          y += 17
        }
        y += 8
      }

      // === SECTION II-V (zeros for restaurant) ===
      y = drawSectionHeader(doc, y, 'II. RENDIM. ACTIVIDADES ECONOMICAS / III. PREMIOS / IV. GANANCIAS / V. IMPUTACIONES')
      doc.fontSize(8).font('Helvetica').fillColor('#999999')
        .text('Casillas [04]-[15]: Sin datos (no aplica a restauracion)', 60, y + 2)
      y += 20

      // === TOTALS ===
      y = drawSectionHeader(doc, y, 'TOTAL LIQUIDACION')
      drawFormRow(doc, y, '28', 'Suma de retenciones e ingresos a cuenta [03]+[06]+[09]+[12]+[15]', data.campo28, { bold: true })
      y += 26

      // Result - highlighted
      const resultColor = '#cc6600'
      doc.rect(50, y, doc.page.width - 100, 28).fill('#fff8f0')
      drawFormRow(doc, y + 4, '30', 'RESULTADO DE LA LIQUIDACION', data.campo30, { bold: true })
      doc.fontSize(9).font('Helvetica-Bold').fillColor(resultColor)
        .text('(A ingresar)', 420, y + 18)
      y += 38

      // Filing deadline
      const deadlines: Record<number, string> = { 1: '20 de abril', 2: '20 de julio', 3: '20 de octubre', 4: '30 de enero' }
      doc.fontSize(8).font('Helvetica').fillColor('#666666')
        .text(`Plazo de presentacion: ${deadlines[data.quarter]} de ${data.quarter === 4 ? data.year + 1 : data.year}`, 50, y + 5)
      y += 22

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
