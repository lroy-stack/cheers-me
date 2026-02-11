import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating equipment item
const updateEquipmentSchema = z.object({
  equipment_name: z.string().min(1).max(255).optional(),
  is_checked: z.boolean().optional(),
})

/**
 * PATCH /api/events/[id]/equipment/[equipmentId]
 * Update a single equipment checklist item
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; equipmentId: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'dj', 'bar'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id, equipmentId } = await params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = updateEquipmentSchema.safeParse(body)
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

  // Verify equipment item exists and belongs to this event
  const { data: existingItem } = await supabase
    .from('event_equipment_checklists')
    .select('id')
    .eq('id', equipmentId)
    .eq('event_id', id)
    .single()

  if (!existingItem) {
    return NextResponse.json(
      { error: 'Equipment item not found' },
      { status: 404 }
    )
  }

  // Update equipment item
  const { data: updatedItem, error } = await supabase
    .from('event_equipment_checklists')
    .update(validation.data)
    .eq('id', equipmentId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updatedItem)
}

/**
 * DELETE /api/events/[id]/equipment/[equipmentId]
 * Delete an equipment checklist item
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; equipmentId: string }> }
) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id, equipmentId } = await params
  const supabase = await createClient()

  // Delete equipment item (also verify it belongs to this event)
  const { error } = await supabase
    .from('event_equipment_checklists')
    .delete()
    .eq('id', equipmentId)
    .eq('event_id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Equipment item deleted successfully' })
}
