import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updateComplianceRecordSchema = z.object({
  values: z.record(z.unknown()).optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(['completed', 'flagged', 'requires_review']).optional(),
  recorded_at: z.string().optional(),
})

const RECORD_SELECT = `
  *,
  ficha_type:compliance_ficha_types(*),
  recorded_by_employee:employees!compliance_records_recorded_by_fkey(
    id,
    profile:profiles(id, full_name, role)
  ),
  reviewer:profiles!compliance_records_reviewed_by_fkey(id, full_name)
`

/**
 * GET /api/staff/compliance/[id]
 * Get a single compliance record with details
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

  const { data: record, error } = await supabase
    .from('compliance_records')
    .select(RECORD_SELECT)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Compliance record not found' },
        { status: 404 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(record)
}

/**
 * PATCH /api/staff/compliance/[id]
 * Update a compliance record
 * Auth: owner of the record or admin/manager/owner role
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

  const { id } = await params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validation = updateComplianceRecordSchema.safeParse(body)
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
  const { data: userData } = authResult

  // Check ownership or manager role
  const { data: existingRecord, error: fetchError } = await supabase
    .from('compliance_records')
    .select('recorded_by, recorded_by_employee:employees!compliance_records_recorded_by_fkey(profile_id)')
    .eq('id', id)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Compliance record not found' },
        { status: 404 }
      )
    }
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  // Check if user is the owner or has a management role
  const isOwnerOfRecord =
    existingRecord?.recorded_by_employee &&
    !Array.isArray(existingRecord.recorded_by_employee) &&
    (existingRecord.recorded_by_employee as { profile_id: string }).profile_id === userData.user.id
  const isManager = ['admin', 'manager', 'owner'].includes(
    userData.profile.role
  )

  if (!isOwnerOfRecord && !isManager) {
    return NextResponse.json(
      { error: 'Forbidden: you can only edit your own records or have a management role' },
      { status: 403 }
    )
  }

  // Build update object
  const updateData: Record<string, unknown> = {
    ...validation.data,
    updated_at: new Date().toISOString(),
  }

  const { data: updatedRecord, error: updateError } = await supabase
    .from('compliance_records')
    .update(updateData)
    .eq('id', id)
    .select(RECORD_SELECT)
    .single()

  if (updateError) {
    if (updateError.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Compliance record not found' },
        { status: 404 }
      )
    }
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(updatedRecord)
}

/**
 * DELETE /api/staff/compliance/[id]
 * Delete a compliance record
 * Auth: admin/manager/owner only
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params
  const supabase = await createClient()

  const { error } = await supabase
    .from('compliance_records')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
