import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const reviewSchema = z.object({
  status: z.enum(['completed', 'flagged']),
  review_notes: z.string().optional(),
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
 * POST /api/staff/compliance/[id]/review
 * Manager reviews a compliance record
 * Auth: admin/manager/owner only
 */
export async function POST(
  request: NextRequest,
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

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validation = reviewSchema.safeParse(body)
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

  const { data: updatedRecord, error } = await supabase
    .from('compliance_records')
    .update({
      reviewed_by: userData.user.id,
      reviewed_at: new Date().toISOString(),
      status: validation.data.status,
      review_notes: validation.data.review_notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(RECORD_SELECT)
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

  return NextResponse.json(updatedRecord)
}
