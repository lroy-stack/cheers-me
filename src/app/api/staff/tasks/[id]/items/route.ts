import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createItemSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  sort_order: z.number().int().min(0).optional(),
})

/**
 * POST /api/staff/tasks/[id]/items
 * Add a checklist item to a task
 * Auth: admin/manager/owner
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

  const { id: taskId } = await params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validation = createItemSchema.safeParse(body)
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

  // Verify task exists
  const { data: task, error: taskError } = await supabase
    .from('staff_tasks')
    .select('id')
    .eq('id', taskId)
    .single()

  if (taskError || !task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  // If sort_order not specified, put it at the end
  let sortOrder = validation.data.sort_order
  if (sortOrder === undefined) {
    const { data: existingItems } = await supabase
      .from('staff_task_items')
      .select('sort_order')
      .eq('task_id', taskId)
      .order('sort_order', { ascending: false })
      .limit(1)

    sortOrder = existingItems && existingItems.length > 0
      ? existingItems[0].sort_order + 1
      : 0
  }

  const { data: newItem, error } = await supabase
    .from('staff_task_items')
    .insert({
      task_id: taskId,
      text: validation.data.text,
      sort_order: sortOrder,
      completed: false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(newItem, { status: 201 })
}
