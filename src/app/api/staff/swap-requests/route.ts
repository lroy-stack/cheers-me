import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating swap request
const createSwapRequestSchema = z.object({
  shift_id: z.string().uuid(),
  offered_to: z.string().uuid(),
  reason: z.string().optional(),
})

// Validation schema for updating swap request status
const updateSwapRequestSchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected', 'cancelled']),
})

/**
 * GET /api/staff/swap-requests
 * List swap requests
 * - Managers can see all
 * - Staff can see only requests involving them (via RLS)
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
  const status = searchParams.get('status')

  let query = supabase
    .from('shift_swap_requests')
    .select(`
      *,
      shift:shifts(
        id,
        date,
        shift_type,
        start_time,
        end_time
      ),
      requester:requested_by(
        id,
        profile:profiles(
          id,
          full_name,
          role
        )
      ),
      offered_employee:offered_to(
        id,
        profile:profiles(
          id,
          full_name,
          role
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data: swapRequests, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(swapRequests)
}

/**
 * POST /api/staff/swap-requests
 * Create a new shift swap request
 * Staff can request to swap their shifts with another employee
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
  const validation = createSwapRequestSchema.safeParse(body)
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

  // Verify the shift belongs to the requesting employee
  const { data: shift } = await supabase
    .from('shifts')
    .select('employee_id')
    .eq('id', validation.data.shift_id)
    .single()

  if (!shift) {
    return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
  }

  if (shift.employee_id !== employeeRecord.id) {
    return NextResponse.json(
      { error: 'You can only request to swap your own shifts' },
      { status: 403 }
    )
  }

  // Cannot offer to yourself
  if (validation.data.offered_to === employeeRecord.id) {
    return NextResponse.json(
      { error: 'Cannot offer shift swap to yourself' },
      { status: 400 }
    )
  }

  // Create swap request
  const { data: swapRequest, error } = await supabase
    .from('shift_swap_requests')
    .insert({
      shift_id: validation.data.shift_id,
      requested_by: employeeRecord.id,
      offered_to: validation.data.offered_to,
      reason: validation.data.reason,
      status: 'pending',
    })
    .select(`
      *,
      shift:shifts(
        id,
        date,
        shift_type,
        start_time,
        end_time
      ),
      requester:requested_by(
        id,
        profile:profiles(
          id,
          full_name,
          role
        )
      ),
      offered_employee:offered_to(
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

  return NextResponse.json(swapRequest, { status: 201 })
}

/**
 * PATCH /api/staff/swap-requests
 * Update swap request status
 * Staff can accept/reject requests offered to them
 * Managers can update any request
 */
export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth()

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { searchParams } = new URL(request.url)
  const requestId = searchParams.get('id')

  if (!requestId) {
    return NextResponse.json(
      { error: 'Request ID is required (use ?id=xxx)' },
      { status: 400 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = updateSwapRequestSchema.safeParse(body)
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

  // Update swap request (RLS handles authorization)
  const { data: updatedRequest, error } = await supabase
    .from('shift_swap_requests')
    .update({
      status: validation.data.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select(`
      *,
      shift:shifts(
        id,
        date,
        shift_type,
        start_time,
        end_time
      ),
      requester:requested_by(
        id,
        profile:profiles(
          id,
          full_name,
          role
        )
      ),
      offered_employee:offered_to(
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
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Swap request not found or you lack permission' },
        { status: 404 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If accepted, swap the shift assignment
  if (validation.data.status === 'accepted' && updatedRequest) {
    const { error: swapError } = await supabase
      .from('shifts')
      .update({
        employee_id: updatedRequest.offered_to,
        updated_at: new Date().toISOString(),
      })
      .eq('id', updatedRequest.shift_id)

    if (swapError) {
      return NextResponse.json(
        { error: 'Failed to swap shift assignment' },
        { status: 500 }
      )
    }
  }

  return NextResponse.json(updatedRequest)
}
