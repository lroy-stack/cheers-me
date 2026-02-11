import { createAdminClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const weekStart = searchParams.get('week_start')

  if (!date && !weekStart) {
    return NextResponse.json(
      { error: 'Provide either date or week_start parameter' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  // Determine date range
  let startDate: string
  let endDate: string
  let period: string

  if (weekStart) {
    startDate = weekStart
    const end = new Date(weekStart)
    end.setDate(end.getDate() + 6)
    endDate = end.toISOString().split('T')[0]
    period = `${startDate} to ${endDate}`
  } else {
    startDate = date!
    endDate = date!
    period = date!
  }

  // Get all completed clock records in the range
  const startISO = `${startDate}T00:00:00.000Z`
  const endISO = `${endDate}T23:59:59.999Z`

  const { data: clockRecords, error } = await supabase
    .from('clock_in_out')
    .select(`
      id,
      employee_id,
      clock_in_time,
      clock_out_time,
      employee:employees(
        id,
        profile:profiles(
          full_name,
          role
        )
      ),
      breaks:clock_breaks(
        start_time,
        end_time
      )
    `)
    .gte('clock_in_time', startISO)
    .lte('clock_in_time', endISO)
    .not('clock_out_time', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Aggregate by employee
  const employeeMap = new Map<string, {
    employee_id: string
    full_name: string
    role: string
    total_minutes: number
    break_minutes: number
  }>()

  for (const record of clockRecords ?? []) {
    const empRaw = record.employee as unknown
    const empJoined = (Array.isArray(empRaw) ? empRaw[0] : empRaw) as { id: string; profile: unknown } | null
    const profileRaw = empJoined?.profile
    const profile = (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as { full_name: string | null; role: string } | null
    const empId = record.employee_id

    if (!employeeMap.has(empId)) {
      employeeMap.set(empId, {
        employee_id: empId,
        full_name: profile?.full_name || 'Unknown',
        role: profile?.role || 'unknown',
        total_minutes: 0,
        break_minutes: 0,
      })
    }

    const empEntry = employeeMap.get(empId)!

    const clockIn = new Date(record.clock_in_time).getTime()
    const clockOut = new Date(record.clock_out_time!).getTime()
    empEntry.total_minutes += (clockOut - clockIn) / 60000

    const breaks = record.breaks as { start_time: string; end_time: string | null }[] | null
    if (breaks) {
      for (const b of breaks) {
        if (b.end_time) {
          const bStart = new Date(b.start_time).getTime()
          const bEnd = new Date(b.end_time).getTime()
          empEntry.break_minutes += (bEnd - bStart) / 60000
        }
      }
    }
  }

  const employees = Array.from(employeeMap.values()).map(emp => ({
    ...emp,
    total_minutes: Math.round(emp.total_minutes),
    break_minutes: Math.round(emp.break_minutes),
    net_minutes: Math.round(emp.total_minutes - emp.break_minutes),
    percentage_of_total: 0,
  }))

  const totalNetMinutes = employees.reduce((sum, e) => sum + e.net_minutes, 0)

  // Calculate percentages
  for (const emp of employees) {
    emp.percentage_of_total = totalNetMinutes > 0
      ? Math.round((emp.net_minutes / totalNetMinutes) * 10000) / 100
      : 0
  }

  // Sort by net hours descending
  employees.sort((a, b) => b.net_minutes - a.net_minutes)

  return NextResponse.json({
    period,
    employees,
    total_net_minutes: totalNetMinutes,
  })
}
