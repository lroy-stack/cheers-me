import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/staff/employees/[id]/summary
 * Returns aggregated stats for an employee:
 * - weekHours, monthHours (from clock_in_out)
 * - totalShifts (upcoming shifts count)
 * - avgRating, totalSurveys (from shift_survey_responses)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params
  const supabase = await createClient()

  const now = new Date()

  // Week start (Monday)
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() + mondayOffset)
  weekStart.setHours(0, 0, 0, 0)

  // Month start
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const weekStartISO = weekStart.toISOString()
  const monthStartISO = monthStart.toISOString()
  const nowISO = now.toISOString()
  const todayDate = now.toISOString().split('T')[0]

  // Two weeks from now for upcoming shifts
  const twoWeeksFromNow = new Date(now)
  twoWeeksFromNow.setDate(now.getDate() + 14)
  const twoWeeksDate = twoWeeksFromNow.toISOString().split('T')[0]

  // Run all queries in parallel
  const [weekClockResult, monthClockResult, shiftsResult, surveysResult] = await Promise.all([
    // Week hours from clock_in_out
    supabase
      .from('clock_in_out')
      .select('clock_in_time, clock_out_time')
      .eq('employee_id', id)
      .gte('clock_in_time', weekStartISO)
      .lte('clock_in_time', nowISO)
      .not('clock_out_time', 'is', null),

    // Month hours from clock_in_out
    supabase
      .from('clock_in_out')
      .select('clock_in_time, clock_out_time')
      .eq('employee_id', id)
      .gte('clock_in_time', monthStartISO)
      .lte('clock_in_time', nowISO)
      .not('clock_out_time', 'is', null),

    // Upcoming shifts (next 2 weeks)
    supabase
      .from('shifts')
      .select('id', { count: 'exact', head: true })
      .eq('employee_id', id)
      .gte('date', todayDate)
      .lte('date', twoWeeksDate),

    // Survey responses
    supabase
      .from('shift_survey_responses')
      .select('rating')
      .eq('employee_id', id),
  ])

  // Calculate week hours
  let weekMinutes = 0
  if (weekClockResult.data) {
    for (const r of weekClockResult.data) {
      const inTime = new Date(r.clock_in_time).getTime()
      const outTime = new Date(r.clock_out_time!).getTime()
      weekMinutes += (outTime - inTime) / 60000
    }
  }

  // Calculate month hours
  let monthMinutes = 0
  if (monthClockResult.data) {
    for (const r of monthClockResult.data) {
      const inTime = new Date(r.clock_in_time).getTime()
      const outTime = new Date(r.clock_out_time!).getTime()
      monthMinutes += (outTime - inTime) / 60000
    }
  }

  // Average rating
  let avgRating: number | null = null
  let totalSurveys = 0
  if (surveysResult.data && surveysResult.data.length > 0) {
    totalSurveys = surveysResult.data.length
    const sum = surveysResult.data.reduce((acc, s) => acc + s.rating, 0)
    avgRating = Math.round((sum / totalSurveys) * 10) / 10
  }

  return NextResponse.json({
    weekHours: Math.round((weekMinutes / 60) * 10) / 10,
    monthHours: Math.round((monthMinutes / 60) * 10) / 10,
    totalShifts: shiftsResult.count ?? 0,
    avgRating,
    totalSurveys,
  })
}
