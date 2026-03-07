import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'

// Default cleaning timeout: 5 minutes
const CLEANING_TIMEOUT_MINUTES = 5

/**
 * POST /api/tables/cleaning-check
 * Auto-transitions tables from 'cleaning' → 'available' after CLEANING_TIMEOUT_MINUTES.
 * Also checks waitlist for matching party_size and marks entries as 'notified'.
 * Called periodically by the floor plan client (every 30s).
 * Access: admin, manager, waiter, bar
 */
export async function POST() {
  const authResult = await requireRole(['admin', 'manager', 'waiter', 'bar'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const cutoffTime = new Date(Date.now() - CLEANING_TIMEOUT_MINUTES * 60 * 1000).toISOString()

  // Find cleaning tables past the timeout
  const { data: cleaningTables, error: fetchError } = await supabase
    .from('tables')
    .select('id, table_number, capacity, section_id')
    .eq('status', 'cleaning')
    .not('cleaning_started_at', 'is', null)
    .lte('cleaning_started_at', cutoffTime)

  if (fetchError) {
    return NextResponse.json(
      { error: 'Failed to check cleaning tables' },
      { status: 500 }
    )
  }

  if (!cleaningTables || cleaningTables.length === 0) {
    return NextResponse.json({ transitioned: 0, waitlist_matches: 0 })
  }

  const tableIds = cleaningTables.map((t) => t.id)

  // Transition cleaning → available
  const { error: updateError } = await supabase
    .from('tables')
    .update({
      status: 'available',
      cleaning_started_at: null,
    })
    .in('id', tableIds)

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to transition tables to available' },
      { status: 500 }
    )
  }

  // For each newly available table, check waitlist for a match (Feature #54)
  let waitlistMatches = 0
  for (const table of cleaningTables) {
    // Find highest-priority waiting entry that fits this table
    const { data: waitlistEntry } = await supabase
      .from('waitlist_entries')
      .select('id, guest_name, guest_phone, party_size, position')
      .eq('waitlist_status', 'waiting')
      .lte('party_size', table.capacity)
      .order('position', { ascending: true })
      .limit(1)
      .single()

    if (waitlistEntry) {
      // Mark as notified so staff can seat them
      const { error: notifyError } = await supabase
        .from('waitlist_entries')
        .update({
          waitlist_status: 'notified',
          notified_at: new Date().toISOString(),
          table_id: table.id,
        })
        .eq('id', waitlistEntry.id)

      if (!notifyError) {
        waitlistMatches++
      }
    }
  }

  return NextResponse.json({
    transitioned: cleaningTables.length,
    transitioned_tables: cleaningTables.map((t) => t.table_number),
    waitlist_matches: waitlistMatches,
  })
}
