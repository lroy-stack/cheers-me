import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating waitlist entry
const createWaitlistSchema = z.object({
  guest_name: z.string().min(1).max(255),
  guest_phone: z.string().min(1).max(20),
  party_size: z.number().int().min(1).max(50),
  quote_time_minutes: z.number().int().min(5).max(240).optional(),
  preferred_section: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
})

/**
 * GET /api/waitlist
 * List current waitlist entries
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
  const status = searchParams.get('status') || 'waiting'
  const date = searchParams.get('date') // If not provided, show today's waitlist

  let query = supabase
    .from('waitlist_entries')
    .select(`
      *,
      customers (
        id,
        name,
        email,
        phone
      ),
      tables (
        id,
        table_number,
        capacity
      )
    `)
    .order('position', { ascending: true })

  // Filter by status
  if (status) {
    query = query.eq('waitlist_status', status)
  }

  // Filter by date if provided
  if (date) {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    query = query
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
  } else {
    // Default to today's waitlist
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    query = query.gte('created_at', startOfToday.toISOString())
  }

  const { data: waitlist, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(waitlist)
}

/**
 * POST /api/waitlist
 * Add a guest to the waitlist
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
  const validation = createWaitlistSchema.safeParse(body)
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

  // Get the next position number (highest position + 1)
  const { data: lastEntry } = await supabase
    .from('waitlist_entries')
    .select('position')
    .eq('waitlist_status', 'waiting')
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const nextPosition = (lastEntry?.position || 0) + 1

  // Create waitlist entry
  const { data: newEntry, error } = await supabase
    .from('waitlist_entries')
    .insert({
      ...data,
      position: nextPosition,
      waitlist_status: 'waiting',
    })
    .select(`
      *,
      customers (
        id,
        name,
        email,
        phone
      )
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // TODO: Send SMS notification to guest with their position and estimated wait time

  return NextResponse.json(newEntry, { status: 201 })
}

/**
 * PATCH /api/waitlist/reorder
 * Reorder waitlist positions (bulk update)
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

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Expect array of {id, position}
  if (!Array.isArray(body)) {
    return NextResponse.json(
      { error: 'Request body must be an array of position updates' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const updates = []

  for (const update of body) {
    const { id, position } = update

    if (!id || typeof position !== 'number') {
      return NextResponse.json(
        { error: 'Each update must include id and position' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('waitlist_entries')
      .update({ position })
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { error: `Failed to update entry ${id}: ${error.message}` },
        { status: 500 }
      )
    }

    updates.push(id)
  }

  return NextResponse.json({
    success: true,
    updated_count: updates.length,
  })
}
