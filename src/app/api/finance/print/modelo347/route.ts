import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { MODELO_347_THRESHOLD } from '@/lib/utils/spanish-tax'
import {
  createPDFDocument,
  addPDFFooter,
  formatCurrency,
} from '@/lib/utils/pdf'
import { NextRequest, NextResponse } from 'next/server'
import type { CompanyFiscalData } from '@/types/expenses'

/**
 * GET /api/finance/print/modelo347
 * Generate Modelo 347 PDF — structured like the official AEAT form
 * Query params: year (number)
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

  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`

  try {
    // Fetch overhead expenses for the year with quarterly breakdown
    const { data: expenses, error: expError } = await supabase
      .from('overhead_expenses')
      .select('supplier_nif, vendor, amount, date')
      .gte('date', startDate)
      .lte('date', endDate)
      .not('supplier_nif', 'is', null)

    if (expError) {
      return NextResponse.json(
        { error: 'Failed to fetch expense data', details: expError.message },
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

    // Group by supplier with quarterly breakdown
    const supplierData = (expenses || []).reduce(
      (acc, expense) => {
        const nif = expense.supplier_nif
        if (!nif) return acc
        if (!acc[nif]) {
          acc[nif] = { nif, name: expense.vendor || 'Unknown', total: 0, q1: 0, q2: 0, q3: 0, q4: 0 }
        }
        const month = new Date(expense.date).getMonth()
        const amount = expense.amount || 0
        acc[nif].total += amount
        if (month < 3) acc[nif].q1 += amount
        else if (month < 6) acc[nif].q2 += amount
        else if (month < 9) acc[nif].q3 += amount
        else acc[nif].q4 += amount
        return acc
      },
      {} as Record<string, { nif: string; name: string; total: number; q1: number; q2: number; q3: number; q4: number }>
    )

    const suppliers = Object.values(supplierData)
      .filter(s => s.total > MODELO_347_THRESHOLD)
      .map(s => ({
        ...s,
        total: Math.round(s.total * 100) / 100,
        q1: Math.round(s.q1 * 100) / 100,
        q2: Math.round(s.q2 * 100) / 100,
        q3: Math.round(s.q3 * 100) / 100,
        q4: Math.round(s.q4 * 100) / 100,
      }))
      .sort((a, b) => b.total - a.total)

    const totalAmount = suppliers.reduce((sum, s) => sum + s.total, 0)

    const pdfBuffer = await generatePDF({
      year, startDate, endDate, fiscalData, suppliers, totalAmount,
    })

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="modelo-347-${year}.pdf"`,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Modelo 347 PDF generation error:', message)
    return NextResponse.json(
      { error: 'Failed to generate Modelo 347 PDF', details: message },
      { status: 500 }
    )
  }
}

interface SupplierRow {
  nif: string; name: string; total: number
  q1: number; q2: number; q3: number; q4: number
}

interface PDFData {
  year: number; startDate: string; endDate: string
  fiscalData: CompanyFiscalData
  suppliers: SupplierRow[]
  totalAmount: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = any

function drawSectionHeader(doc: Doc, y: number, title: string): number {
  doc.rect(50, y, doc.page.width - 100, 18).fill('#f3e8ff')
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#660099')
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

      // === HEADER ===
      doc.rect(50, 40, doc.page.width - 100, 60).fill('#660099')
      doc.fontSize(10).font('Helvetica').fillColor('#ffffff')
        .text('MINISTERIO DE HACIENDA', 60, 48)
      doc.fontSize(14).font('Helvetica-Bold')
        .text('AGENCIA TRIBUTARIA', 60, 62)
      doc.fontSize(28).font('Helvetica-Bold')
        .text('347', doc.page.width - 130, 52)

      doc.fillColor('#660099').fontSize(13).font('Helvetica-Bold')
        .text('Declaracion anual de operaciones con terceras personas', 50, 110)
      doc.fontSize(10).font('Helvetica').fillColor('#666666')
        .text(`Ejercicio: ${data.year}    (${data.startDate} a ${data.endDate})`, 50, 128)

      // Declarant box
      doc.rect(50, 148, doc.page.width - 100, 40).lineWidth(1).stroke('#cccccc')
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#660099')
        .text('DATOS DEL DECLARANTE', 60, 153)
      doc.fontSize(9).font('Helvetica').fillColor('#000000')
        .text(`NIF/CIF: ${data.fiscalData.cif}`, 60, 167)
        .text(`Razon social: ${data.fiscalData.razon_social}`, 200, 167)
        .text(`${data.fiscalData.direccion}, ${data.fiscalData.codigo_postal} ${data.fiscalData.ciudad}`, 60, 179)
      if (data.fiscalData.telefono) {
        doc.text(`Tel: ${data.fiscalData.telefono}`, 400, 179)
      }

      let y = 200

      // === RESUMEN ===
      y = drawSectionHeader(doc, y, 'RESUMEN DE LA DECLARACION')

      doc.rect(50, y, doc.page.width - 100, 50).lineWidth(0.5).stroke('#dddddd')
      doc.fontSize(9).font('Helvetica').fillColor('#000000')
      doc.text('Numero de declarados:', 60, y + 8)
      doc.font('Helvetica-Bold').text(String(data.suppliers.length), 220, y + 8)
      doc.font('Helvetica').text('Importe total de las operaciones:', 60, y + 24)
      doc.font('Helvetica-Bold').text(formatCurrency(data.totalAmount), 220, y + 24)
      doc.font('Helvetica').text('Umbral de declaracion:', 60, y + 38)
      doc.font('Helvetica-Bold').text(formatCurrency(MODELO_347_THRESHOLD), 220, y + 38)
      y += 58

      // === RELACION DE DECLARADOS ===
      y = drawSectionHeader(doc, y, 'RELACION DE DECLARADOS — Clave A (Compras)')

      if (data.suppliers.length > 0) {
        // Table header
        doc.rect(50, y, doc.page.width - 100, 18).fill('#f9f5ff')
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#333333')
          .text('NIF', 55, y + 5)
          .text('PROVEEDOR', 115, y + 5)
          .text('1T', 310, y + 5)
          .text('2T', 360, y + 5)
          .text('3T', 410, y + 5)
          .text('4T', 460, y + 5)
          .text('TOTAL ANUAL', 490, y + 5)
        y += 20

        for (const supplier of data.suppliers) {
          // Check if we need a new page
          if (y > doc.page.height - 100) {
            doc.addPage()
            y = 50
          }

          doc.rect(50, y, doc.page.width - 100, 18).lineWidth(0.3).stroke('#eeeeee')
          doc.fontSize(7).font('Helvetica').fillColor('#000000')
            .text(supplier.nif, 55, y + 5, { width: 55 })
          doc.fontSize(7)
            .text(supplier.name, 115, y + 5, { width: 190 })
            .text(formatCurrency(supplier.q1), 290, y + 5, { width: 60, align: 'right' })
            .text(formatCurrency(supplier.q2), 340, y + 5, { width: 60, align: 'right' })
            .text(formatCurrency(supplier.q3), 390, y + 5, { width: 60, align: 'right' })
            .text(formatCurrency(supplier.q4), 440, y + 5, { width: 60, align: 'right' })
          doc.font('Helvetica-Bold')
            .text(formatCurrency(supplier.total), 490, y + 5, { width: 55, align: 'right' })
          y += 20
        }

        // Total row
        y += 4
        doc.rect(50, y, doc.page.width - 100, 22).fill('#f3e8ff')
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#660099')
          .text('TOTAL', 60, y + 6)
          .text(formatCurrency(data.totalAmount), 440, y + 6, { width: 105, align: 'right' })
        y += 30
      } else {
        doc.fontSize(9).font('Helvetica').fillColor('#666666')
          .text('No hay proveedores con operaciones superiores al umbral de declaracion.', 60, y + 5)
        y += 25
      }

      // Filing info
      doc.fontSize(8).font('Helvetica').fillColor('#666666')
        .text(`Plazo de presentacion: 28 de febrero de ${data.year + 1}`, 50, y + 5)
      y += 25

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
