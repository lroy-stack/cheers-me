import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const taskCreateSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
  assigned_role: z.string().optional(),
  day_of_week: z.number().min(0).max(6),
  shift_type: z.enum(['morning', 'afternoon', 'night']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  estimated_minutes: z.number().min(0).optional(),
  section_id: z.string().uuid().optional(),
  sort_order: z.number().default(0),
  template_id: z.string().uuid().optional(),
})

const taskUpdateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  assigned_role: z.string().nullable().optional(),
  day_of_week: z.number().min(0).max(6).optional(),
  shift_type: z.enum(['morning', 'afternoon', 'night']).nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  estimated_minutes: z.number().min(0).nullable().optional(),
  section_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped']).optional(),
})

const syncSchema = z.object({
  tasks_to_create: z.array(taskCreateSchema),
  tasks_to_update: z.array(taskUpdateSchema),
  tasks_to_delete: z.array(z.string().uuid()),
})

/**
 * POST /api/staff/task-plans/[id]/sync
 * Bulk sync all planned task changes in a single request
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id: planId } = await params
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validation = syncSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.errors },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { tasks_to_create, tasks_to_update, tasks_to_delete } = validation.data

  // Verify plan exists
  const { data: plan } = await supabase
    .from('weekly_task_plans')
    .select('id, status')
    .eq('id', planId)
    .single()

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  const results = { created: 0, updated: 0, deleted: 0, errors: [] as string[] }

  // Delete
  if (tasks_to_delete.length > 0) {
    const { error } = await supabase
      .from('planned_tasks')
      .delete()
      .in('id', tasks_to_delete)
      .eq('plan_id', planId)

    if (error) {
      results.errors.push(`Delete error: ${error.message}`)
    } else {
      results.deleted = tasks_to_delete.length
    }
  }

  // Create
  if (tasks_to_create.length > 0) {
    const toInsert = tasks_to_create.map(t => ({
      ...t,
      plan_id: planId,
    }))

    const { error } = await supabase.from('planned_tasks').insert(toInsert)
    if (error) {
      results.errors.push(`Create error: ${error.message}`)
    } else {
      results.created = tasks_to_create.length
    }
  }

  // Update
  for (const update of tasks_to_update) {
    const { id, ...fields } = update
    const { error } = await supabase
      .from('planned_tasks')
      .update(fields)
      .eq('id', id)
      .eq('plan_id', planId)

    if (error) {
      results.errors.push(`Update error for ${id}: ${error.message}`)
    } else {
      results.updated++
    }
  }

  // Update plan timestamp
  await supabase
    .from('weekly_task_plans')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', planId)

  // Fetch updated tasks
  const { data: tasks } = await supabase
    .from('planned_tasks')
    .select(`
      *,
      assigned_employee:employees(
        id,
        profile:profiles(id, full_name, role, avatar_url)
      ),
      section:floor_sections(id, name),
      template:staff_task_templates(id, title)
    `)
    .eq('plan_id', planId)
    .order('day_of_week')
    .order('sort_order')

  return NextResponse.json({ results, tasks: tasks || [] })
}
