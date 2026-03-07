import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ token: string }>
}

/**
 * GET /api/public/booking/[token]
 * Retrieve booking details using cancellation token.
 * No authentication required — token is the credential.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  const { token } = await context.params

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(token)) {
    return NextResponse.json(
      { error: 'Invalid cancellation link' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  const { data: reservation, error } = await supabase
    .from('reservations')
    .select(`
      id,
      guest_name,
      guest_email,
      party_size,
      reservation_date,
      start_time,
      reservation_status,
      special_requests,
      cancellation_token,
      tables (
        table_number,
        floor_sections (
          name
        )
      )
    `)
    .eq('cancellation_token', token)
    .single()

  if (error || !reservation) {
    return NextResponse.json(
      { error: 'Booking not found. The link may be invalid or expired.' },
      { status: 404 }
    )
  }

  // Don't expose cancellation token in response
  const { cancellation_token: _, ...safeReservation } = reservation

  return NextResponse.json({
    reservation: {
      ...safeReservation,
      start_time: safeReservation.start_time?.substring(0, 5),
      table_number: (reservation as any).tables?.table_number,
      section: (reservation as any).tables?.floor_sections?.name,
      can_cancel: ['pending', 'confirmed'].includes(safeReservation.reservation_status),
    },
  })
}

/**
 * DELETE /api/public/booking/[token]
 * Cancel a booking using cancellation token.
 * No authentication required — token is the credential.
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  const { token } = await context.params

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(token)) {
    return NextResponse.json(
      { error: 'Invalid cancellation link' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  // Find the reservation
  const { data: reservation, error: fetchError } = await supabase
    .from('reservations')
    .select('id, reservation_status, guest_name, reservation_date')
    .eq('cancellation_token', token)
    .single()

  if (fetchError || !reservation) {
    return NextResponse.json(
      { error: 'Booking not found. The link may be invalid or expired.' },
      { status: 404 }
    )
  }

  // Only allow cancellation of pending/confirmed reservations
  if (!['pending', 'confirmed'].includes(reservation.reservation_status)) {
    return NextResponse.json(
      {
        error: 'This booking cannot be cancelled.',
        message:
          reservation.reservation_status === 'cancelled'
            ? 'This booking has already been cancelled.'
            : 'This booking is in progress or completed and cannot be cancelled online.',
      },
      { status: 409 }
    )
  }

  // Cancel the reservation
  const { error: updateError } = await supabase
    .from('reservations')
    .update({
      reservation_status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: 'Guest self-cancelled via cancellation link',
    })
    .eq('id', reservation.id)

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to cancel booking. Please try again or contact us.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Your booking has been cancelled successfully.',
    reservation: {
      id: reservation.id,
      guest_name: reservation.guest_name,
      reservation_date: reservation.reservation_date,
    },
  })
}
