import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import {
  createPDFDocument,
  addPDFHeader,
  addPDFSection,
  addPDFTable,
  addPDFFooter,
  formatCurrency,
  type PDFTableColumn,
} from '@/lib/utils/pdf'
import { generateCSV, formatCSVCurrency, type CSVColumn } from '@/lib/utils/csv'

/**
 * GET /api/finance/export/tax
 * Generate tax export data (CSV or PDF format) for accountant
 * Query params: start_date, end_date (required), format (csv | pdf, optional)
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
  const format = searchParams.get('format') || 'csv' // csv, pdf, or json

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'start_date and end_date are required' },
      { status: 400 }
    )
  }

  // Validate format
  if (!['csv', 'pdf', 'json'].includes(format)) {
    return NextResponse.json(
      { error: 'Invalid format. Must be csv, pdf, or json' },
      { status: 400 }
    )
  }

  // Fetch IVA breakdown from sales_iva_breakdown for per-category rates
  const { data: ivaBreakdown } = await supabase
    .from('sales_iva_breakdown')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date')

  // Fallback to RPC if IVA breakdown not available
  let taxExportData: any[] | null = null
  let error: any = null

  if (ivaBreakdown && ivaBreakdown.length > 0) {
    // Use real per-category IVA data
    taxExportData = ivaBreakdown.map((row: any) => ({
      transaction_date: row.date,
      category: row.category,
      description: `Sales - ${row.category} (IVA ${row.iva_rate}%)`,
      revenue: row.total,
      expenses: 0,
      tax_amount: row.iva_amount,
      base_imponible: row.base_imponible,
      iva_rate: row.iva_rate,
    }))

    // Also include expenses with their IVA
    const { data: expenses } = await supabase
      .from('overhead_expenses')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')

    if (expenses) {
      for (const exp of expenses) {
        taxExportData.push({
          transaction_date: exp.date,
          category: exp.category,
          description: exp.description,
          revenue: 0,
          expenses: exp.amount,
          tax_amount: exp.iva_amount || Math.round((exp.amount - exp.amount / (1 + (exp.iva_rate || 21) / 100)) * 100) / 100,
          base_imponible: exp.base_imponible || Math.round((exp.amount / (1 + (exp.iva_rate || 21) / 100)) * 100) / 100,
          iva_rate: exp.iva_rate || 21,
        })
      }
    }
  } else {
    // Fallback to RPC generate_tax_export
    const rpcResult = await supabase.rpc('generate_tax_export', {
      start_date: startDate,
      end_date: endDate,
    })
    taxExportData = rpcResult.data
    error = rpcResult.error
  }

  if (error) {
    console.error('Failed to generate tax export:', error)
    return NextResponse.json(
      { error: 'Failed to generate tax export', details: error.message },
      { status: 500 }
    )
  }

  // Calculate totals
  const totals = taxExportData?.reduce(
    (acc: { total_revenue: number; total_expenses: number; total_tax: number }, row: any) => {
      acc.total_revenue += row.revenue || 0
      acc.total_expenses += row.expenses || 0
      acc.total_tax += row.tax_amount || 0
      return acc
    },
    { total_revenue: 0, total_expenses: 0, total_tax: 0 }
  )

  // If CSV format requested, convert to CSV
  if (format === 'csv') {
    const columns: CSVColumn[] = [
      { header: 'Date', dataKey: 'transaction_date' },
      { header: 'Category', dataKey: 'category' },
      { header: 'Description', dataKey: 'description' },
      {
        header: 'Revenue',
        dataKey: 'revenue',
        format: (v) => formatCSVCurrency(v || 0),
      },
      {
        header: 'Expenses',
        dataKey: 'expenses',
        format: (v) => formatCSVCurrency(v || 0),
      },
      {
        header: 'Base Imponible',
        dataKey: 'base_imponible',
        format: (v) => formatCSVCurrency(v || 0),
      },
      {
        header: 'IVA Rate %',
        dataKey: 'iva_rate',
        format: (v) => String(v || 21),
      },
      {
        header: 'IVA Amount',
        dataKey: 'tax_amount',
        format: (v) => formatCSVCurrency(v || 0),
      },
    ]

    // Add totals row
    const dataWithTotals = [
      ...(taxExportData || []),
      {},
      {
        transaction_date: 'TOTALS',
        category: '',
        description: 'Total',
        revenue: totals?.total_revenue || 0,
        expenses: totals?.total_expenses || 0,
        tax_amount: totals?.total_tax || 0,
      },
    ]

    const csvContent = generateCSV(columns, dataWithTotals)

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="tax_export_${startDate}_${endDate}.csv"`,
      },
    })
  }

  // If PDF format requested, generate PDF
  if (format === 'pdf') {
    try {
      const pdfBuffer = await generateTaxPDF(
        taxExportData || [],
        totals || { total_revenue: 0, total_expenses: 0, total_tax: 0 },
        { start: startDate, end: endDate }
      )

      return new NextResponse(pdfBuffer as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="tax_export_${startDate}_${endDate}.pdf"`,
        },
      })
    } catch (error: any) {
      console.error('PDF generation error:', error)
      return NextResponse.json(
        { error: 'Failed to generate PDF', details: error.message },
        { status: 500 }
      )
    }
  }

  // Return JSON format
  return NextResponse.json({
    period: {
      start_date: startDate,
      end_date: endDate,
    },
    tax_data: taxExportData || [],
    totals: totals || null,
    row_count: taxExportData?.length || 0,
  })
}

/**
 * Generate PDF for tax export
 */
async function generateTaxPDF(
  taxData: any[],
  totals: { total_revenue: number; total_expenses: number; total_tax: number },
  period: { start: string; end: string }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = createPDFDocument()
      const chunks: Buffer[] = []

      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // Add header
      addPDFHeader(doc, {
        title: 'Tax Export Report',
        subtitle: 'Tax-Ready Financial Data for Accountant',
        period: period,
        generatedAt: new Date(),
      })

      // Add summary section
      addPDFSection(doc, {
        title: 'Summary',
        data: [
          {
            label: 'Total Revenue',
            value: formatCurrency(totals.total_revenue),
          },
          {
            label: 'Total Expenses',
            value: formatCurrency(totals.total_expenses),
          },
          {
            label: 'Total Tax (IVA 21%)',
            value: formatCurrency(totals.total_tax),
          },
          {
            label: 'Net Amount',
            value: formatCurrency(
              totals.total_revenue - totals.total_expenses - totals.total_tax
            ),
          },
          {
            label: 'Transactions',
            value: String(taxData.length),
          },
        ],
      })

      // Add tax data table
      const columns: PDFTableColumn[] = [
        { header: 'Date', dataKey: 'transaction_date', width: 70 },
        { header: 'Category', dataKey: 'category', width: 80 },
        { header: 'Description', dataKey: 'description', width: 120 },
        {
          header: 'Revenue',
          dataKey: 'revenue',
          width: 60,
          align: 'right',
          format: (v) => formatCurrency(v || 0),
        },
        {
          header: 'Expenses',
          dataKey: 'expenses',
          width: 60,
          align: 'right',
          format: (v) => formatCurrency(v || 0),
        },
        {
          header: 'Tax',
          dataKey: 'tax_amount',
          width: 60,
          align: 'right',
          format: (v) => formatCurrency(v || 0),
        },
      ]

      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Transaction Details')
        .moveDown(0.5)

      addPDFTable(doc, columns, taxData)

      // Add compliance note
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#666666')
        .text(
          'Note: This report is formatted according to Spanish tax regulations. ' +
            'IVA (VAT) is calculated at per-category rates: 10% (food/non-alcoholic), ' +
            '21% (alcoholic/services), 0% (exempt). Please consult with your tax advisor ' +
            'for filing requirements.',
          50,
          doc.y + 20,
          { align: 'left', width: doc.page.width - 100 }
        )

      // Add footer
      addPDFFooter(doc)

      // Finalize PDF
      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
