import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/staff/task-plans/[id]/publish
 * Publish a task plan and optionally generate real staff_tasks
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id: planId } = await params
  const supabase = await createClient()

  // Get plan with tasks
  const { data: plan } = await supabase
    .from('weekly_task_plans')
    .select('*, planned_tasks(*)')
    .eq('id', planId)
    .single()

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  if (plan.status === 'published') {
    return NextResponse.json({ error: 'Plan is already published' }, { status: 400 })
  }

  // Update plan status
  const { data: updatedPlan, error } = await supabase
    .from('weekly_task_plans')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      published_by: authResult.data.user.id,
    })
    .eq('id', planId)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Generate real staff_tasks from planned_tasks
  const plannedTasks = plan.planned_tasks || []
  const weekStart = new Date(plan.week_start_date)
  const generatedTasks: string[] = []

  for (const pt of plannedTasks) {
    if (pt.status === 'skipped') continue

    // Calculate actual date from week_start + day_of_week
    const taskDate = new Date(weekStart)
    taskDate.setDate(taskDate.getDate() + pt.day_of_week)
    const dueDateStr = taskDate.toISOString().split('T')[0]

    const { data: newTask, error: taskError } = await supabase
      .from('staff_tasks')
      .insert({
        title: pt.title,
        description: pt.description,
        assigned_to: pt.assigned_to,
        assigned_role: pt.assigned_role,
        priority: pt.priority,
        estimated_minutes: pt.estimated_minutes,
        due_date: dueDateStr,
        status: 'pending',
        created_by: authResult.data.user.id,
        template_id: pt.template_id,
      })
      .select('id')
      .single()

    if (!taskError && newTask) {
      generatedTasks.push(newTask.id)
      // Link planned_task to real task
      await supabase
        .from('planned_tasks')
        .update({ task_id: newTask.id })
        .eq('id', pt.id)
    }
  }

  return NextResponse.json({
    plan: updatedPlan,
    generated_tasks: generatedTasks.length,
  })
}
