import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createRecordSchema = z.object({
  guide_code: z.string().min(1),
  action: z.enum(['viewed', 'downloaded', 'test_started', 'test_completed', 'test_passed', 'test_failed']),
  language: z.string().length(2).optional(),
  score: z.number().int().min(0).max(100).nullable().optional(),
  answers: z.record(z.number()).nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const guideCode = searchParams.get('guide_code')
  const employeeId = searchParams.get('employee_id')

  let query = supabase
    .from('training_records')
    .select('*')
    .order('created_at', { ascending: false })

  if (guideCode) query = query.eq('guide_code', guideCode)
  if (employeeId) query = query.eq('employee_id', employeeId)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validation = createRecordSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
  }

  const supabase = await createClient()

  // Find the current user's employee record
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('profile_id', authResult.data.user.id)
    .single()

  if (!employee) {
    return NextResponse.json({ error: 'Employee record not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('training_records')
    .insert({
      employee_id: employee.id,
      guide_code: validation.data.guide_code,
      action: validation.data.action,
      language: validation.data.language || 'en',
      score: validation.data.score ?? null,
      answers: validation.data.answers ?? null,
      metadata: validation.data.metadata ?? null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
