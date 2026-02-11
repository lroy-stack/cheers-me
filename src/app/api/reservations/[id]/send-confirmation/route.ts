import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { sendReservationConfirmation } from '@/lib/email/resend'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/reservations/[id]/send-confirmation
 * Send confirmation email to guest
 * Access: admin, manager, waiter
 */
export async function POST(
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

  // Fetch reservation with table and section info
  const { data: reservation, error: fetchError } = await supabase
    .from('reservations')
    .select(`
      *,
      tables (
        id,
        table_number,
        floor_sections (
          id,
          name
        )
      ),
      customers (
        id,
        language
      )
    `)
    .eq('id', id)
    .single()

  if (fetchError || !reservation) {
    return NextResponse.json(
      { error: 'Reservation not found' },
      { status: 404 }
    )
  }

  if (!reservation.guest_email) {
    return NextResponse.json(
      { error: 'Reservation has no guest email' },
      { status: 400 }
    )
  }

  // Determine language from linked customer or default to 'en'
  const language = reservation.customers?.language || 'en'

  // Send confirmation email
  const emailResult = await sendReservationConfirmation({
    to: reservation.guest_email,
    guest_name: reservation.guest_name,
    reservation_id: reservation.id,
    party_size: reservation.party_size,
    reservation_date: reservation.reservation_date,
    start_time: reservation.start_time.substring(0, 5),
    table_number: reservation.tables?.table_number,
    section: reservation.tables?.floor_sections?.name,
    special_requests: reservation.special_requests || undefined,
    language: language as 'en' | 'nl' | 'es' | 'de',
  })

  // Record the confirmation in reservation_confirmations
  await supabase.from('reservation_confirmations').insert({
    reservation_id: reservation.id,
    confirmation_type: 'email',
    recipient: reservation.guest_email,
    sent_at: new Date().toISOString(),
    delivered_at: emailResult.success ? new Date().toISOString() : null,
  })

  // Update confirmation_sent_at on the reservation
  await supabase
    .from('reservations')
    .update({ confirmation_sent_at: new Date().toISOString() })
    .eq('id', id)

  if (!emailResult.success) {
    return NextResponse.json(
      { error: emailResult.error || 'Failed to send email' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    messageId: emailResult.messageId,
  })
}
