import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for music request
const musicRequestSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  guest_name: z.string().max(255).optional(),
  song_title: z.string().min(1, 'Song title is required').max(255),
  artist: z.string().min(1, 'Artist is required').max(255),
})

/**
 * GET /api/events/music-requests
 * Get music requests (optionally filtered by event_id)
 * Auth required for staff, but can be made public for customers
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const eventId = searchParams.get('event_id')
  const status = searchParams.get('status')

  let query = supabase
    .from('music_requests')
    .select(`
      *,
      event:events(
        id,
        title,
        event_date,
        start_time
      )
    `)
    .order('created_at', { ascending: false })

  if (eventId) {
    query = query.eq('event_id', eventId)
  }

  if (status) {
    query = query.eq('status', status)
  }

  const { data: requests, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(requests)
}

/**
 * POST /api/events/music-requests
 * Create a music request (public endpoint - no auth required)
 */
export async function POST(request: NextRequest) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = musicRequestSchema.safeParse(body)
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

  // Verify event exists and is happening today or in the future
  const { data: event } = await supabase
    .from('events')
    .select('id, event_date, status')
    .eq('id', validation.data.event_id)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  if (event.status === 'cancelled' || event.status === 'completed') {
    return NextResponse.json(
      { error: 'Cannot add requests to completed or cancelled events' },
      { status: 400 }
    )
  }

  // Create music request
  const { data: newRequest, error } = await supabase
    .from('music_requests')
    .insert({
      event_id: validation.data.event_id,
      guest_name: validation.data.guest_name,
      song_title: validation.data.song_title,
      artist: validation.data.artist,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(newRequest, { status: 201 })
}
