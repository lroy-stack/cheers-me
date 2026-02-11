import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createPlanSchema = z.object({
  week_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
})

/**
 * GET /api/staff/task-plans?week=YYYY-MM-DD
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner', 'waiter', 'bar', 'kitchen', 'dj'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const week = searchParams.get('week')

  let query = supabase
    .from('weekly_task_plans')
    .select(`
      *,
      planned_tasks(
        *,
        assigned_employee:employees(
          id,
          profile:profiles(id, full_name, role, avatar_url)
        ),
        section:floor_sections(id, name),
        template:staff_task_templates(id, title)
      )
    `)
    .order('week_start_date', { ascending: false })

  if (week) {
    query = query.eq('week_start_date', week)
  }

  const { data, error } = await query

  if (error) {
    if (error.message?.includes('relation') || error.code === '42P01') {
      return NextResponse.json(
        { error: 'Task plan tables not configured. Run migration 043.' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If querying specific week, return single plan or null
  if (week) {
    return NextResponse.json(data?.[0] || null)
  }

  return NextResponse.json(data || [])
}

/**
 * POST /api/staff/task-plans — Create a new weekly task plan
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

  const validation = createPlanSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.errors },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Check if a plan already exists for this week
  const { data: existing } = await supabase
    .from('weekly_task_plans')
    .select('id, status')
    .eq('week_start_date', validation.data.week_start_date)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: 'A plan already exists for this week', existing_id: existing.id },
      { status: 409 }
    )
  }

  const { data, error } = await supabase
    .from('weekly_task_plans')
    .insert({
      week_start_date: validation.data.week_start_date,
      notes: validation.data.notes,
      created_by: authResult.data.user.id,
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
