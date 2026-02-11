import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireKioskSession, validateEmployeeMatch } from '@/lib/kiosk/auth-middleware'

const schema = z.object({
  employee_id: z.string().uuid(),
  clock_record_id: z.string().uuid(),
  action: z.enum(['start', 'end']),
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

  const { employee_id, clock_record_id, action } = validation.data

  // Verify employee_id matches session token
  const mismatchError = await validateEmployeeMatch(authResult.employeeId, employee_id, request)
  if (mismatchError) {
    return mismatchError
  }
  const supabase = createAdminClient()

  // Verify clock record belongs to employee and is open
  const { data: clockRecord, error: clockError } = await supabase
    .from('clock_in_out')
    .select('id')
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

  if (action === 'start') {
    // Check no active break
    const { data: existingBreak } = await supabase
      .from('clock_breaks')
      .select('id')
      .eq('clock_record_id', clock_record_id)
      .is('end_time', null)
      .single()

    if (existingBreak) {
      return NextResponse.json({ error: 'Break already active' }, { status: 400 })
    }

    const { data: breakRecord, error: breakError } = await supabase
      .from('clock_breaks')
      .insert({
        clock_record_id,
        start_time: new Date().toISOString(),
      })
      .select()
      .single()

    if (breakError) {
      return NextResponse.json({ error: breakError.message }, { status: 500 })
    }

    return NextResponse.json({ break_record: breakRecord }, { status: 201 })
  } else {
    // End break
    const { data: activeBreak, error: findError } = await supabase
      .from('clock_breaks')
      .select('id')
      .eq('clock_record_id', clock_record_id)
      .is('end_time', null)
      .single()

    if (findError || !activeBreak) {
      return NextResponse.json({ error: 'No active break found' }, { status: 404 })
    }

    const now = new Date().toISOString()
    const { data: breakRecord, error: updateError } = await supabase
      .from('clock_breaks')
      .update({ end_time: now, updated_at: now })
      .eq('id', activeBreak.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ break_record: breakRecord })
  }
}
