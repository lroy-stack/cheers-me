import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import {
  createPDFDocument,
  addCompanyFiscalHeader,
  addIVABreakdownTable,
  addPDFTable,
  addPDFFooter,
  formatCurrency,
  type PDFTableColumn,
} from '@/lib/utils/pdf'
import { NextRequest, NextResponse } from 'next/server'
import type { CompanyFiscalData } from '@/types/expenses'

/**
 * GET /api/sales/print/expenses
 * Generate expense list PDF for contable
 * Query params: start_date (YYYY-MM-DD), end_date (YYYY-MM-DD)
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

  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'start_date and end_date are required' },
      { status: 400 }
    )
  }

  try {
    // Fetch overhead expenses for date range
    const { data: expenses, error: expError } = await supabase
      .from('overhead_expenses')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (expError) {
      return NextResponse.json(
        { error: 'Failed to fetch expenses', details: expError.message },
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

    // Generate PDF
    const pdfBuffer = await generateExpensesPDF(
      startDate,
      endDate,
      expenses || [],
      fiscalData
    )

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="expenses-${startDate}-to-${endDate}.pdf"`,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Expenses PDF generation error:', message)
    return NextResponse.json(
      { error: 'Failed to generate expenses PDF', details: message },
      { status: 500 }
    )
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateExpensesPDF(
  startDate: string,
  endDate: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expenses: any[],
  fiscalData: CompanyFiscalData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = createPDFDocument()
      const chunks: Buffer[] = []

      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // Company fiscal header
      addCompanyFiscalHeader(doc, fiscalData, {
        title: 'Listado de Gastos',
        subtitle: 'Expense Report for Accounting',
        period: { start: startDate, end: endDate },
        generatedAt: new Date(),
      })

      // Expense list table
      if (expenses.length > 0) {
        const columns: PDFTableColumn[] = [
          { header: 'Date', dataKey: 'date', width: 65 },
          { header: 'Category', dataKey: 'category', width: 70 },
          { header: 'Description', dataKey: 'description', width: 100 },
          { header: 'Vendor', dataKey: 'vendor', width: 70 },
          {
            header: 'Base',
            dataKey: 'base_imponible',
            width: 55,
            align: 'right',
            format: (v) => formatCurrency(v || 0),
          },
          {
            header: 'IVA %',
            dataKey: 'iva_rate',
            width: 35,
            align: 'center',
            format: (v) => `${v || 0}%`,
          },
          {
            header: 'IVA',
            dataKey: 'iva_amount',
            width: 50,
            align: 'right',
            format: (v) => formatCurrency(v || 0),
          },
          {
            header: 'Total',
            dataKey: 'amount',
            width: 55,
            align: 'right',
            format: (v) => formatCurrency(v || 0),
          },
        ]

        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('Expense Details')
          .moveDown(0.5)

        addPDFTable(doc, columns, expenses as unknown as Record<string, unknown>[])
      } else {
        doc
          .fontSize(12)
          .font('Helvetica')
          .fillColor('#666666')
          .text('No expenses found for the selected period.')
          .fillColor('#000000')
          .moveDown(1)
      }

      // IVA desglose grouped by category
      if (expenses.length > 0) {
        const byCategoryMap = expenses.reduce(
          (acc, exp) => {
            const cat = exp.category || 'other'
            if (!acc[cat]) {
              acc[cat] = {
                category: cat,
                base_imponible: 0,
                iva_rate: exp.iva_rate || 0,
                iva_amount: 0,
                total: 0,
              }
            }
            acc[cat].base_imponible += exp.base_imponible || 0
            acc[cat].iva_amount += exp.iva_amount || 0
            acc[cat].total += exp.amount || 0
            return acc
          },
          {} as Record<
            string,
            {
              category: string
              base_imponible: number
              iva_rate: number
              iva_amount: number
              total: number
            }
          >
        )

        const byCategory = Object.values(byCategoryMap) as {
          category: string
          base_imponible: number
          iva_rate: number
          iva_amount: number
          total: number
        }[]

        doc.moveDown(1)
        addIVABreakdownTable(doc, byCategory)
      }

      // Footer
      addPDFFooter(doc)

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
