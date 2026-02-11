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
    .select('clock_in_time, clock_out_time')
    .eq('employee_id', employee_id)
    .gte('clock_in_time', monday.toISOString())
    .not('clock_out_time', 'is', null)

  let weekHours = 0
  if (weekRecords) {
    for (const record of weekRecords) {
      const start = new Date(record.clock_in_time).getTime()
      const end = new Date(record.clock_out_time).getTime()
      weekHours += (end - start) / (1000 * 60 * 60)
    }
  }

  // Calculate month hours (1st of current month to now)
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  firstOfMonth.setHours(0, 0, 0, 0)

  const { data: monthRecords } = await supabase
    .from('clock_in_out')
    .select('clock_in_time, clock_out_time')
    .eq('employee_id', employee_id)
    .gte('clock_in_time', firstOfMonth.toISOString())
    .not('clock_out_time', 'is', null)

  let monthHours = 0
  if (monthRecords) {
    for (const record of monthRecords) {
      const start = new Date(record.clock_in_time).getTime()
      const end = new Date(record.clock_out_time).getTime()
      monthHours += (end - start) / (1000 * 60 * 60)
    }
  }

  return NextResponse.json({
    weekHours: Math.round(weekHours * 10) / 10,
    monthHours: Math.round(monthHours * 10) / 10,
  })
}
