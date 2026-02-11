import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createSchema = z.object({
  section_id: z.string().uuid(),
  employee_id: z.string().uuid(),
  shift_id: z.string().uuid().optional(),
  assignment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shift_type: z.enum(['morning', 'afternoon', 'night']).optional(),
  notes: z.string().optional(),
})

/**
 * GET /api/staff/zones/assignments?date=YYYY-MM-DD&shift_type=morning
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner', 'waiter', 'bar', 'kitchen'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const shiftType = searchParams.get('shift_type')

  let query = supabase
    .from('zone_assignments')
    .select(`
      *,
      section:floor_sections(id, name, description, is_active),
      employee:employees(
        id,
        profile:profiles(id, full_name, role, avatar_url)
      )
    `)
    .order('assignment_date')

  if (date) query = query.eq('assignment_date', date)
  if (shiftType) query = query.eq('shift_type', shiftType)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

/**
 * POST /api/staff/zones/assignments
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validation = createSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.errors },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('zone_assignments')
    .upsert(
      { ...validation.data, assigned_by: authResult.data.user.id },
      { onConflict: 'section_id,employee_id,assignment_date,shift_type' }
    )
    .select(`
      *,
      section:floor_sections(id, name, description, is_active),
      employee:employees(
        id,
        profile:profiles(id, full_name, role, avatar_url)
      )
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
