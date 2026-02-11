import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating event
const updateEventSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  event_type: z.enum(['dj_night', 'sports', 'themed_night', 'private_event', 'other']).optional(),
  dj_id: z.string().uuid().optional().nullable(),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
  // Sports-specific fields
  sport_name: z.string().max(100).optional().nullable(),
  home_team: z.string().max(255).optional().nullable(),
  away_team: z.string().max(255).optional().nullable(),
  broadcast_channel: z.string().max(100).optional().nullable(),
  match_info: z.string().optional().nullable(),
})

/**
 * GET /api/events/[id]
 * Get a single event by ID
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'dj', 'bar', 'waiter'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params
  const supabase = await createClient()

  const { data: event, error } = await supabase
    .from('events')
    .select(`
      *,
      dj:djs(
        id,
        name,
        genre,
        fee,
        phone,
        email,
        social_links,
        rider_notes
      ),
      equipment:event_equipment_checklists(*),
      music_requests:music_requests(*)
    `)
    .eq('id', id)
    .single()

  if (error || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  return NextResponse.json(event)
}

/**
 * PATCH /api/events/[id]
 * Update an event
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'dj'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params
  const { data: userData } = authResult

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = updateEventSchema.safeParse(body)
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

  // Check if event exists
  const { data: existingEvent } = await supabase
    .from('events')
    .select('id, dj_id')
    .eq('id', id)
    .single()

  if (!existingEvent) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // If user is a DJ, they can only update events they're assigned to
  // and can only update status (confirming/declining)
  if (userData.profile.role === 'dj') {
    const { data: djRecord } = await supabase
      .from('djs')
      .select('id')
      .eq('email', userData.profile.email)
      .single()

    if (!djRecord || existingEvent.dj_id !== djRecord.id) {
      return NextResponse.json(
        { error: 'You can only update events assigned to you' },
        { status: 403 }
      )
    }

    // DJs can only update status
    if (Object.keys(validation.data).some(key => key !== 'status')) {
      return NextResponse.json(
        { error: 'DJs can only update event status' },
        { status: 403 }
      )
    }
  }

  // Verify DJ exists if dj_id is being updated
  if (validation.data.dj_id) {
    const { data: dj } = await supabase
      .from('djs')
      .select('id')
      .eq('id', validation.data.dj_id)
      .single()

    if (!dj) {
      return NextResponse.json(
        { error: 'DJ not found' },
        { status: 400 }
      )
    }
  }

  // Update event
  const { data: updatedEvent, error } = await supabase
    .from('events')
    .update(validation.data)
    .eq('id', id)
    .select(`
      *,
      dj:djs(
        id,
        name,
        genre,
        fee
      )
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updatedEvent)
}

/**
 * DELETE /api/events/[id]
 * Delete an event (admins/managers only)
 */
export async function DELETE(
  _request: NextRequest,
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
  const supabase = await createClient()

  // Delete event (cascade will delete equipment checklists and music requests)
  const { error } = await supabase.from('events').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Event deleted successfully' })
}
