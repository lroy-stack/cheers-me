import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const copySchema = z.object({
  target_week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

/**
 * POST /api/staff/task-plans/[id]/copy
 * Copy tasks from a source plan to a new week
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id: sourcePlanId } = await params
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validation = copySchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.errors },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { target_week_start } = validation.data

  // Get source plan with tasks
  const { data: source } = await supabase
    .from('weekly_task_plans')
    .select('*, planned_tasks(*)')
    .eq('id', sourcePlanId)
    .single()

  if (!source) {
    return NextResponse.json({ error: 'Source plan not found' }, { status: 404 })
  }

  // Check target doesn't already exist
  const { data: existing } = await supabase
    .from('weekly_task_plans')
    .select('id')
    .eq('week_start_date', target_week_start)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: 'A plan already exists for the target week', existing_id: existing.id },
      { status: 409 }
    )
  }

  // Create new plan
  const { data: newPlan, error: planError } = await supabase
    .from('weekly_task_plans')
    .insert({
      week_start_date: target_week_start,
      notes: `Copied from week of ${source.week_start_date}`,
      created_by: authResult.data.user.id,
    })
    .select('*')
    .single()

  if (planError || !newPlan) {
    return NextResponse.json({ error: planError?.message || 'Failed to create plan' }, { status: 500 })
  }

  // Copy tasks (without completion info)
  const sourceTasks = source.planned_tasks || []
  if (sourceTasks.length > 0) {
    const copiedTasks = sourceTasks.map((t: Record<string, unknown>) => ({
      plan_id: newPlan.id,
      template_id: t.template_id,
      title: t.title,
      description: t.description,
      assigned_to: t.assigned_to,
      assigned_role: t.assigned_role,
      day_of_week: t.day_of_week,
      shift_type: t.shift_type,
      priority: t.priority,
      estimated_minutes: t.estimated_minutes,
      section_id: t.section_id,
      sort_order: t.sort_order,
      status: 'pending',
    }))

    await supabase.from('planned_tasks').insert(copiedTasks)
  }

  // Fetch full new plan
  const { data: fullPlan } = await supabase
    .from('weekly_task_plans')
    .select(`
      *,
      planned_tasks(
        *,
        assigned_employee:employees(
          id,
          profile:profiles(id, full_name, role)
        ),
        section:floor_sections(id, name)
      )
    `)
    .eq('id', newPlan.id)
    .single()

  return NextResponse.json(fullPlan, { status: 201 })
}
