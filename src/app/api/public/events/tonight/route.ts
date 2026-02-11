import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/public/events/tonight
 * Public endpoint to get tonight's events (no auth required)
 * Used for customer-facing displays
 */
export async function GET(_request: NextRequest) {
  const supabase = await createClient()

  // Get today's date
  const today = new Date().toISOString().split('T')[0]

  // Get all events happening today
  const { data: events, error } = await supabase
    .from('events')
    .select(`
      id,
      title,
      description,
      event_date,
      start_time,
      end_time,
      event_type,
      status,
      sport_name,
      home_team,
      away_team,
      broadcast_channel,
      match_info,
      dj:djs(
        id,
        name,
        genre,
        social_links
      )
    `)
    .eq('event_date', today)
    .in('status', ['confirmed', 'pending']) // Only show confirmed or pending events
    .order('start_time', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Filter out sensitive information and format response
  const publicEvents = events.map(event => ({
    id: event.id,
    title: event.title,
    description: event.description,
    start_time: event.start_time,
    end_time: event.end_time,
    event_type: event.event_type,
    // Sports info
    sport_name: event.sport_name,
    home_team: event.home_team,
    away_team: event.away_team,
    broadcast_channel: event.broadcast_channel,
    // DJ info (public fields only)
    dj: event.dj ? {
      name: (event.dj as any).name,
      genre: (event.dj as any).genre,
      social_links: (event.dj as any).social_links,
    } : null,
  }))

  return NextResponse.json({
    date: today,
    events: publicEvents,
  })
}
