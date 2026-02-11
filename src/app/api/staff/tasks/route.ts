import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable().optional(),
  template_id: z.string().uuid().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  assigned_role: z.string().nullable().optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  due_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  items: z.array(z.object({
    text: z.string().min(1),
    sort_order: z.number().int().min(0),
  })).optional(),
})

/**
 * GET /api/staff/tasks
 * List tasks with optional filters (status, assigned_to, due_date, role)
 * Auth: any authenticated user (RLS handles filtering)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const status = searchParams.get('status')
  const priority = searchParams.get('priority')
  const assignedTo = searchParams.get('assigned_to')
  const dueDate = searchParams.get('due_date')
  const role = searchParams.get('role')

  let query = supabase
    .from('staff_tasks')
    .select(`
      *,
      assigned_employee:employees!staff_tasks_assigned_to_fkey(
        id,
        profile:profiles(
          id,
          full_name,
          role
        )
      ),
      assigner:profiles!staff_tasks_assigned_by_fkey(
        id,
        full_name
      )
    `)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  if (priority) {
    query = query.eq('priority', priority)
  }

  if (assignedTo) {
    query = query.eq('assigned_to', assignedTo)
  }

  if (dueDate) {
    query = query.eq('due_date', dueDate)
  }

  if (role) {
    query = query.eq('assigned_role', role)
  }

  const { data: tasks, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch items for all tasks
  const taskIds = (tasks || []).map((t) => t.id)

  let items: Record<string, Record<string, unknown>[]> = {}

  if (taskIds.length > 0) {
    const { data: itemsData, error: itemsError } = await supabase
      .from('staff_task_items')
      .select('*')
      .in('task_id', taskIds)
      .order('sort_order', { ascending: true })

    if (!itemsError && itemsData) {
      // Group items by task_id
      for (const item of itemsData) {
        if (!items[item.task_id]) {
          items[item.task_id] = []
        }
        items[item.task_id].push(item)
      }
    }
  }

  // Merge items into tasks
  const tasksWithItems = (tasks || []).map((task) => ({
    ...task,
    items: items[task.id] || [],
  }))

  return NextResponse.json(tasksWithItems)
}

/**
 * POST /api/staff/tasks
 * Create a new task
 * Auth: admin/manager/owner only
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validation = createTaskSchema.safeParse(body)
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

  const { items, ...taskData } = validation.data

  // Create the task
  const { data: newTask, error: taskError } = await supabase
    .from('staff_tasks')
    .insert({
      title: taskData.title,
      description: taskData.description ?? null,
      template_id: taskData.template_id ?? null,
      assigned_to: taskData.assigned_to ?? null,
      assigned_role: taskData.assigned_role ?? null,
      assigned_by: userData.user.id,
      due_date: taskData.due_date ?? null,
      due_time: taskData.due_time ?? null,
      priority: taskData.priority ?? 'medium',
      status: 'pending',
    })
    .select(`
      *,
      assigned_employee:employees!staff_tasks_assigned_to_fkey(
        id,
        profile:profiles(
          id,
          full_name,
          role
        )
      ),
      assigner:profiles!staff_tasks_assigned_by_fkey(
        id,
        full_name
      )
    `)
    .single()

  if (taskError) {
    return NextResponse.json({ error: taskError.message }, { status: 500 })
  }

  // Insert checklist items if provided
  let taskItems: unknown[] = []
  if (items && items.length > 0) {
    const itemsToInsert = items.map((item) => ({
      task_id: newTask.id,
      text: item.text,
      sort_order: item.sort_order,
      completed: false,
    }))

    const { data: insertedItems, error: itemsError } = await supabase
      .from('staff_task_items')
      .insert(itemsToInsert)
      .select()

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    taskItems = insertedItems || []
  }

  return NextResponse.json(
    { ...newTask, items: taskItems },
    { status: 201 }
  )
}
