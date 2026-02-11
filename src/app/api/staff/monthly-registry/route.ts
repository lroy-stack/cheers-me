import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { SHIFT_TYPE_TO_CELL_TYPE, LABOR_CONSTRAINTS as DEFAULT_LABOR_CONSTRAINTS } from '@/lib/constants/schedule'
import { calculateShiftHours } from '@/lib/utils/schedule-validation'

/**
 * GET /api/staff/monthly-registry
 * Get monthly hours/costs aggregation
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
  const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

  const supabase = await createClient()

  // First get published plan IDs for this month's weeks
  const [plansResult, employeesResult, leaveResult, settingsResult] = await Promise.all([
    supabase
      .from('schedule_plans')
      .select('id')
      .eq('status', 'published'),
    supabase
      .from('employees')
      .select(`
        *,
        profile:profiles(*)
      `),
    supabase
      .from('leave_requests')
      .select('*')
      .eq('status', 'approved')
      .lte('start_date', endDate)
      .gte('end_date', startDate),
    supabase
      .from('restaurant_settings')
      .select('value')
      .eq('key', 'labor_constraints')
      .maybeSingle(),
  ])

  const publishedPlanIds = (plansResult.data || []).map((p) => p.id)

  // Fetch shifts only from published plans within the date range
  let shifts: any[] = []
  if (publishedPlanIds.length > 0) {
    const { data } = await supabase
      .from('shifts')
      .select(`
        *,
        employee:employees(
          id,
          hourly_rate,
          profile:profiles(id, full_name, role)
        )
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .in('schedule_plan_id', publishedPlanIds)
      .order('date')
    shifts = data || []
  }

  const employees = employeesResult.data || []
  const leaveRequests = leaveResult.data || []
  const LABOR_CONSTRAINTS = { ...DEFAULT_LABOR_CONSTRAINTS, ...(settingsResult.data?.value || {}) }

  // Build employee records
  const employeeRecords: Record<string, {
    employee_id: string
    name: string
    role: string
    hourly_rate: number
    days: Record<string, { hours: number; shift_type: string | null; is_leave?: boolean }>
    total_hours: number
    regular_hours: number
    overtime_hours: number
    total_cost: number
  }> = {}

  // Initialize all employees
  for (const emp of employees) {
    if (!emp.profile?.active) continue
    employeeRecords[emp.id] = {
      employee_id: emp.id,
      name: emp.profile.full_name || emp.profile.email,
      role: emp.profile.role,
      hourly_rate: emp.hourly_rate,
      days: {},
      total_hours: 0,
      regular_hours: 0,
      overtime_hours: 0,
      total_cost: 0,
    }
  }

  // Add shift data
  for (const shift of shifts) {
    const record = employeeRecords[shift.employee_id]
    if (!record) continue

    const hours = calculateShiftHours(shift.start_time, shift.end_time, shift.break_duration_minutes, shift.second_start_time, shift.second_end_time)
    const cellType = SHIFT_TYPE_TO_CELL_TYPE[shift.shift_type] || null

    record.days[shift.date] = {
      hours,
      shift_type: shift.is_day_off ? 'D' : cellType,
    }
    if (!shift.is_day_off) {
      record.total_hours += hours
    }
  }

  // Mark leave days
  for (const leave of leaveRequests) {
    const record = employeeRecords[leave.employee_id]
    if (!record) continue

    const start = new Date(Math.max(new Date(leave.start_date).getTime(), new Date(startDate).getTime()))
    const end = new Date(Math.min(new Date(leave.end_date).getTime(), new Date(endDate).getTime()))

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      if (!record.days[dateStr]) {
        record.days[dateStr] = { hours: 0, shift_type: null, is_leave: true }
      } else {
        record.days[dateStr].is_leave = true
      }
    }
  }

  // Calculate costs
  const maxWeeklyHours = LABOR_CONSTRAINTS.maxWeeklyHours
  for (const record of Object.values(employeeRecords)) {
    // Simple approximation: ~4.33 weeks per month
    const monthlyRegularMax = maxWeeklyHours * 4.33
    record.regular_hours = Math.min(record.total_hours, monthlyRegularMax)
    record.overtime_hours = Math.max(0, record.total_hours - monthlyRegularMax)
    record.total_cost =
      record.regular_hours * record.hourly_rate +
      record.overtime_hours * record.hourly_rate * LABOR_CONSTRAINTS.overtimeMultiplier
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
    employees: Object.values(employeeRecords).filter((r) => r.total_hours > 0 || Object.keys(r.days).length > 0),
    role_totals: roleTotals,
    grand_total: { hours: grandHours, cost: grandCost, overtime: grandOvertime },
  })
}
