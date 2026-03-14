import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import ExcelJS from 'exceljs'
import { format, parseISO, addDays } from 'date-fns'
import { SHIFT_TYPE_CONFIG, ROLE_DEPARTMENT_MAP } from '@/lib/constants/schedule'
import type { UserRole } from '@/types'

const exportSchema = z.object({
  week_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

const SHIFT_COLORS: Record<string, string> = {
  M: 'FFF3E0',
  T: 'FFE0B2',
  N: 'BBDEFB',
  P: 'C8E6C9',
  D: 'F5F5F5',
}

const SHIFT_FONT_COLORS: Record<string, string> = {
  M: 'E65100',
  T: 'BF360C',
  N: '1565C0',
  P: '2E7D32',
  D: '757575',
}

/**
 * POST /api/staff/schedule-plans/export
 * Generate and return an Excel file for a given week's schedule.
 * Server-side generation — ExcelJS runs in Node.js where it belongs.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validation = exportSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ error: 'week_start_date required (YYYY-MM-DD)' }, { status: 400 })
  }

  const { week_start_date } = validation.data
  const weekStart = parseISO(week_start_date)
  const weekDates = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd'))
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const supabase = await createClient()

  // Fetch the latest plan for this week
  const { data: plan } = await supabase
    .from('schedule_plans')
    .select('id')
    .eq('week_start_date', week_start_date)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Fetch shifts (from plan or all for this date range)
  let shifts: Array<{
    employee_id: string
    date: string
    shift_type: string
    start_time: string
    end_time: string
    break_duration_minutes: number
    is_day_off: boolean
    second_start_time?: string | null
    second_end_time?: string | null
    employee: { id: string; hourly_rate: number; profile: { full_name: string | null; role: string } }
  }> = []

  if (plan) {
    const { data } = await supabase
      .from('shifts')
      .select('employee_id, date, shift_type, start_time, end_time, break_duration_minutes, is_day_off, second_start_time, second_end_time, employee:employees(id, hourly_rate, profile:profiles(full_name, role))')
      .eq('schedule_plan_id', plan.id)
      .order('date')
    shifts = (data || []) as unknown as typeof shifts
  }

  // Fetch all employees
  const { data: employees } = await supabase
    .from('employees')
    .select('id, hourly_rate, profile:profiles(full_name, role)')
    .is('date_terminated', null)
    .order('profile(full_name)')

  // Group employees by department
  const departments: Record<string, Array<{ id: string; name: string; hourlyRate: number; role: string }>> = {}
  for (const emp of employees || []) {
    const profile = emp.profile as unknown as { full_name: string | null; role: string }
    const role = profile?.role || 'waiter'
    const dept = ROLE_DEPARTMENT_MAP[role as UserRole]?.label || 'OTHER'
    if (!departments[dept]) departments[dept] = []
    departments[dept].push({
      id: emp.id,
      name: profile?.full_name || 'Unknown',
      hourlyRate: emp.hourly_rate,
      role,
    })
  }

  // Index shifts by employee+date
  const shiftMap: Record<string, typeof shifts[0]> = {}
  for (const s of shifts) {
    shiftMap[`${s.employee_id}_${s.date}`] = s
  }

  // Build workbook
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'GrandCafe Cheers Manager'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Schedule', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  // Title
  const weekLabel = `${format(weekStart, 'dd MMM yyyy')} - ${format(parseISO(weekDates[6]), 'dd MMM yyyy')}`
  sheet.mergeCells(1, 1, 1, 9)
  const titleCell = sheet.getCell(1, 1)
  titleCell.value = `GRANDCAFE CHEERS — Schedule: ${weekLabel}`
  titleCell.font = { bold: true, size: 14, color: { argb: '1A237E' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getRow(1).height = 30

  // Header row
  const headerRow = sheet.getRow(3)
  headerRow.getCell(1).value = 'Employee'
  weekDates.forEach((date, i) => {
    headerRow.getCell(i + 2).value = `${dayLabels[i]}\n${format(parseISO(date), 'dd/MM')}`
  })
  headerRow.getCell(9).value = 'Total'

  for (let col = 1; col <= 9; col++) {
    const cell = headerRow.getCell(col)
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1A237E' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
  }
  headerRow.height = 32
  sheet.getColumn(1).width = 24
  for (let i = 2; i <= 8; i++) sheet.getColumn(i).width = 14
  sheet.getColumn(9).width = 10

  let currentRow = 4

  // Department groups
  const deptOrder = Object.values(ROLE_DEPARTMENT_MAP).sort((a, b) => a.order - b.order)
  for (const deptInfo of deptOrder) {
    const deptEmployees = departments[deptInfo.label]
    if (!deptEmployees || deptEmployees.length === 0) continue

    // Department header
    const deptRow = sheet.getRow(currentRow)
    sheet.mergeCells(currentRow, 1, currentRow, 9)
    deptRow.getCell(1).value = deptInfo.label
    deptRow.getCell(1).font = { bold: true, size: 10, color: { argb: 'FFFFFF' } }
    deptRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '455A64' } }
    deptRow.height = 22
    currentRow++

    for (const emp of deptEmployees) {
      const row = sheet.getRow(currentRow)
      row.getCell(1).value = emp.name
      row.getCell(1).font = { size: 10 }
      row.getCell(1).alignment = { vertical: 'middle' }

      let empTotalHours = 0

      weekDates.forEach((date, i) => {
        const shift = shiftMap[`${emp.id}_${date}`]
        const cell = row.getCell(i + 2)

        if (shift) {
          const type = shift.is_day_off ? 'D' : shift.shift_type === 'morning' ? 'M' : shift.shift_type === 'afternoon' ? 'T' : shift.shift_type === 'night' ? 'N' : shift.shift_type === 'split' ? 'P' : 'M'

          if (shift.is_day_off) {
            cell.value = 'OFF'
          } else {
            cell.value = `${type} ${shift.start_time.slice(0, 5)}-${shift.end_time.slice(0, 5)}`
            // Calculate hours
            const startParts = shift.start_time.split(':')
            const endParts = shift.end_time.split(':')
            let mins = (parseInt(endParts[0]) * 60 + parseInt(endParts[1])) - (parseInt(startParts[0]) * 60 + parseInt(startParts[1]))
            if (mins < 0) mins += 24 * 60
            empTotalHours += (mins - shift.break_duration_minutes) / 60
          }

          if (SHIFT_COLORS[type]) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SHIFT_COLORS[type] } }
          }
          if (SHIFT_FONT_COLORS[type]) {
            cell.font = { size: 9, color: { argb: SHIFT_FONT_COLORS[type] }, bold: true }
          }
        }

        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
        cell.border = {
          top: { style: 'thin', color: { argb: 'E0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
          left: { style: 'thin', color: { argb: 'E0E0E0' } },
          right: { style: 'thin', color: { argb: 'E0E0E0' } },
        }
      })

      const totalCell = row.getCell(9)
      totalCell.value = empTotalHours
      totalCell.font = { bold: true, size: 10 }
      totalCell.alignment = { horizontal: 'center', vertical: 'middle' }
      totalCell.numFmt = '0.0'
      totalCell.border = {
        top: { style: 'thin', color: { argb: 'E0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
        left: { style: 'thin', color: { argb: 'E0E0E0' } },
        right: { style: 'thin', color: { argb: 'E0E0E0' } },
      }

      row.height = 20
      currentRow++
    }
  }

  // Legend
  currentRow += 2
  const legendRow = sheet.getRow(currentRow)
  sheet.mergeCells(currentRow, 1, currentRow, 9)
  const legendParts = Object.entries(SHIFT_TYPE_CONFIG)
    .map(([key, config]) => {
      if (key === 'D') return `${key} = Day Off`
      if (key === 'P' && config.secondStart) return `${key} = ${config.start}-${config.end} / ${config.secondStart}-${config.secondEnd}`
      return `${key} = ${config.start}-${config.end}`
    })
    .join('  |  ')
  legendRow.getCell(1).value = `Legend: ${legendParts}`
  legendRow.getCell(1).font = { size: 8, color: { argb: '757575' }, italic: true }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer()

  return new Response(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="schedule_${week_start_date}.xlsx"`,
      'Content-Length': String((buffer as ArrayBuffer).byteLength),
    },
  })
}
