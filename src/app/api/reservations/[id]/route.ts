import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendReservationConfirmation } from '@/lib/email/resend'

// Validation schema for updating a reservation
const updateReservationSchema = z.object({
  guest_name: z.string().min(1).max(255).optional(),
  guest_email: z.string().email().optional(),
  guest_phone: z.string().min(1).max(20).optional(),
  party_size: z.number().int().min(1).max(50).optional(),
  reservation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  table_id: z.string().uuid().nullable().optional(),
  customer_id: z.string().uuid().nullable().optional(),
  reservation_status: z.enum(['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show']).optional(),
  estimated_duration_minutes: z.number().int().min(15).max(480).optional(),
  special_requests: z.string().max(1000).nullable().optional(),
  internal_notes: z.string().max(1000).nullable().optional(),
  actual_arrival_time: z.string().datetime().nullable().optional(),
  actual_departure_time: z.string().datetime().nullable().optional(),
  cancellation_reason: z.string().max(500).nullable().optional(),
  deposit_paid: z.boolean().optional(),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/reservations/[id]
 * Get a single reservation by ID
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

  const { data: reservation, error } = await supabase
    .from('reservations')
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
      customers (
        id,
        name,
        email,
        phone,
        language,
        preferences
      ),
      reservation_confirmations (
        id,
        confirmation_type,
        recipient,
        sent_at,
        delivered_at
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(reservation)
}

/**
 * PATCH /api/reservations/[id]
 * Update a reservation
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

  const { data: userData } = authResult
  const { id } = await context.params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = updateReservationSchema.safeParse(body)
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

  // If status is being changed to cancelled, track who and when
  if (updateData.reservation_status === 'cancelled') {
    Object.assign(updateData, {
      cancelled_at: new Date().toISOString(),
      cancelled_by: userData.user.id,
    })
  }

  // If status is being changed to seated, record the time
  if (updateData.reservation_status === 'seated' && !updateData.actual_arrival_time) {
    Object.assign(updateData, {
      seated_at: new Date().toISOString(),
      actual_arrival_time: new Date().toISOString(),
    })
  }

  // If status is being changed to completed, record departure time
  if (updateData.reservation_status === 'completed' && !updateData.actual_departure_time) {
    Object.assign(updateData, {
      actual_departure_time: new Date().toISOString(),
    })
  }

  // Update reservation
  const { data: updatedReservation, error } = await supabase
    .from('reservations')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      tables (
        id,
        table_number,
        capacity,
        section_id
      ),
      customers (
        id,
        name,
        email,
        phone
      )
    `)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Auto-send confirmation email when status changes to confirmed
  if (
    updateData.reservation_status === 'confirmed' &&
    updatedReservation.guest_email
  ) {
    // Fire-and-forget: don't block the response
    sendReservationConfirmation({
      to: updatedReservation.guest_email,
      guest_name: updatedReservation.guest_name,
      reservation_id: updatedReservation.id,
      party_size: updatedReservation.party_size,
      reservation_date: updatedReservation.reservation_date,
      start_time: updatedReservation.start_time.substring(0, 5),
      table_number: updatedReservation.tables?.table_number,
      section: undefined,
      language: 'en',
    }).then(async (result) => {
      // Record the confirmation
      const sb = await createClient()
      await sb.from('reservation_confirmations').insert({
        reservation_id: updatedReservation.id,
        confirmation_type: 'email',
        recipient: updatedReservation.guest_email,
        sent_at: new Date().toISOString(),
        delivered_at: result.success ? new Date().toISOString() : null,
      })
      await sb
        .from('reservations')
        .update({ confirmation_sent_at: new Date().toISOString() })
        .eq('id', id)
    }).catch((err) => {
      console.error('Failed to send confirmation email:', err)
    })
  }

  return NextResponse.json(updatedReservation)
}

/**
 * DELETE /api/reservations/[id]
 * Delete a reservation (hard delete - use with caution)
 * Access: admin, manager only
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await context.params
  const supabase = await createClient()

  // Instead of hard delete, prefer soft delete by updating status to cancelled
  const { error } = await supabase
    .from('reservations')
    .delete()
    .eq('id', id)

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
