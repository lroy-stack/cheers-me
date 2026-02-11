import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/reservations/dashboard
 * Get dashboard metrics for reservations module
 * Access: admin, manager, owner
 *
 * Returns:
 * - Today's reservations summary
 * - Current table occupancy
 * - Waitlist count
 * - No-show rate (last 30 days)
 * - Upcoming reservations (next 7 days)
 * - Table turnover metrics
 */
export async function GET(_request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner', 'waiter'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  // Pre-compute date ranges
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
  const sevenDaysFromNowStr = sevenDaysFromNow.toISOString().split('T')[0]

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  // Execute all independent queries in parallel
  const [
    { data: todaysSummary },
    { data: todaysReservations },
    { data: activeTables },
    { data: waitlistCount },
    { data: activeSessions },
    { data: recentReservations, count: totalRecentReservations },
    { data: upcomingReservations, count: upcomingCount },
    { data: todaysSessions },
    { data: todaysRevenue },
    { data: peakHours },
  ] = await Promise.all([
    // 1. Today's reservations summary
    supabase.from('todays_reservations_summary').select('*').single(),
    // 2. Today's reservations details
    supabase.from('reservations').select(`
      id, guest_name, party_size, start_time, reservation_status, table_id,
      tables ( table_number, section_id, floor_sections ( name ) )
    `).eq('reservation_date', today).order('start_time', { ascending: true }),
    // 3. All active tables (consolidated from 3 separate queries)
    supabase.from('tables').select('id, status').eq('is_active', true),
    // 4. Waitlist count
    supabase.from('waitlist_entries').select('id', { count: 'exact' }).eq('waitlist_status', 'waiting'),
    // 5. Active table sessions
    supabase.from('table_sessions').select(`
      id, party_size, seated_at,
      tables ( table_number, section_id, floor_sections ( name ) ),
      reservations ( guest_name )
    `).is('departed_at', null).order('seated_at', { ascending: false }),
    // 6. No-show rate (last 30 days)
    supabase.from('reservations').select('reservation_status', { count: 'exact' })
      .gte('reservation_date', thirtyDaysAgoStr).lte('reservation_date', today)
      .in('reservation_status', ['confirmed', 'seated', 'completed', 'no_show']),
    // 7. Upcoming reservations (next 7 days)
    supabase.from('reservations').select(`
      id, guest_name, party_size, reservation_date, start_time, reservation_status
    `, { count: 'exact' })
      .gt('reservation_date', today).lte('reservation_date', sevenDaysFromNowStr)
      .in('reservation_status', ['pending', 'confirmed'])
      .order('reservation_date', { ascending: true }).order('start_time', { ascending: true }).limit(20),
    // 8. Table turnover today
    supabase.from('table_sessions').select('duration_minutes')
      .gte('seated_at', startOfToday.toISOString()).not('duration_minutes', 'is', null),
    // 9. Revenue from table sessions today
    supabase.from('table_sessions').select('revenue')
      .gte('seated_at', startOfToday.toISOString()).not('revenue', 'is', null),
    // 10. Peak hours
    supabase.from('occupancy_by_time_slot').select('*')
      .eq('reservation_date', today).order('occupancy_percentage', { ascending: false }).limit(3),
  ])

  // Compute table occupancy from single query (consolidated from 3 queries)
  const totalTables = activeTables || []
  const occupiedTables = totalTables.filter(t => t.status === 'occupied')
  const availableTables = totalTables.filter(t => t.status === 'available')
  const occupancyRate = totalTables.length > 0
    ? Math.round((occupiedTables.length / totalTables.length) * 100)
    : 0

  const noShowCount = recentReservations?.filter(r => r.reservation_status === 'no_show').length || 0
  const noShowRate = totalRecentReservations && totalRecentReservations > 0
    ? Math.round((noShowCount / totalRecentReservations) * 100)
    : 0

  const avgTurnoverMinutes = todaysSessions && todaysSessions.length > 0
    ? Math.round(
        todaysSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / todaysSessions.length
      )
    : null

  const totalRevenueToday = todaysRevenue
    ? todaysRevenue.reduce((sum, s) => sum + (s.revenue || 0), 0)
    : 0

  // Construct dashboard response
  return NextResponse.json({
    date: today,
    todays_summary: todaysSummary || {
      total_reservations: 0,
      total_covers: 0,
      confirmed_count: 0,
      pending_count: 0,
      currently_seated: 0,
      no_show_count: 0,
      completed_count: 0,
    },
    todays_reservations: todaysReservations || [],
    occupancy: {
      total_tables: totalTables.length,
      occupied: occupiedTables.length,
      available: availableTables.length,
      occupancy_rate_percentage: occupancyRate,
    },
    waitlist: {
      current_count: waitlistCount?.length || 0,
    },
    active_sessions: activeSessions || [],
    no_show_stats: {
      rate_percentage: noShowRate,
      count_last_30_days: noShowCount,
      total_reservations_last_30_days: totalRecentReservations || 0,
    },
    upcoming: {
      count: upcomingCount || 0,
      reservations: upcomingReservations || [],
    },
    turnover: {
      avg_duration_minutes: avgTurnoverMinutes,
      sessions_completed_today: todaysSessions?.length || 0,
    },
    revenue: {
      total_today: totalRevenueToday,
      currency: 'EUR',
    },
    peak_hours: peakHours || [],
  })
}
