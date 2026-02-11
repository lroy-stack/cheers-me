import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { ClockOutSummary } from '@/types'
import { requireKioskSession, validateEmployeeMatch } from '@/lib/kiosk/auth-middleware'

const schema = z.object({
  employee_id: z.string().uuid(),
  clock_record_id: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  // Verify session token
  const authResult = await requireKioskSession(request)
  if (!authResult.success) {
    return authResult.response
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validation = schema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.errors },
      { status: 400 }
    )
  }

  const { employee_id, clock_record_id } = validation.data

  // Verify employee_id matches session token
  const mismatchError = await validateEmployeeMatch(authResult.employeeId, employee_id, request)
  if (mismatchError) {
    return mismatchError
  }
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // Verify clock record belongs to employee and is open
  const { data: clockRecord, error: clockError } = await supabase
    .from('clock_in_out')
    .select('id, employee_id, clock_in_time, clock_out_time, shift_id')
    .eq('id', clock_record_id)
    .eq('employee_id', employee_id)
    .is('clock_out_time', null)
    .single()

  if (clockError || !clockRecord) {
    return NextResponse.json(
      { error: 'Clock record not found or already closed' },
      { status: 404 }
    )
  }

  // Auto-close active break if any
  const { data: activeBreak } = await supabase
    .from('clock_breaks')
    .select('id')
    .eq('clock_record_id', clock_record_id)
    .is('end_time', null)
    .single()

  if (activeBreak) {
    await supabase
      .from('clock_breaks')
      .update({ end_time: now, updated_at: now })
      .eq('id', activeBreak.id)
  }

  // Close the clock record
  await supabase
    .from('clock_in_out')
    .update({ clock_out_time: now, updated_at: now })
    .eq('id', clock_record_id)

  // Calculate break minutes
  const { data: breaks } = await supabase
    .from('clock_breaks')
    .select('start_time, end_time')
    .eq('clock_record_id', clock_record_id)

  let breakMinutes = 0
  if (breaks) {
    for (const b of breaks) {
      const start = new Date(b.start_time).getTime()
      const end = new Date(b.end_time ?? now).getTime()
      breakMinutes += (end - start) / 60000
    }
  }

  const clockInTime = new Date(clockRecord.clock_in_time).getTime()
  const clockOutTime = new Date(now).getTime()
  const totalMinutes = Math.round((clockOutTime - clockInTime) / 60000)
  const netMinutes = Math.round(totalMinutes - breakMinutes)

  // Fetch scheduled shift if linked
  let scheduledShift: ClockOutSummary['scheduled_shift'] = null
  if (clockRecord.shift_id) {
    const { data: shift } = await supabase
      .from('shifts')
      .select('start_time, end_time, shift_type')
      .eq('id', clockRecord.shift_id)
      .single()

    if (shift) {
      scheduledShift = shift
    }
  }

  const summary: ClockOutSummary = {
    clock_record_id,
    clock_in_time: clockRecord.clock_in_time,
    clock_out_time: now,
    total_minutes: totalMinutes,
    break_minutes: Math.round(breakMinutes),
    net_minutes: netMinutes,
    scheduled_shift: scheduledShift,
  }

  return NextResponse.json(summary)
}
