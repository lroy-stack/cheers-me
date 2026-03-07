import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const breakSchema = z.object({
  clock_record_id: z.string().uuid(),
  action: z.enum(['start', 'end']),
})

/**
 * POST /api/staff/clock/break
 * Start or end a break for an authenticated employee.
 * Feature S2.B4 — Break support on staff clock page
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { data: userData } = authResult
  const supabase = await createClient()

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validation = breakSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.errors },
      { status: 400 }
    )
  }

  const { clock_record_id, action } = validation.data

  // Get employee record
  const { data: employeeRecord } = await supabase
    .from('employees')
    .select('id')
    .eq('profile_id', userData.user.id)
    .single()

  if (!employeeRecord) {
    return NextResponse.json({ error: 'Employee record not found' }, { status: 404 })
  }

  // Verify clock record belongs to this employee and is still open
  const { data: clockRecord, error: clockError } = await supabase
    .from('clock_in_out')
    .select('id')
    .eq('id', clock_record_id)
    .eq('employee_id', employeeRecord.id)
    .is('clock_out_time', null)
    .single()

  if (clockError || !clockRecord) {
    return NextResponse.json(
      { error: 'Clock record not found or already closed' },
      { status: 404 }
    )
  }

  if (action === 'start') {
    // Check if there is already an active break
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
      return NextResponse.json({ error: 'Failed to start break' }, { status: 500 })
    }

    return NextResponse.json({ break_record: breakRecord }, { status: 201 })
  } else {
    // End break — find the active break
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
      return NextResponse.json({ error: 'Failed to end break' }, { status: 500 })
    }

    return NextResponse.json({ break_record: breakRecord })
  }
}
