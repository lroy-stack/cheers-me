import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import {
  createPDFDocument,
  addCompanyFiscalHeader,
  addPDFSection,
  addSignatureArea,
  addPDFFooter,
  formatCurrency,
} from '@/lib/utils/pdf'
import { NextRequest, NextResponse } from 'next/server'
import type { CompanyFiscalData } from '@/types/expenses'

/**
 * GET /api/sales/print/register-close
 * Generate register close PDF
 * Query params: close_id (string)
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

  const closeId = searchParams.get('close_id')

  if (!closeId) {
    return NextResponse.json(
      { error: 'close_id is required' },
      { status: 400 }
    )
  }

  try {
    // Fetch register close record
    const { data: registerClose, error: closeError } = await supabase
      .from('register_closes')
      .select('*')
      .eq('id', closeId)
      .single()

    if (closeError) {
      return NextResponse.json(
        { error: 'Failed to fetch register close', details: closeError.message },
        { status: 500 }
      )
    }

    if (!registerClose) {
      return NextResponse.json(
        { error: 'Register close record not found' },
        { status: 404 }
      )
    }

    // Fetch company fiscal data from restaurant_settings
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

    // Generate PDF
    const pdfBuffer = await generateRegisterClosePDF(registerClose, fiscalData)

    const filename = `register-close-${registerClose.date || closeId}.pdf`

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Register close PDF generation error:', message)
    return NextResponse.json(
      { error: 'Failed to generate register close PDF', details: message },
      { status: 500 }
    )
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateRegisterClosePDF(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerClose: any,
  fiscalData: CompanyFiscalData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = createPDFDocument()
      const chunks: Buffer[] = []

      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const closeDate = registerClose.date || new Date().toISOString().split('T')[0]
      const closeTime = registerClose.closed_at
        ? new Date(registerClose.closed_at).toLocaleTimeString('es-ES')
        : ''

      // Add company fiscal header
      addCompanyFiscalHeader(doc, fiscalData, {
        title: 'Cierre de Caja',
        subtitle: `Fecha: ${closeDate}${closeTime ? ` — Hora: ${closeTime}` : ''}`,
        generatedAt: new Date(),
      })

      // Cash amounts section
      const cashExpected = registerClose.cash_expected || 0
      const cashCounted = registerClose.cash_counted || 0
      const cashDifference = cashCounted - cashExpected

      addPDFSection(doc, {
        title: 'Cash',
        data: [
          { label: 'Expected Cash', value: formatCurrency(cashExpected) },
          { label: 'Counted Cash', value: formatCurrency(cashCounted) },
          {
            label: 'Difference',
            value: `${cashDifference >= 0 ? '+' : ''}${formatCurrency(cashDifference)}`,
          },
        ],
      })

      // Card total
      const cardTotal = registerClose.card_total || 0
      addPDFSection(doc, {
        title: 'Card Payments',
        data: [
          { label: 'Card Total', value: formatCurrency(cardTotal) },
        ],
      })

      // Grand total
      const grandTotal = cashCounted + cardTotal
      addPDFSection(doc, {
        title: 'Total',
        data: [
          { label: 'Grand Total', value: formatCurrency(grandTotal) },
        ],
      })

      // Notes
      if (registerClose.notes) {
        addPDFSection(doc, {
          title: 'Notes',
          data: [
            { label: 'Comments', value: registerClose.notes },
          ],
        })
      }

      // Signature area
      addSignatureArea(doc)

      // Footer with page numbers
      addPDFFooter(doc)

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
