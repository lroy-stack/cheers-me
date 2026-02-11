import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for equipment checklist item
const equipmentSchema = z.object({
  equipment_name: z.string().min(1, 'Equipment name is required').max(255),
  is_checked: z.boolean().optional(),
})

// Validation schema for bulk update
const bulkUpdateSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      is_checked: z.boolean(),
    })
  ),
})

/**
 * GET /api/events/[id]/equipment
 * Get equipment checklist for an event
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'dj', 'bar'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params
  const supabase = await createClient()

  // Verify event exists
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', id)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Get equipment checklist
  const { data: equipment, error } = await supabase
    .from('event_equipment_checklists')
    .select('*')
    .eq('event_id', id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(equipment)
}

/**
 * POST /api/events/[id]/equipment
 * Add equipment item to checklist
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager'])

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

  // Validate request body
  const validation = equipmentSchema.safeParse(body)
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

  // Verify event exists
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', id)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Add equipment item
  const { data: newItem, error } = await supabase
    .from('event_equipment_checklists')
    .insert({
      event_id: id,
      equipment_name: validation.data.equipment_name,
      is_checked: validation.data.is_checked || false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(newItem, { status: 201 })
}

/**
 * PATCH /api/events/[id]/equipment
 * Bulk update equipment checklist (check/uncheck multiple items)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'dj', 'bar'])

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

  // Validate request body
  const validation = bulkUpdateSchema.safeParse(body)
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

  // Verify event exists
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', id)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Update each item
  const updates = validation.data.items.map(item =>
    supabase
      .from('event_equipment_checklists')
      .update({ is_checked: item.is_checked })
      .eq('id', item.id)
      .eq('event_id', id) // Ensure item belongs to this event
  )

  const results = await Promise.all(updates)

  // Check for errors
  const errors = results.filter(result => result.error)
  if (errors.length > 0) {
    return NextResponse.json(
      { error: 'Failed to update some items', details: errors },
      { status: 500 }
    )
  }

  // Fetch updated checklist
  const { data: equipment, error } = await supabase
    .from('event_equipment_checklists')
    .select('*')
    .eq('event_id', id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(equipment)
}
