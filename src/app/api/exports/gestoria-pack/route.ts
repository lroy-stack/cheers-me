import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/utils/auth'
import { createClient } from '@/lib/supabase/server'
import JSZip from 'jszip'
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'

/**
 * GET /api/exports/gestoria-pack?month=2026-01
 * Returns a ZIP file containing:
 * - monthly_registry.csv  (clock-in/out summary per employee)
 * - sales_report.csv      (daily sales totals for the month)
 * - expenses_report.csv   (overhead expenses for the month)
 * - summary.txt           (aggregated totals)
 *
 * Requires: admin | owner | manager
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'owner', 'manager'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get('month') // e.g. "2026-01"

  let startDate: Date
  let endDate: Date

  if (monthParam) {
    try {
      startDate = startOfMonth(parseISO(`${monthParam}-01`))
      endDate = endOfMonth(startDate)
    } catch {
      return NextResponse.json({ error: 'Invalid month format. Use YYYY-MM.' }, { status: 400 })
    }
  } else {
    startDate = startOfMonth(new Date())
    endDate = endOfMonth(startDate)
  }

  const monthLabel = format(startDate, 'yyyy-MM')
  const supabase = await createClient()

  // ─── 1. Monthly Registry (clock_in_out per employee) ────────────────────
  const { data: clockData } = await supabase
    .from('clock_in_out')
    .select(`
      id,
      clock_in,
      clock_out,
      total_hours,
      employees (
        first_name,
        last_name,
        employee_number
      )
    `)
    .gte('clock_in', startDate.toISOString())
    .lte('clock_in', endDate.toISOString())
    .order('clock_in')

  const monthlyRegistryCsv = buildCsv(
    ['Employee Number', 'First Name', 'Last Name', 'Clock In', 'Clock Out', 'Total Hours'],
    (clockData ?? []).map((r) => {
      const emp = r.employees as { first_name: string; last_name: string; employee_number: string } | null
      return [
        emp?.employee_number ?? '',
        emp?.first_name ?? '',
        emp?.last_name ?? '',
        r.clock_in ? format(new Date(r.clock_in), 'yyyy-MM-dd HH:mm') : '',
        r.clock_out ? format(new Date(r.clock_out), 'yyyy-MM-dd HH:mm') : '',
        String(r.total_hours ?? 0),
      ]
    })
  )

  // ─── 2. Sales Report ───────────────────────────────────────────────────
  const { data: salesData } = await supabase
    .from('daily_sales')
    .select('date, total_revenue, total_transactions, average_transaction')
    .gte('date', format(startDate, 'yyyy-MM-dd'))
    .lte('date', format(endDate, 'yyyy-MM-dd'))
    .order('date')

  const salesCsv = buildCsv(
    ['Date', 'Total Revenue (EUR)', 'Transactions', 'Average Transaction (EUR)'],
    (salesData ?? []).map((r) => [
      r.date,
      Number(r.total_revenue ?? 0).toFixed(2),
      String(r.total_transactions ?? 0),
      Number(r.average_transaction ?? 0).toFixed(2),
    ])
  )

  // ─── 3. Expenses Report ────────────────────────────────────────────────
  const { data: expenseData } = await supabase
    .from('overhead_expenses')
    .select('date, description, category, amount, supplier_name, supplier_nif, invoice_number, iva_rate')
    .gte('date', format(startDate, 'yyyy-MM-dd'))
    .lte('date', format(endDate, 'yyyy-MM-dd'))
    .order('date')

  const expensesCsv = buildCsv(
    ['Date', 'Description', 'Category', 'Amount (EUR)', 'Supplier', 'NIF', 'Invoice', 'IVA %'],
    (expenseData ?? []).map((r) => [
      r.date,
      r.description ?? '',
      r.category ?? '',
      Number(r.amount ?? 0).toFixed(2),
      r.supplier_name ?? '',
      r.supplier_nif ?? '',
      r.invoice_number ?? '',
      String(r.iva_rate ?? 0),
    ])
  )

  // ─── 4. Summary TXT ───────────────────────────────────────────────────
  const totalRevenue = (salesData ?? []).reduce((s, r) => s + Number(r.total_revenue ?? 0), 0)
  const totalExpenses = (expenseData ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0)
  const totalHours = (clockData ?? []).reduce((s, r) => s + Number(r.total_hours ?? 0), 0)

  const summaryTxt = [
    `GrandCafe Cheers — Gestoria Pack`,
    `Month: ${monthLabel}`,
    `Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')} (Europe/Madrid)`,
    ``,
    `=== SALES SUMMARY ===`,
    `Total Revenue:     ${totalRevenue.toFixed(2)} EUR`,
    `Total Transactions: ${(salesData ?? []).reduce((s, r) => s + Number(r.total_transactions ?? 0), 0)}`,
    ``,
    `=== EXPENSES SUMMARY ===`,
    `Total Expenses:    ${totalExpenses.toFixed(2)} EUR`,
    `Net Result:        ${(totalRevenue - totalExpenses).toFixed(2)} EUR`,
    ``,
    `=== STAFF HOURS ===`,
    `Total Hours Worked: ${totalHours.toFixed(2)} h`,
    `Clock Records:      ${(clockData ?? []).length}`,
    ``,
    `=== FILES INCLUDED ===`,
    `- monthly_registry_${monthLabel}.csv`,
    `- sales_report_${monthLabel}.csv`,
    `- expenses_report_${monthLabel}.csv`,
    `- summary_${monthLabel}.txt`,
  ].join('\n')

  // ─── Build ZIP ────────────────────────────────────────────────────────
  const zip = new JSZip()
  zip.file(`monthly_registry_${monthLabel}.csv`, monthlyRegistryCsv)
  zip.file(`sales_report_${monthLabel}.csv`, salesCsv)
  zip.file(`expenses_report_${monthLabel}.csv`, expensesCsv)
  zip.file(`summary_${monthLabel}.txt`, summaryTxt)

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })

  return new NextResponse(zipBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="gestoria-pack-${monthLabel}.zip"`,
      'Content-Length': String(zipBuffer.byteLength),
    },
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function escapeCsvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function buildCsv(headers: string[], rows: string[][]): string {
  const headerRow = headers.map(escapeCsvCell).join(',')
  const dataRows = rows.map((r) => r.map(escapeCsvCell).join(','))
  return [headerRow, ...dataRows].join('\n')
}
