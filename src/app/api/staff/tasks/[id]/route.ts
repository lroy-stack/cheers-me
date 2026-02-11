import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  assigned_role: z.string().nullable().optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  due_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  notes: z.string().nullable().optional(),
})

/**
 * GET /api/staff/tasks/[id]
 * Get a single task with items and relations
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params
  const supabase = await createClient()

  const { data: task, error } = await supabase
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
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch items
  const { data: items, error: itemsError } = await supabase
    .from('staff_task_items')
    .select('*')
    .eq('task_id', id)
    .order('sort_order', { ascending: true })

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  return NextResponse.json({ ...task, items: items || [] })
}

/**
 * PATCH /api/staff/tasks/[id]
 * Update task fields. When status changes to 'completed', set completed_at and completed_by.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()

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

  const validation = updateTaskSchema.safeParse(body)
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

  // Build update object
  const updateData: Record<string, unknown> = {
    ...validation.data,
    updated_at: new Date().toISOString(),
  }

  // Handle completion
  if (validation.data.status === 'completed') {
    updateData.completed_at = new Date().toISOString()
    updateData.completed_by = userData.user.id
  } else if (validation.data.status) {
    // If reopening or changing to non-completed status, clear completion fields
    updateData.completed_at = null
    updateData.completed_by = null
  }

  const { data: updatedTask, error } = await supabase
    .from('staff_tasks')
    .update(updateData)
    .eq('id', id)
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

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch items
  const { data: items } = await supabase
    .from('staff_task_items')
    .select('*')
    .eq('task_id', id)
    .order('sort_order', { ascending: true })

  return NextResponse.json({ ...updatedTask, items: items || [] })
}

/**
 * DELETE /api/staff/tasks/[id]
 * Delete a task. Auth: admin/manager/owner.
 */
export async function DELETE(
  _request: NextRequest,
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
  const supabase = await createClient()

  // Delete items first (cascade should handle this, but be explicit)
  await supabase
    .from('staff_task_items')
    .delete()
    .eq('task_id', id)

  const { error } = await supabase
    .from('staff_tasks')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
