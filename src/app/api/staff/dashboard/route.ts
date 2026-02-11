import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

interface WorkedHours {
  employee_id: string
  employee_name: string
  total_hours: number
  regular_hours: number
  overtime_hours: number
  labor_cost: number
}

/**
 * Calculate hours worked from clock records
 */
function calculateHours(clockInTime: string, clockOutTime: string | null): number {
  if (!clockOutTime) return 0

  const start = new Date(clockInTime)
  const end = new Date(clockOutTime)
  const diffMs = end.getTime() - start.getTime()
  const hours = diffMs / (1000 * 60 * 60)

  return Math.max(0, hours)
}

/**
 * GET /api/staff/dashboard
 * Get staff management dashboard metrics
 * - Hours per employee (this week/month)
 * - Overtime alerts
 * - Labor cost
 *
 * Query params:
 * - period: 'week' | 'month' (default: 'week')
 * - start_date: YYYY-MM-DD (optional, overrides period)
 * - end_date: YYYY-MM-DD (optional, overrides period)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  // Determine date range
  let startDate: string
  let endDate: string

  const customStartDate = searchParams.get('start_date')
  const customEndDate = searchParams.get('end_date')
  const period = searchParams.get('period') || 'week'

  if (customStartDate && customEndDate) {
    startDate = customStartDate
    endDate = customEndDate
  } else {
    const now = new Date()
    endDate = now.toISOString().split('T')[0]

    if (period === 'month') {
      const monthAgo = new Date(now)
      monthAgo.setDate(now.getDate() - 30)
      startDate = monthAgo.toISOString().split('T')[0]
    } else {
      // week (default)
      const weekAgo = new Date(now)
      weekAgo.setDate(now.getDate() - 7)
      startDate = weekAgo.toISOString().split('T')[0]
    }
  }

  // Fetch all employees with their hourly rates
  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select(`
      id,
      hourly_rate,
      contract_type,
      profiles!inner(
        id,
        full_name,
        role
      )
    `)
    .is('date_terminated', null)

  if (employeesError) {
    return NextResponse.json({ error: employeesError.message }, { status: 500 })
  }

  // Fetch clock records for the period
  const { data: clockRecords, error: clockError } = await supabase
    .from('clock_in_out')
    .select('*')
    .gte('clock_in_time', `${startDate}T00:00:00`)
    .lte('clock_in_time', `${endDate}T23:59:59`)
    .not('clock_out_time', 'is', null)

  if (clockError) {
    return NextResponse.json({ error: clockError.message }, { status: 500 })
  }

  // Calculate hours and costs per employee
  const OVERTIME_THRESHOLD = 40 // hours per week
  const OVERTIME_MULTIPLIER = 1.5

  const employeeMetrics: WorkedHours[] = (employees || []).map((employee) => {
    // Filter clock records for this employee
    const employeeClocks = (clockRecords || []).filter(
      (record) => record.employee_id === employee.id
    )

    // Calculate total hours
    const totalHours = employeeClocks.reduce((sum, record) => {
      return sum + calculateHours(record.clock_in_time, record.clock_out_time)
    }, 0)

    // Determine overtime (simplified - assumes weekly period)
    let regularHours = totalHours
    let overtimeHours = 0

    if (period === 'week' && totalHours > OVERTIME_THRESHOLD) {
      regularHours = OVERTIME_THRESHOLD
      overtimeHours = totalHours - OVERTIME_THRESHOLD
    }

    // Calculate labor cost
    const regularCost = regularHours * (employee.hourly_rate || 0)
    const overtimeCost = overtimeHours * (employee.hourly_rate || 0) * OVERTIME_MULTIPLIER
    const laborCost = regularCost + overtimeCost

    const profile = Array.isArray(employee.profiles) ? employee.profiles[0] : employee.profiles

    return {
      employee_id: employee.id,
      employee_name: profile?.full_name || 'Unknown',
      total_hours: Math.round(totalHours * 100) / 100,
      regular_hours: Math.round(regularHours * 100) / 100,
      overtime_hours: Math.round(overtimeHours * 100) / 100,
      labor_cost: Math.round(laborCost * 100) / 100,
    }
  })

  // Calculate totals
  const totals = {
    total_hours: employeeMetrics.reduce((sum, m) => sum + m.total_hours, 0),
    total_labor_cost: employeeMetrics.reduce((sum, m) => sum + m.labor_cost, 0),
    total_overtime_hours: employeeMetrics.reduce((sum, m) => sum + m.overtime_hours, 0),
  }

  // Identify overtime alerts (employees with overtime)
  const overtimeAlerts = employeeMetrics
    .filter((m) => m.overtime_hours > 0)
    .map((m) => ({
      employee_id: m.employee_id,
      employee_name: m.employee_name,
      overtime_hours: m.overtime_hours,
    }))

  return NextResponse.json({
    period: {
      start_date: startDate,
      end_date: endDate,
      type: period,
    },
    employees: employeeMetrics,
    totals: {
      total_hours: Math.round(totals.total_hours * 100) / 100,
      total_labor_cost: Math.round(totals.total_labor_cost * 100) / 100,
      total_overtime_hours: Math.round(totals.total_overtime_hours * 100) / 100,
    },
    overtime_alerts: overtimeAlerts,
  })
}
