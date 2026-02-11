import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  employee_id: z.string().uuid(),
})

export async function POST(request: NextRequest) {
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

  const { employee_id } = validation.data
  const supabase = createAdminClient()

  // Verify employee exists and is active
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('id, kiosk_pin')
    .eq('id', employee_id)
    .eq('employment_status', 'active')
    .single()

  if (empError || !employee || !employee.kiosk_pin) {
    return NextResponse.json({ error: 'Employee not found or inactive' }, { status: 404 })
  }

  // Check no active clock record (prevent double clock-in)
  const { data: existingClock } = await supabase
    .from('clock_in_out')
    .select('id')
    .eq('employee_id', employee_id)
    .is('clock_out_time', null)
    .single()

  if (existingClock) {
    return NextResponse.json({ error: 'Already clocked in' }, { status: 400 })
  }

  // Auto-find today's shift for linking
  const today = new Date().toISOString().split('T')[0]
  const { data: todayShift } = await supabase
    .from('shifts')
    .select('id, shift_type, start_time, end_time')
    .eq('employee_id', employee_id)
    .eq('date', today)
    .single()

  // Create clock-in record
  const { data: clockRecord, error: clockError } = await supabase
    .from('clock_in_out')
    .insert({
      employee_id,
      shift_id: todayShift?.id ?? null,
      clock_in_time: new Date().toISOString(),
    })
    .select()
    .single()

  if (clockError) {
    return NextResponse.json({ error: clockError.message }, { status: 500 })
  }

  return NextResponse.json(
    { clock_record: clockRecord, shift: todayShift ?? null },
    { status: 201 }
  )
}
