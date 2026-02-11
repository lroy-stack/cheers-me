import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/events/[id]/confirm
 * Confirm an event (typically by DJ or manager)
 * Updates status from 'pending' to 'confirmed'
 */
export async function POST(
  _request: NextRequest,
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
  const supabase = await createClient()

  // Get event details
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(`
      *,
      dj:djs(
        id,
        name,
        email
      )
    `)
    .eq('id', id)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // If user is a DJ, verify they are assigned to this event
  if (userData.profile.role === 'dj') {
    const { data: djRecord } = await supabase
      .from('djs')
      .select('id')
      .eq('email', userData.profile.email)
      .single()

    if (!djRecord || event.dj_id !== djRecord.id) {
      return NextResponse.json(
        { error: 'You can only confirm events assigned to you' },
        { status: 403 }
      )
    }
  }

  // Check if event can be confirmed
  if (event.status === 'confirmed') {
    return NextResponse.json(
      { error: 'Event is already confirmed' },
      { status: 400 }
    )
  }

  if (event.status === 'completed') {
    return NextResponse.json(
      { error: 'Cannot confirm a completed event' },
      { status: 400 }
    )
  }

  if (event.status === 'cancelled') {
    return NextResponse.json(
      { error: 'Cannot confirm a cancelled event' },
      { status: 400 }
    )
  }

  // Update event status to confirmed
  const { data: updatedEvent, error: updateError } = await supabase
    .from('events')
    .update({ status: 'confirmed' })
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

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    message: 'Event confirmed successfully',
    event: updatedEvent,
  })
}

/**
 * DELETE /api/events/[id]/confirm
 * Cancel/decline an event confirmation
 * Updates status from 'pending' or 'confirmed' to 'cancelled'
 */
export async function DELETE(
  _request: NextRequest,
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
  const supabase = await createClient()

  // Get event details
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(`
      *,
      dj:djs(
        id,
        name,
        email
      )
    `)
    .eq('id', id)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // If user is a DJ, verify they are assigned to this event
  if (userData.profile.role === 'dj') {
    const { data: djRecord } = await supabase
      .from('djs')
      .select('id')
      .eq('email', userData.profile.email)
      .single()

    if (!djRecord || event.dj_id !== djRecord.id) {
      return NextResponse.json(
        { error: 'You can only cancel events assigned to you' },
        { status: 403 }
      )
    }
  }

  // Check if event can be cancelled
  if (event.status === 'completed') {
    return NextResponse.json(
      { error: 'Cannot cancel a completed event' },
      { status: 400 }
    )
  }

  if (event.status === 'cancelled') {
    return NextResponse.json(
      { error: 'Event is already cancelled' },
      { status: 400 }
    )
  }

  // Update event status to cancelled
  const { data: updatedEvent, error: updateError } = await supabase
    .from('events')
    .update({ status: 'cancelled' })
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

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    message: 'Event cancelled successfully',
    event: updatedEvent,
  })
}
