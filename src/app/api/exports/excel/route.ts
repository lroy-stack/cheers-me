import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'

/**
 * GET /api/exports/excel?type=schedule|tasks|sales|expenses&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
 * Server-side Excel generation → Supabase Storage → signed URL (1h TTL)
 */

const STORAGE_BUCKET = 'exports'

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: '1A237E' },
}

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  size: 10,
  color: { argb: 'FFFFFF' },
}

const CURRENCY_FORMAT = '#,##0.00 "EUR"'

function styleHeaderRow(sheet: ExcelJS.Worksheet, rowNum: number, colCount: number) {
  const row = sheet.getRow(rowNum)
  for (let col = 1; col <= colCount; col++) {
    const cell = row.getCell(col)
    cell.font = HEADER_FONT
    cell.fill = HEADER_FILL
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    }
  }
  row.height = 24
}

type ExportType = 'schedule' | 'tasks' | 'sales' | 'expenses'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const exportType = searchParams.get('type') as ExportType | null
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')

  if (!exportType || !['schedule', 'tasks', 'sales', 'expenses'].includes(exportType)) {
    return NextResponse.json(
      { error: 'type parameter required: schedule | tasks | sales | expenses' },
      { status: 400 }
    )
  }

  try {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'GrandCafe Cheers AI'
    workbook.created = new Date()

    let filename: string

    switch (exportType) {
      case 'sales':
        filename = await buildSalesExport(supabase, workbook, dateFrom, dateTo)
        break
      case 'expenses':
        filename = await buildExpensesExport(supabase, workbook, dateFrom, dateTo)
        break
      case 'schedule':
        filename = await buildScheduleExport(supabase, workbook, dateFrom, dateTo)
        break
      case 'tasks':
        filename = await buildTasksExport(supabase, workbook)
        break
      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()

    // Upload to Supabase Storage
    const storagePath = `${user.id}/${Date.now()}-${filename}`

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: false,
      })

    if (uploadError) {
      // If bucket doesn't exist or upload fails, return buffer as base64 data URL
      console.error('Storage upload error:', uploadError.message)
      const base64 = Buffer.from(buffer as ArrayBuffer).toString('base64')
      return NextResponse.json({
        download_url: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`,
        filename,
        note: 'Direct download — storage bucket not configured',
      })
    }

    // Create signed URL (1 hour TTL)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, 3600)

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('Signed URL error:', signedUrlError?.message)
      return NextResponse.json({ error: 'Failed to create download link' }, { status: 500 })
    }

    return NextResponse.json({
      download_url: signedUrlData.signedUrl,
      filename,
      storage_path: storagePath,
      expires_in: 3600,
    })
  } catch (error) {
    console.error('Excel export error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    )
  }
}

// ── Sales Export ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildSalesExport(supabase: any, workbook: ExcelJS.Workbook, dateFrom: string | null, dateTo: string | null): Promise<string> {
  const from = dateFrom || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const to = dateTo || new Date().toISOString().split('T')[0]

  const { data: sales, error } = await supabase
    .from('daily_sales')
    .select('*')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true })

  if (error) throw new Error(`Sales query failed: ${error.message}`)

  const sheet = workbook.addWorksheet('Sales', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  // Title
  sheet.mergeCells(1, 1, 1, 6)
  const titleCell = sheet.getCell(1, 1)
  titleCell.value = `GRANDCAFE CHEERS — Sales Report (${from} to ${to})`
  titleCell.font = { bold: true, size: 14, color: { argb: '1A237E' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getRow(1).height = 30

  // Headers
  const headers = ['Date', 'Food Revenue', 'Beverage Revenue', 'Other Revenue', 'Total Revenue', 'Covers']
  const headerRow = sheet.getRow(3)
  headers.forEach((h, i) => { headerRow.getCell(i + 1).value = h })
  styleHeaderRow(sheet, 3, headers.length)

  // Column widths
  sheet.getColumn(1).width = 14
  for (let c = 2; c <= 5; c++) sheet.getColumn(c).width = 18
  sheet.getColumn(6).width = 10

  // Data
  let totalFood = 0, totalBev = 0, totalOther = 0, totalCovers = 0
  const rows = sales || []
  rows.forEach((sale: Record<string, number | string>, idx: number) => {
    const row = sheet.getRow(idx + 4)
    const food = Number(sale.food_revenue || 0)
    const bev = Number(sale.beverage_revenue || 0)
    const other = Number(sale.other_revenue || 0)
    const covers = Number(sale.total_covers || 0)

    row.getCell(1).value = String(sale.date)
    row.getCell(2).value = food
    row.getCell(2).numFmt = CURRENCY_FORMAT
    row.getCell(3).value = bev
    row.getCell(3).numFmt = CURRENCY_FORMAT
    row.getCell(4).value = other
    row.getCell(4).numFmt = CURRENCY_FORMAT
    row.getCell(5).value = food + bev + other
    row.getCell(5).numFmt = CURRENCY_FORMAT
    row.getCell(6).value = covers

    totalFood += food
    totalBev += bev
    totalOther += other
    totalCovers += covers
  })

  // Totals
  const totalRowNum = rows.length + 5
  const totRow = sheet.getRow(totalRowNum)
  totRow.getCell(1).value = 'TOTAL'
  totRow.getCell(1).font = { bold: true }
  totRow.getCell(2).value = totalFood
  totRow.getCell(2).numFmt = CURRENCY_FORMAT
  totRow.getCell(2).font = { bold: true }
  totRow.getCell(3).value = totalBev
  totRow.getCell(3).numFmt = CURRENCY_FORMAT
  totRow.getCell(3).font = { bold: true }
  totRow.getCell(4).value = totalOther
  totRow.getCell(4).numFmt = CURRENCY_FORMAT
  totRow.getCell(4).font = { bold: true }
  totRow.getCell(5).value = totalFood + totalBev + totalOther
  totRow.getCell(5).numFmt = CURRENCY_FORMAT
  totRow.getCell(5).font = { bold: true }
  totRow.getCell(6).value = totalCovers
  totRow.getCell(6).font = { bold: true }

  return `sales-${from}-to-${to}.xlsx`
}

// ── Expenses Export ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildExpensesExport(supabase: any, workbook: ExcelJS.Workbook, dateFrom: string | null, dateTo: string | null): Promise<string> {
  const from = dateFrom || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const to = dateTo || new Date().toISOString().split('T')[0]

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true })

  if (error) throw new Error(`Expenses query failed: ${error.message}`)

  const sheet = workbook.addWorksheet('Expenses', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  // Title
  sheet.mergeCells(1, 1, 1, 8)
  const titleCell = sheet.getCell(1, 1)
  titleCell.value = `GRANDCAFE CHEERS — Expenses Report (${from} to ${to})`
  titleCell.font = { bold: true, size: 14, color: { argb: '1A237E' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getRow(1).height = 30

  // Headers
  const headers = ['Date', 'Category', 'Description', 'Vendor', 'Base', 'IVA Rate', 'IVA Amount', 'Total']
  const headerRow = sheet.getRow(3)
  headers.forEach((h, i) => { headerRow.getCell(i + 1).value = h })
  styleHeaderRow(sheet, 3, headers.length)

  sheet.getColumn(1).width = 14
  sheet.getColumn(2).width = 16
  sheet.getColumn(3).width = 28
  sheet.getColumn(4).width = 20
  sheet.getColumn(5).width = 14
  sheet.getColumn(6).width = 10
  sheet.getColumn(7).width = 14
  sheet.getColumn(8).width = 14

  let totalAmount = 0
  const rows = expenses || []
  rows.forEach((exp: Record<string, number | string>, idx: number) => {
    const row = sheet.getRow(idx + 4)
    const amount = Number(exp.amount || 0)

    row.getCell(1).value = String(exp.date)
    row.getCell(2).value = String(exp.category || '')
    row.getCell(3).value = String(exp.description || '')
    row.getCell(4).value = String(exp.vendor || '')
    row.getCell(5).value = Number(exp.base_imponible || 0)
    row.getCell(5).numFmt = CURRENCY_FORMAT
    row.getCell(6).value = `${Number(exp.iva_rate || 0)}%`
    row.getCell(7).value = Number(exp.iva_amount || 0)
    row.getCell(7).numFmt = CURRENCY_FORMAT
    row.getCell(8).value = amount
    row.getCell(8).numFmt = CURRENCY_FORMAT

    totalAmount += amount
  })

  // Total
  const totalRowNum = rows.length + 5
  const totRow = sheet.getRow(totalRowNum)
  totRow.getCell(1).value = 'TOTAL'
  totRow.getCell(1).font = { bold: true }
  totRow.getCell(8).value = totalAmount
  totRow.getCell(8).numFmt = CURRENCY_FORMAT
  totRow.getCell(8).font = { bold: true }

  return `expenses-${from}-to-${to}.xlsx`
}

// ── Schedule Export ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildScheduleExport(supabase: any, workbook: ExcelJS.Workbook, dateFrom: string | null, dateTo: string | null): Promise<string> {
  // Default to current week
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const from = dateFrom || monday.toISOString().split('T')[0]

  const toDate = dateTo ? new Date(dateTo) : new Date(monday)
  if (!dateTo) toDate.setDate(toDate.getDate() + 6)
  const to = dateTo || toDate.toISOString().split('T')[0]

  // Fetch shifts with employee info
  const { data: shifts, error } = await supabase
    .from('shifts')
    .select('*, employee:employees(id, profile:profiles(full_name))')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true })

  if (error) throw new Error(`Schedule query failed: ${error.message}`)

  const sheet = workbook.addWorksheet('Schedule', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  // Title
  sheet.mergeCells(1, 1, 1, 6)
  const titleCell = sheet.getCell(1, 1)
  titleCell.value = `GRANDCAFE CHEERS — Schedule (${from} to ${to})`
  titleCell.font = { bold: true, size: 14, color: { argb: '1A237E' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getRow(1).height = 30

  // Generate date columns
  const dates: string[] = []
  const current = new Date(from + 'T00:00:00')
  const end = new Date(to + 'T00:00:00')
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }

  // Headers
  const headers = ['Employee', ...dates, 'Total Hours']
  const headerRow = sheet.getRow(3)
  headers.forEach((h, i) => { headerRow.getCell(i + 1).value = h })
  styleHeaderRow(sheet, 3, headers.length)

  sheet.getColumn(1).width = 24
  for (let c = 2; c <= dates.length + 1; c++) sheet.getColumn(c).width = 14
  sheet.getColumn(dates.length + 2).width = 14

  // Group shifts by employee
  const byEmployee = new Map<string, { name: string; shifts: Map<string, { type: string; hours: number }> }>()
  const shiftRows = shifts || []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shiftRows.forEach((s: any) => {
    const empId = s.employee_id
    const empName = s.employee?.profile?.full_name || 'Unknown'

    if (!byEmployee.has(empId)) {
      byEmployee.set(empId, { name: empName, shifts: new Map() })
    }

    const hours = s.actual_hours || s.scheduled_hours || 0
    byEmployee.get(empId)!.shifts.set(s.date, {
      type: s.shift_type || s.type || 'W',
      hours: Number(hours),
    })
  })

  // Data rows
  let rowIdx = 4
  byEmployee.forEach(({ name, shifts: empShifts }) => {
    const row = sheet.getRow(rowIdx)
    row.getCell(1).value = name
    row.getCell(1).alignment = { vertical: 'middle' }

    let totalHours = 0
    dates.forEach((date, colIdx) => {
      const shift = empShifts.get(date)
      if (shift) {
        row.getCell(colIdx + 2).value = `${shift.type} (${shift.hours}h)`
        row.getCell(colIdx + 2).alignment = { horizontal: 'center', vertical: 'middle' }
        totalHours += shift.hours
      }
    })

    row.getCell(dates.length + 2).value = totalHours
    row.getCell(dates.length + 2).numFmt = '0.0'
    row.getCell(dates.length + 2).font = { bold: true }
    row.getCell(dates.length + 2).alignment = { horizontal: 'center', vertical: 'middle' }

    rowIdx++
  })

  return `schedule-${from}-to-${to}.xlsx`
}

// ── Tasks Export ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildTasksExport(supabase: any, workbook: ExcelJS.Workbook): Promise<string> {
  const { data: tasks, error } = await supabase
    .from('staff_tasks')
    .select('*, assigned_employee:employees(id, profile:profiles(full_name)), items:staff_task_items(*)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw new Error(`Tasks query failed: ${error.message}`)

  const sheet = workbook.addWorksheet('Tasks', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  // Title
  sheet.mergeCells(1, 1, 1, 8)
  const titleCell = sheet.getCell(1, 1)
  const today = new Date().toISOString().split('T')[0]
  titleCell.value = `GRANDCAFE CHEERS — Tasks Export (${today})`
  titleCell.font = { bold: true, size: 14, color: { argb: '1A237E' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getRow(1).height = 30

  // Headers
  const headers = ['Title', 'Status', 'Priority', 'Assigned To', 'Due Date', 'Checklist', 'Notes', 'Created']
  const headerRow = sheet.getRow(3)
  headers.forEach((h, i) => { headerRow.getCell(i + 1).value = h })
  styleHeaderRow(sheet, 3, headers.length)

  sheet.getColumn(1).width = 40
  sheet.getColumn(2).width = 14
  sheet.getColumn(3).width = 12
  sheet.getColumn(4).width = 22
  sheet.getColumn(5).width = 14
  sheet.getColumn(6).width = 12
  sheet.getColumn(7).width = 30
  sheet.getColumn(8).width = 14

  const taskRows = tasks || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  taskRows.forEach((task: any, idx: number) => {
    const row = sheet.getRow(idx + 4)

    row.getCell(1).value = task.title || ''
    row.getCell(1).alignment = { vertical: 'middle', wrapText: true }

    row.getCell(2).value = (task.status || '').replace('_', ' ').toUpperCase()
    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' }

    row.getCell(3).value = (task.priority || '').toUpperCase()
    row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' }

    row.getCell(4).value = task.assigned_employee?.profile?.full_name || 'Unassigned'
    row.getCell(4).alignment = { vertical: 'middle' }

    row.getCell(5).value = task.due_date || ''
    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' }

    // Checklist progress
    const items = task.items || []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completed = items.filter((i: any) => i.completed).length
    row.getCell(6).value = items.length > 0 ? `${completed}/${items.length}` : ''
    row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' }

    row.getCell(7).value = task.notes || task.description || ''
    row.getCell(7).alignment = { vertical: 'middle', wrapText: true }

    row.getCell(8).value = task.created_at ? task.created_at.split('T')[0] : ''
    row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' }

    // Borders
    for (let col = 1; col <= 8; col++) {
      row.getCell(col).border = {
        top: { style: 'thin', color: { argb: 'E0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
        left: { style: 'thin', color: { argb: 'E0E0E0' } },
        right: { style: 'thin', color: { argb: 'E0E0E0' } },
      }
    }
    row.height = 22
  })

  return `tasks-${today}.xlsx`
}
