import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating/updating availability
const availabilitySchema = z.object({
  employee_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  available: z.boolean(),
  reason: z.string().optional(),
})

/**
 * GET /api/staff/availability
 * List availability records
 * - Managers can see all
 * - Staff can see only their own (via RLS)
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

  let query = supabase
    .from('availability')
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

  const { data: availability, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(availability)
}

/**
 * POST /api/staff/availability
 * Create or update availability record
 * Staff can mark their own availability
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

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = availabilitySchema.safeParse(body)
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

  // Verify that staff can only set their own availability (unless manager/admin)
  const isManager = ['admin', 'manager'].includes(userData.profile.role as string)

  if (!isManager) {
    // Get the employee record for the current user
    const { data: employeeRecord } = await supabase
      .from('employees')
      .select('id')
      .eq('profile_id', userData.user.id)
      .single()

    if (!employeeRecord || employeeRecord.id !== validation.data.employee_id) {
      return NextResponse.json(
        { error: 'You can only set your own availability' },
        { status: 403 }
      )
    }
  }

  // Upsert availability (insert or update if exists)
  const { data: availabilityRecord, error } = await supabase
    .from('availability')
    .upsert(
      {
        employee_id: validation.data.employee_id,
        date: validation.data.date,
        available: validation.data.available,
        reason: validation.data.reason,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'employee_id,date',
      }
    )
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

  return NextResponse.json(availabilityRecord, { status: 201 })
}
