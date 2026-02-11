import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updateLeaveSchema = z.object({
  status: z.enum(['approved', 'rejected', 'cancelled']).optional(),
  review_notes: z.string().optional(),
})

/**
 * PATCH /api/staff/leave/[id]
 * Approve/reject/cancel a leave request
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validation = updateLeaveSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.errors },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { data: userData } = authResult
  const isManager = ['admin', 'manager'].includes(userData.profile.role as string)

  // Get current request
  const { data: currentRequest } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (!currentRequest) {
    return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
  }

  // Staff can only cancel their own pending requests
  if (!isManager && validation.data.status !== 'cancelled') {
    return NextResponse.json({ error: 'Only managers can approve/reject leave requests' }, { status: 403 })
  }

  const updateData: Record<string, unknown> = {
    ...validation.data,
    updated_at: new Date().toISOString(),
  }

  if (validation.data.status === 'approved' || validation.data.status === 'rejected') {
    updateData.reviewed_by = userData.user.id
    updateData.reviewed_at = new Date().toISOString()
  }

  // If approving, update used_days in entitlement
  if (validation.data.status === 'approved') {
    const year = new Date(currentRequest.start_date).getFullYear()
    const { data: entitlement } = await supabase
      .from('leave_entitlements')
      .select('*')
      .eq('employee_id', currentRequest.employee_id)
      .eq('year', year)
      .eq('leave_type', currentRequest.leave_type)
      .maybeSingle()

    if (entitlement) {
      await supabase
        .from('leave_entitlements')
        .update({
          used_days: entitlement.used_days + currentRequest.total_days,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entitlement.id)
    }
  }

  const { data: updatedRequest, error } = await supabase
    .from('leave_requests')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      employee:employees(
        id,
        profile:profiles(id, full_name, role)
      )
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updatedRequest)
}
