import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/events/dashboard
 * Get events dashboard statistics and upcoming events
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'dj', 'bar', 'waiter'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  // Get date range from query params (default: current month)
  const startDate = searchParams.get('start_date') || new Date().toISOString().split('T')[0]

  // Get today's date for filtering
  const today = new Date().toISOString().split('T')[0]

  // Count events by type
  const { data: eventsByType, error: typeError } = await supabase
    .from('events')
    .select('event_type')
    .gte('event_date', startDate)

  if (typeError) {
    return NextResponse.json({ error: typeError.message }, { status: 500 })
  }

  const typeCount = eventsByType.reduce((acc: Record<string, number>, event) => {
    const type = event.event_type || 'other'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})

  // Count events by status
  const { data: eventsByStatus, error: statusError } = await supabase
    .from('events')
    .select('status')
    .gte('event_date', startDate)

  if (statusError) {
    return NextResponse.json({ error: statusError.message }, { status: 500 })
  }

  const statusCount = eventsByStatus.reduce((acc: Record<string, number>, event) => {
    const status = event.status || 'pending'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  // Get upcoming events (next 7 days)
  const next7Days = new Date()
  next7Days.setDate(next7Days.getDate() + 7)

  const { data: upcomingEvents, error: upcomingError } = await supabase
    .from('events')
    .select(`
      *,
      dj:djs(
        id,
        name,
        genre
      )
    `)
    .gte('event_date', today)
    .lte('event_date', next7Days.toISOString().split('T')[0])
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(10)

  if (upcomingError) {
    return NextResponse.json({ error: upcomingError.message }, { status: 500 })
  }

  // Get today's events
  const { data: todayEvents, error: todayError } = await supabase
    .from('events')
    .select(`
      *,
      dj:djs(
        id,
        name,
        genre
      )
    `)
    .eq('event_date', today)
    .order('start_time', { ascending: true })

  if (todayError) {
    return NextResponse.json({ error: todayError.message }, { status: 500 })
  }

  // Get pending confirmations (pending status DJ nights)
  const { data: pendingConfirmations, error: pendingError } = await supabase
    .from('events')
    .select(`
      *,
      dj:djs(
        id,
        name,
        phone,
        email
      )
    `)
    .eq('status', 'pending')
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .limit(5)

  if (pendingError) {
    return NextResponse.json({ error: pendingError.message }, { status: 500 })
  }

  // Get total music requests (pending)
  const { data: musicRequests, error: requestsError } = await supabase
    .from('music_requests')
    .select('id, event_id')
    .eq('status', 'pending')

  if (requestsError) {
    return NextResponse.json({ error: requestsError.message }, { status: 500 })
  }

  // Get most booked DJs
  const { data: djStats, error: djError } = await supabase
    .from('events')
    .select(`
      dj_id,
      dj:djs(
        id,
        name,
        genre
      )
    `)
    .not('dj_id', 'is', null)
    .gte('event_date', startDate)

  if (djError) {
    return NextResponse.json({ error: djError.message }, { status: 500 })
  }

  const djCount = djStats.reduce((acc: Record<string, { dj: any; count: number }>, event) => {
    if (event.dj_id && event.dj) {
      if (!acc[event.dj_id]) {
        acc[event.dj_id] = { dj: event.dj, count: 0 }
      }
      acc[event.dj_id].count++
    }
    return acc
  }, {})

  const topDjs = Object.values(djCount)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5)

  return NextResponse.json({
    summary: {
      total_events: eventsByType.length,
      by_type: typeCount,
      by_status: statusCount,
      pending_confirmations: pendingConfirmations.length,
      pending_music_requests: musicRequests.length,
    },
    upcoming_events: upcomingEvents,
    today_events: todayEvents,
    pending_confirmations: pendingConfirmations,
    top_djs: topDjs,
  })
}
