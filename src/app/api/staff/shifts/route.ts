import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating shift
const createShiftSchema = z.object({
  employee_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shift_type: z.enum(['morning', 'afternoon', 'night', 'split']),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  break_duration_minutes: z.number().min(0).default(0),
  schedule_plan_id: z.string().uuid().optional(),
  notes: z.string().optional(),
})

/**
 * GET /api/staff/shifts
 * List shifts
 * - Managers/admins can see all shifts
 * - Staff can see only their own shifts (filtered by employee_id via RLS)
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

  // Query params for filtering
  const employeeId = searchParams.get('employee_id')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const status = searchParams.get('status')

  let query = supabase
    .from('shifts')
    .select(`
      *,
      employee:employees(
        id,
        profile:profiles(
          id,
          full_name,
          role
        )
      )
    `)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  // Apply filters
  if (employeeId) {
    query = query.eq('employee_id', employeeId)
  }

  if (startDate) {
    query = query.gte('date', startDate)
  }

  if (endDate) {
    query = query.lte('date', endDate)
  }

  if (status) {
    query = query.eq('status', status)
  }

  const { data: shifts, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(shifts)
}

/**
 * POST /api/staff/shifts
 * Create a new shift (managers/admins only)
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = createShiftSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: validation.error.errors,
      },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Check for shift conflicts (same employee, overlapping times on same date)
  const { data: existingShifts } = await supabase
    .from('shifts')
    .select('id, start_time, end_time')
    .eq('employee_id', validation.data.employee_id)
    .eq('date', validation.data.date)

  if (existingShifts && existingShifts.length > 0) {
    // Simple overlap check - you may want more sophisticated logic
    const hasOverlap = existingShifts.some((shift) => {
      // This is a basic check, real overlap detection would be more complex
      return (
        shift.start_time === validation.data.start_time ||
        shift.end_time === validation.data.end_time
      )
    })

    if (hasOverlap) {
      return NextResponse.json(
        { error: 'Employee already has a shift at this time' },
        { status: 400 }
      )
    }
  }

  // Create shift
  const { data: newShift, error } = await supabase
    .from('shifts')
    .insert({
      employee_id: validation.data.employee_id,
      date: validation.data.date,
      shift_type: validation.data.shift_type,
      start_time: validation.data.start_time,
      end_time: validation.data.end_time,
      break_duration_minutes: validation.data.break_duration_minutes,
      schedule_plan_id: validation.data.schedule_plan_id || null,
      notes: validation.data.notes,
      status: 'scheduled',
    })
    .select(`
      *,
      employee:employees(
        id,
        profile:profiles(
          id,
          full_name,
          role
        )
      )
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(newShift, { status: 201 })
}
