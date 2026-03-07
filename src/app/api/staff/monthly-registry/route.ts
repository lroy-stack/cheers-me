import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { LABOR_CONSTRAINTS as DEFAULT_LABOR_CONSTRAINTS } from '@/lib/constants/schedule'

/**
 * GET /api/staff/monthly-registry
 * Get monthly hours/costs aggregation from actual clock records (clock_in_out + clock_breaks)
 * NOT from scheduled shifts — this is legal requirement for Spanish time registry.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
  const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())

  const startDate = `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}T23:59:59.999Z`

  const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`
  const endDateStr = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

  const supabase = await createClient()

  const [clockRecordsResult, employeesResult, leaveResult, settingsResult] = await Promise.all([
    supabase
      .from('clock_in_out')
      .select(`
        id,
        employee_id,
        clock_in_time,
        clock_out_time,
        clock_breaks(id, start_time, end_time)
      `)
      .gte('clock_in_time', startDate)
      .lte('clock_in_time', endDate)
      .order('clock_in_time'),
    supabase
      .from('employees')
      .select(`
        id,
        hourly_rate,
        employment_status,
        profile:profiles(id, full_name, email, role, active)
      `),
    supabase
      .from('leave_requests')
      .select('*')
      .eq('status', 'approved')
      .lte('start_date', endDateStr)
      .gte('end_date', startDateStr),
    supabase
      .from('restaurant_settings')
      .select('value')
      .eq('key', 'labor_constraints')
      .maybeSingle(),
  ])

  const clockRecords = clockRecordsResult.data || []
  const employees = employeesResult.data || []
  const leaveRequests = leaveResult.data || []
  const LABOR_CONSTRAINTS = { ...DEFAULT_LABOR_CONSTRAINTS, ...(settingsResult.data?.value || {}) }

  // Build employee records
  const employeeRecords: Record<string, {
    employee_id: string
    name: string
    role: string
    hourly_rate: number
    days: Record<string, { hours: number; shift_type: string | null; is_leave?: boolean; clock_in?: string; clock_out?: string }>
    total_hours: number
    regular_hours: number
    overtime_hours: number
    total_cost: number
  }> = {}

  // Initialize all active employees
  for (const emp of employees) {
    if (!(emp.profile as any)?.active) continue
    employeeRecords[emp.id] = {
      employee_id: emp.id,
      name: (emp.profile as any).full_name || (emp.profile as any).email,
      role: (emp.profile as any).role,
      hourly_rate: emp.hourly_rate ?? 0,
      days: {},
      total_hours: 0,
      regular_hours: 0,
      overtime_hours: 0,
      total_cost: 0,
    }
  }

  // Helper: calculate break duration in hours for a clock record
  function calcBreakHours(breaks: Array<{ start_time: string; end_time: string | null }>): number {
    let totalMs = 0
    for (const b of breaks) {
      if (!b.end_time) continue
      const ms = new Date(b.end_time).getTime() - new Date(b.start_time).getTime()
      if (ms > 0) totalMs += ms
    }
    return totalMs / 3600000
  }

  // Process clock records — group by employee and date
  for (const record of clockRecords) {
    const empRecord = employeeRecords[record.employee_id]
    if (!empRecord) continue

    // Use the clock_in_time date (Madrid timezone approximation: UTC+1/UTC+2)
    const clockInDate = new Date(record.clock_in_time)
    // Get date in Europe/Madrid timezone
    const dateStr = clockInDate.toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' })

    // Only count completed records (with clock_out_time) for actual hours
    let hoursWorked = 0
    if (record.clock_out_time) {
      const durationMs =
        new Date(record.clock_out_time).getTime() - new Date(record.clock_in_time).getTime()
      const durationHours = durationMs / 3600000
      const breakHours = calcBreakHours((record as any).clock_breaks || [])
      hoursWorked = Math.max(0, durationHours - breakHours)
    }

    // Accumulate if multiple records for same day (e.g., split shifts)
    if (empRecord.days[dateStr]) {
      empRecord.days[dateStr].hours += hoursWorked
    } else {
      empRecord.days[dateStr] = {
        hours: hoursWorked,
        shift_type: hoursWorked > 0 ? 'T' : null, // 'T' = trabajado (worked)
        clock_in: record.clock_in_time,
        clock_out: record.clock_out_time || undefined,
      }
    }

    if (record.clock_out_time) {
      empRecord.total_hours += hoursWorked
    }
  }

  // Mark leave days
  for (const leave of leaveRequests) {
    const empRecord = employeeRecords[leave.employee_id]
    if (!empRecord) continue

    const start = new Date(Math.max(new Date(leave.start_date).getTime(), new Date(startDateStr).getTime()))
    const end = new Date(Math.min(new Date(leave.end_date).getTime(), new Date(endDateStr).getTime()))

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      if (!empRecord.days[dateStr]) {
        empRecord.days[dateStr] = { hours: 0, shift_type: null, is_leave: true }
      } else {
        empRecord.days[dateStr].is_leave = true
      }
    }
  }

  // Calculate costs with overtime
  const maxWeeklyHours = LABOR_CONSTRAINTS.maxWeeklyHours ?? 40
  for (const record of Object.values(employeeRecords)) {
    // Simple approximation: ~4.33 weeks per month
    const monthlyRegularMax = maxWeeklyHours * 4.33
    record.regular_hours = Math.min(record.total_hours, monthlyRegularMax)
    record.overtime_hours = Math.max(0, record.total_hours - monthlyRegularMax)
    const overtimeMultiplier = LABOR_CONSTRAINTS.overtimeMultiplier ?? 1.25
    record.total_cost =
      record.regular_hours * record.hourly_rate +
      record.overtime_hours * record.hourly_rate * overtimeMultiplier
  }

  // Role totals
  const roleTotals: Record<string, { total_hours: number; total_cost: number; count: number }> = {}
  let grandHours = 0
  let grandCost = 0
  let grandOvertime = 0

  for (const record of Object.values(employeeRecords)) {
    if (!roleTotals[record.role]) {
      roleTotals[record.role] = { total_hours: 0, total_cost: 0, count: 0 }
    }
    roleTotals[record.role].total_hours += record.total_hours
    roleTotals[record.role].total_cost += record.total_cost
    roleTotals[record.role].count++
    grandHours += record.total_hours
    grandCost += record.total_cost
    grandOvertime += record.overtime_hours
  }

  return NextResponse.json({
    period: { year, month },
    data_source: 'clock_records', // Confirms actual clock data is used
    employees: Object.values(employeeRecords).filter(
      (r) => r.total_hours > 0 || Object.keys(r.days).length > 0
    ),
    role_totals: roleTotals,
    grand_total: { hours: grandHours, cost: grandCost, overtime: grandOvertime },
  })
}
