import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating waitlist entry
const updateWaitlistSchema = z.object({
  guest_name: z.string().min(1).max(255).optional(),
  guest_phone: z.string().min(1).max(20).optional(),
  party_size: z.number().int().min(1).max(50).optional(),
  position: z.number().int().min(1).optional(),
  waitlist_status: z.enum(['waiting', 'notified', 'seated', 'cancelled', 'expired']).optional(),
  table_id: z.string().uuid().nullable().optional(),
  quote_time_minutes: z.number().int().min(5).max(240).nullable().optional(),
  preferred_section: z.string().max(100).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/waitlist/[id]
 * Get a single waitlist entry by ID
 * Access: admin, manager, waiter
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  const authResult = await requireRole(['admin', 'manager', 'waiter'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await context.params
  const supabase = await createClient()

  const { data: entry, error } = await supabase
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
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Waitlist entry not found' },
        { status: 404 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(entry)
}

/**
 * PATCH /api/waitlist/[id]
 * Update a waitlist entry (e.g., mark as notified, seated, or cancelled)
 * Access: admin, manager, waiter
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const authResult = await requireRole(['admin', 'manager', 'waiter'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await context.params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = updateWaitlistSchema.safeParse(body)
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

  // If status is being changed to notified, record the time
  if (updateData.waitlist_status === 'notified') {
    Object.assign(updateData, {
      notified_at: new Date().toISOString(),
    })
  }

  // If status is being changed to seated, record the time
  // (actual_wait_minutes will be calculated by trigger)
  if (updateData.waitlist_status === 'seated') {
    Object.assign(updateData, {
      seated_at: new Date().toISOString(),
    })
  }

  // Update waitlist entry
  const { data: updatedEntry, error } = await supabase
    .from('waitlist_entries')
    .update(updateData)
    .eq('id', id)
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
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Waitlist entry not found' },
        { status: 404 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // TODO: Send SMS notification to guest when status changes to 'notified'

  return NextResponse.json(updatedEntry)
}

/**
 * DELETE /api/waitlist/[id]
 * Remove an entry from the waitlist
 * Access: admin, manager, waiter
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  const authResult = await requireRole(['admin', 'manager', 'waiter'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await context.params
  const supabase = await createClient()

  // Get the entry's position before deleting
  const { data: entryToDelete } = await supabase
    .from('waitlist_entries')
    .select('position, waitlist_status')
    .eq('id', id)
    .single()

  if (!entryToDelete) {
    return NextResponse.json(
      { error: 'Waitlist entry not found' },
      { status: 404 }
    )
  }

  // Delete the entry
  const { error: deleteError } = await supabase
    .from('waitlist_entries')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // Reorder remaining entries (decrement positions higher than deleted entry)
  if (entryToDelete.waitlist_status === 'waiting') {
    await supabase
      .from('waitlist_entries')
      .update({ position: supabase.rpc('position - 1') })
      .gt('position', entryToDelete.position)
      .eq('waitlist_status', 'waiting')
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
