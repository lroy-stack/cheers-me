import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createAssignmentSchema = z.object({
  guide_code: z.string().min(1),
  assigned_to: z.string().uuid().nullable().optional(),
  assigned_role: z.string().nullable().optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const employeeId = searchParams.get('employee_id')
  const guideCode = searchParams.get('guide_code')

  let query = supabase
    .from('training_assignments')
    .select(`
      *,
      employee:employees!training_assignments_assigned_to_fkey(
        id,
        profile:profiles(
          id,
          full_name,
          role
        )
      ),
      assigner:profiles!training_assignments_assigned_by_fkey(
        id,
        full_name
      )
    `)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (employeeId) query = query.eq('assigned_to', employeeId)
  if (guideCode) query = query.eq('guide_code', guideCode)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validation = createAssignmentSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('training_assignments')
    .insert({
      guide_code: validation.data.guide_code,
      assigned_to: validation.data.assigned_to ?? null,
      assigned_role: validation.data.assigned_role ?? null,
      assigned_by: authResult.data.user.id,
      due_date: validation.data.due_date ?? null,
      status: 'pending',
    })
    .select(`
      *,
      employee:employees!training_assignments_assigned_to_fkey(
        id,
        profile:profiles(
          id,
          full_name,
          role
        )
      ),
      assigner:profiles!training_assignments_assigned_by_fkey(
        id,
        full_name
      )
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
