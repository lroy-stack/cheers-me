import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for clock-in
const clockInSchema = z.object({
  shift_id: z.string().uuid().optional(),
})

// Validation schema for clock-out
const clockOutSchema = z.object({
  clock_record_id: z.string().uuid(),
})

/**
 * GET /api/staff/clock
 * Get clock records for the current user or all (if manager)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const employeeId = searchParams.get('employee_id')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')

  let query = supabase
    .from('clock_in_out')
    .select(`
      *,
      employee:employees(
        id,
        profile:profiles(
          id,
          full_name,
          role
        )
      ),
      shift:shifts(
        id,
        date,
        shift_type,
        start_time,
        end_time
      ),
      breaks:clock_breaks(*)
    `)
    .order('clock_in_time', { ascending: false })

  // Apply filters
  if (employeeId) {
    query = query.eq('employee_id', employeeId)
  }

  if (startDate) {
    query = query.gte('clock_in_time', startDate)
  }

  if (endDate) {
    query = query.lte('clock_in_time', endDate)
  }

  const { data: clockRecords, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(clockRecords)
}

/**
 * POST /api/staff/clock
 * Clock in or clock out
 * Use action query param: ?action=in or ?action=out
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth()

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { data: userData } = authResult
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  // Get employee record for current user
  const { data: employeeRecord } = await supabase
    .from('employees')
    .select('id')
    .eq('profile_id', userData.user.id)
    .single()

  if (!employeeRecord) {
    return NextResponse.json(
      { error: 'Employee record not found' },
      { status: 404 }
    )
  }

  if (action === 'in') {
    // Clock in
    let body
    try {
      body = await request.json()
    } catch {
      body = {}
    }

    const validation = clockInSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    // Check if already clocked in (no clock_out_time yet)
    const { data: existingClock } = await supabase
      .from('clock_in_out')
      .select('id')
      .eq('employee_id', employeeRecord.id)
      .is('clock_out_time', null)
      .single()

    if (existingClock) {
      return NextResponse.json(
        { error: 'You are already clocked in' },
        { status: 400 }
      )
    }

    // Create clock-in record
    const { data: clockRecord, error } = await supabase
      .from('clock_in_out')
      .insert({
        employee_id: employeeRecord.id,
        shift_id: validation.data.shift_id,
        clock_in_time: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(clockRecord, { status: 201 })
  } else if (action === 'out') {
    // Clock out
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const validation = clockOutSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    // Update clock record with clock_out_time
    const { data: clockRecord, error } = await supabase
      .from('clock_in_out')
      .update({
        clock_out_time: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', validation.data.clock_record_id)
      .eq('employee_id', employeeRecord.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Clock record not found or already clocked out' },
          { status: 404 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(clockRecord)
  } else {
    return NextResponse.json(
      { error: 'Invalid action. Use ?action=in or ?action=out' },
      { status: 400 }
    )
  }
}
