import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updateItemSchema = z.object({
  completed: z.boolean().optional(),
  text: z.string().min(1).optional(),
  sort_order: z.number().int().min(0).optional(),
})

/**
 * PATCH /api/staff/tasks/[id]/items/[itemId]
 * Toggle item completion or update item text/order
 * Auth: any authenticated user (RLS handles access)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const authResult = await requireAuth()

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id: taskId, itemId } = await params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validation = updateItemSchema.safeParse(body)
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

  const updateData: Record<string, unknown> = {
    ...validation.data,
    updated_at: new Date().toISOString(),
  }

  // Handle completion toggle
  if (validation.data.completed !== undefined) {
    if (validation.data.completed) {
      updateData.completed_by = userData.user.id
      updateData.completed_at = new Date().toISOString()
    } else {
      updateData.completed_by = null
      updateData.completed_at = null
    }
  }

  const { data: updatedItem, error } = await supabase
    .from('staff_task_items')
    .update(updateData)
    .eq('id', itemId)
    .eq('task_id', taskId)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updatedItem)
}

/**
 * DELETE /api/staff/tasks/[id]/items/[itemId]
 * Remove a checklist item
 * Auth: admin/manager/owner
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id: taskId, itemId } = await params
  const supabase = await createClient()

  const { error } = await supabase
    .from('staff_task_items')
    .delete()
    .eq('id', itemId)
    .eq('task_id', taskId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
