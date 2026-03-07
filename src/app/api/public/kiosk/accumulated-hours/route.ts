import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireKioskSession, validateEmployeeMatch } from '@/lib/kiosk/auth-middleware'

const schema = z.object({
  employee_id: z.string().uuid(),
})

export async function GET(request: NextRequest) {
  // Verify session token
  const authResult = await requireKioskSession(request)
  if (!authResult.success) {
    return authResult.response
  }

  const { searchParams } = new URL(request.url)
  const validation = schema.safeParse({
    employee_id: searchParams.get('employee_id'),
  })

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid employee_id' },
      { status: 400 }
    )
  }

  const { employee_id } = validation.data

  // Verify employee_id matches session token
  const mismatchError = await validateEmployeeMatch(authResult.employeeId, employee_id, request)
  if (mismatchError) {
    return mismatchError
  }
  const supabase = createAdminClient()

  // Calculate week hours (Monday to now)
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Monday is 1
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)

  const { data: weekRecords } = await supabase
    .from('clock_in_out')
    .select(`
      clock_in_time,
      clock_out_time,
      breaks:clock_breaks(start_time, end_time)
    `)
    .eq('employee_id', employee_id)
    .gte('clock_in_time', monday.toISOString())
    .not('clock_out_time', 'is', null)

  let weekMinutes = 0
  if (weekRecords) {
    for (const record of weekRecords) {
      const start = new Date(record.clock_in_time).getTime()
      const end = new Date(record.clock_out_time as string).getTime()
      let gross = (end - start) / 60000
      // Subtract completed breaks
      const breaks = record.breaks as { start_time: string; end_time: string | null }[] | null
      if (breaks) {
        for (const b of breaks) {
          if (b.end_time) {
            gross -= (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 60000
          }
        }
      }
      weekMinutes += gross
    }
  }

  // Calculate month hours (1st of current month to now)
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  firstOfMonth.setHours(0, 0, 0, 0)

  const { data: monthRecords } = await supabase
    .from('clock_in_out')
    .select(`
      clock_in_time,
      clock_out_time,
      breaks:clock_breaks(start_time, end_time)
    `)
    .eq('employee_id', employee_id)
    .gte('clock_in_time', firstOfMonth.toISOString())
    .not('clock_out_time', 'is', null)

  let monthMinutes = 0
  if (monthRecords) {
    for (const record of monthRecords) {
      const start = new Date(record.clock_in_time).getTime()
      const end = new Date(record.clock_out_time as string).getTime()
      let gross = (end - start) / 60000
      const breaks = record.breaks as { start_time: string; end_time: string | null }[] | null
      if (breaks) {
        for (const b of breaks) {
          if (b.end_time) {
            gross -= (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 60000
          }
        }
      }
      monthMinutes += gross
    }
  }

  return NextResponse.json({
    weekHours: Math.round((weekMinutes / 60) * 10) / 10,
    monthHours: Math.round((monthMinutes / 60) * 10) / 10,
  })
}
