import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating table session
const createSessionSchema = z.object({
  table_id: z.string().uuid(),
  reservation_id: z.string().uuid().optional(),
  party_size: z.number().int().min(1).max(50),
  revenue: z.number().min(0).optional(),
})

// Validation schema for updating table session (e.g., closing the session)
const updateSessionSchema = z.object({
  departed_at: z.string().datetime().optional(),
  revenue: z.number().min(0).optional(),
})

/**
 * GET /api/table-sessions
 * List table sessions with optional filters
 * Access: admin, manager, waiter
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'waiter'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  // Optional filters
  const table_id = searchParams.get('table_id')
  const active_only = searchParams.get('active_only') === 'true'
  const date = searchParams.get('date') // YYYY-MM-DD
  const limit = searchParams.get('limit') || '100'

  let query = supabase
    .from('table_sessions')
    .select(`
      *,
      tables (
        id,
        table_number,
        capacity,
        section_id,
        floor_sections (
          id,
          name
        )
      ),
      reservations (
        id,
        guest_name,
        guest_phone,
        reservation_status
      )
    `)
    .order('seated_at', { ascending: false })
    .limit(parseInt(limit))

  // Filter by table
  if (table_id) {
    query = query.eq('table_id', table_id)
  }

  // Filter by active sessions (not departed yet)
  if (active_only) {
    query = query.is('departed_at', null)
  }

  // Filter by date
  if (date) {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    query = query
      .gte('seated_at', startOfDay.toISOString())
      .lte('seated_at', endOfDay.toISOString())
  }

  const { data: sessions, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(sessions)
}

/**
 * POST /api/table-sessions
 * Create a new table session (when guests are seated)
 * Access: admin, manager, waiter
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'waiter'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = createSessionSchema.safeParse(body)
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
  const data = validation.data

  // Check if table exists and is active
  const { data: table, error: tableError } = await supabase
    .from('tables')
    .select('id, table_number, is_active')
    .eq('id', data.table_id)
    .single()

  if (tableError || !table) {
    return NextResponse.json(
      { error: 'Table not found' },
      { status: 404 }
    )
  }

  if (!table.is_active) {
    return NextResponse.json(
      { error: 'Cannot seat guests at an inactive table' },
      { status: 400 }
    )
  }

  // Check if table already has an active session
  const { data: activeSession } = await supabase
    .from('table_sessions')
    .select('id')
    .eq('table_id', data.table_id)
    .is('departed_at', null)
    .single()

  if (activeSession) {
    return NextResponse.json(
      { error: 'Table already has an active session. Please close the current session first.' },
      { status: 400 }
    )
  }

  // Create table session
  const { data: newSession, error } = await supabase
    .from('table_sessions')
    .insert({
      ...data,
      seated_at: new Date().toISOString(),
    })
    .select(`
      *,
      tables (
        id,
        table_number,
        capacity
      ),
      reservations (
        id,
        guest_name,
        guest_phone
      )
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update table status to occupied
  await supabase
    .from('tables')
    .update({ status: 'occupied' })
    .eq('id', data.table_id)

  return NextResponse.json(newSession, { status: 201 })
}

/**
 * PATCH /api/table-sessions/[id]
 * Update a table session (e.g., close the session when guests leave)
 * Access: admin, manager, waiter
 */
export async function PATCH(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'waiter'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json(
      { error: 'Missing session ID' },
      { status: 400 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = updateSessionSchema.safeParse(body)
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
  const updateData = validation.data

  // If departed_at is being set, use current time if not provided
  if (updateData.departed_at === undefined && body.departed_at !== null) {
    updateData.departed_at = new Date().toISOString()
  }

  // Get session details before update
  const { data: session } = await supabase
    .from('table_sessions')
    .select('table_id, departed_at')
    .eq('id', id)
    .single()

  if (!session) {
    return NextResponse.json(
      { error: 'Table session not found' },
      { status: 404 }
    )
  }

  // Update table session (duration will be calculated by trigger)
  const { data: updatedSession, error } = await supabase
    .from('table_sessions')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      tables (
        id,
        table_number,
        capacity
      ),
      reservations (
        id,
        guest_name,
        guest_phone
      )
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If session is being closed (departed_at is set), update table status
  if (updateData.departed_at && !session.departed_at) {
    // Check if there are other active sessions on this table
    const { data: otherActiveSessions } = await supabase
      .from('table_sessions')
      .select('id')
      .eq('table_id', session.table_id)
      .is('departed_at', null)
      .neq('id', id)

    // If no other active sessions, set table to cleaning
    if (!otherActiveSessions || otherActiveSessions.length === 0) {
      await supabase
        .from('tables')
        .update({ status: 'cleaning' })
        .eq('id', session.table_id)
    }
  }

  return NextResponse.json(updatedSession)
}
