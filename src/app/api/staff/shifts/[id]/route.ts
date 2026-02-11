import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating shift
const updateShiftSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  shift_type: z.enum(['morning', 'afternoon', 'night']).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  break_duration_minutes: z.number().min(0).optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
})

/**
 * GET /api/staff/shifts/[id]
 * Get a specific shift by ID
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params
  const supabase = await createClient()

  const { data: shift, error } = await supabase
    .from('shifts')
    .select(`
      *,
      employee:employees(
        id,
        profile:profiles(
          id,
          full_name,
          role,
          phone
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(shift)
}

/**
 * PATCH /api/staff/shifts/[id]
 * Update a shift
 * - Managers can update any shift
 * - Staff can only update notes on their own shifts (enforced by RLS)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { data: userData } = authResult
  const { id } = await params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = updateShiftSchema.safeParse(body)
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

  // Check if user is manager/admin
  const isManager = ['admin', 'manager'].includes(userData.profile.role as string)

  // If not a manager, only allow updating notes
  if (!isManager) {
    const allowedFields = ['notes']
    const attemptedFields = Object.keys(validation.data)
    const unauthorizedFields = attemptedFields.filter(
      (field) => !allowedFields.includes(field)
    )

    if (unauthorizedFields.length > 0) {
      return NextResponse.json(
        { error: 'You can only update notes on your shifts' },
        { status: 403 }
      )
    }
  }

  // Update shift
  const { data: updatedShift, error } = await supabase
    .from('shifts')
    .update({
      ...validation.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
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
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updatedShift)
}

/**
 * DELETE /api/staff/shifts/[id]
 * Delete a shift (managers/admins only)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params
  const supabase = await createClient()

  const { error } = await supabase
    .from('shifts')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
