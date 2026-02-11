import { createAdminClient } from '@/lib/supabase/server'
import { sendReservationConfirmation } from '@/lib/email/resend'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Public Booking API Route
 * Allows guests to create reservations without authentication
 * This endpoint is designed to be embeddable on websites and Instagram
 */

// Validation schema for public booking
const publicBookingSchema = z.object({
  guest_name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  guest_email: z.string().email('Valid email required').optional(),
  guest_phone: z.string().min(6, 'Valid phone number required').max(20),
  party_size: z.number().int().min(1).max(50),
  reservation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time format must be HH:MM'),
  special_requests: z.string().max(1000).optional(),
  language: z.enum(['en', 'nl', 'es', 'de']).default('en'),
})

/**
 * POST /api/public/booking
 * Create a reservation from public booking form
 * No authentication required
 */
export async function POST(request: NextRequest) {
  // Parse request body
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    )
  }

  // Validate input
  const validation = publicBookingSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: validation.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      },
      { status: 400 }
    )
  }

  const data = validation.data
  const supabase = createAdminClient()

  // Check reservation settings
  const { data: settings } = await supabase
    .from('reservation_settings')
    .select('*')
    .single()

  if (!settings) {
    return NextResponse.json(
      { error: 'Reservation system is currently unavailable' },
      { status: 503 }
    )
  }

  // Check if online booking is enabled
  if (!settings.allow_online_booking) {
    return NextResponse.json(
      {
        error: 'Online booking is currently disabled',
        message: 'Please call us to make a reservation: +34 XXX XXX XXX',
      },
      { status: 403 }
    )
  }

  // Check party size limit
  if (data.party_size > settings.max_party_size) {
    return NextResponse.json(
      {
        error: 'Party size exceeds maximum',
        message: `Maximum party size is ${settings.max_party_size}. For larger groups, please contact us directly.`,
      },
      { status: 400 }
    )
  }

  // Check advance booking limits
  const requestDate = new Date(data.reservation_date)
  const now = new Date()
  const hoursUntilReservation = (requestDate.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (hoursUntilReservation < settings.min_advance_booking_hours) {
    return NextResponse.json(
      {
        error: 'Booking too soon',
        message: `Reservations must be made at least ${settings.min_advance_booking_hours} hours in advance.`,
      },
      { status: 400 }
    )
  }

  const daysUntilReservation = (requestDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (daysUntilReservation > settings.max_advance_booking_days) {
    return NextResponse.json(
      {
        error: 'Booking too far in advance',
        message: `Reservations can only be made up to ${settings.max_advance_booking_days} days in advance.`,
      },
      { status: 400 }
    )
  }

  // Check if the requested time slot is available
  const dayOfWeek = requestDate.getDay()
  const { data: timeSlots } = await supabase
    .from('reservation_time_slots')
    .select('*')
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)

  if (!timeSlots || timeSlots.length === 0) {
    return NextResponse.json(
      {
        error: 'No reservations available',
        message: 'We are not accepting reservations for this day.',
      },
      { status: 400 }
    )
  }

  // Check if requested time falls within valid time slots
  const requestTime = data.start_time + ':00'
  const validSlot = timeSlots.find((slot) => {
    return requestTime >= slot.start_time && requestTime < slot.end_time
  })

  if (!validSlot) {
    return NextResponse.json(
      {
        error: 'Invalid time',
        message: 'The requested time is outside our operating hours.',
        available_slots: timeSlots.map((slot) => ({
          start_time: slot.start_time.substring(0, 5),
          end_time: slot.end_time.substring(0, 5),
        })),
      },
      { status: 400 }
    )
  }

  // Get available tables that can accommodate the party
  const { data: suitableTables } = await supabase
    .from('tables')
    .select('id, table_number, capacity, section_id')
    .gte('capacity', data.party_size)
    .eq('is_active', true)
    .order('capacity', { ascending: true })

  if (!suitableTables || suitableTables.length === 0) {
    return NextResponse.json(
      {
        error: 'No tables available',
        message: 'We do not have tables available that can accommodate your party size.',
      },
      { status: 400 }
    )
  }

  // Check for time conflicts with existing reservations
  const duration = 90 // Default duration for public bookings
  const requestStartTime = new Date(`${data.reservation_date}T${data.start_time}:00`)
  const requestEndTime = new Date(requestStartTime.getTime() + duration * 60000)

  const { data: existingReservations } = await supabase
    .from('reservations')
    .select('table_id, start_time, estimated_duration_minutes')
    .eq('reservation_date', data.reservation_date)
    .in('reservation_status', ['pending', 'confirmed', 'seated'])
    .in(
      'table_id',
      suitableTables.map((t) => t.id)
    )

  // Find an available table
  let assignedTable = null
  for (const table of suitableTables) {
    const tableReservations = existingReservations?.filter((r) => r.table_id === table.id) || []
    let isAvailable = true

    for (const reservation of tableReservations) {
      const resStartTime = new Date(`${data.reservation_date}T${reservation.start_time}`)
      const resEndTime = new Date(
        resStartTime.getTime() + (reservation.estimated_duration_minutes || 90) * 60000
      )

      // Check for overlap
      if (
        (requestStartTime >= resStartTime && requestStartTime < resEndTime) ||
        (requestEndTime > resStartTime && requestEndTime <= resEndTime) ||
        (requestStartTime <= resStartTime && requestEndTime >= resEndTime)
      ) {
        isAvailable = false
        break
      }
    }

    if (isAvailable) {
      assignedTable = table
      break
    }
  }

  if (!assignedTable) {
    return NextResponse.json(
      {
        error: 'No availability',
        message: 'Unfortunately, we are fully booked for the requested time. Please try a different time or contact us directly.',
      },
      { status: 409 }
    )
  }

  // Check if customer exists (by email or phone)
  let customerId = null
  if (data.guest_email) {
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', data.guest_email)
      .single()

    if (existingCustomer) {
      customerId = existingCustomer.id
    }
  } else if (data.guest_phone) {
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', data.guest_phone)
      .single()

    if (existingCustomer) {
      customerId = existingCustomer.id
    }
  }

  // Create the reservation
  const { data: newReservation, error } = await supabase
    .from('reservations')
    .insert({
      guest_name: data.guest_name,
      guest_email: data.guest_email || null,
      guest_phone: data.guest_phone,
      party_size: data.party_size,
      reservation_date: data.reservation_date,
      start_time: data.start_time + ':00',
      table_id: assignedTable.id,
      customer_id: customerId,
      source: 'website' as const,
      reservation_status: 'pending' as const, // Online bookings start as pending
      estimated_duration_minutes: duration,
      special_requests: data.special_requests || null,
    })
    .select(`
      id,
      guest_name,
      guest_email,
      guest_phone,
      party_size,
      reservation_date,
      start_time,
      reservation_status,
      special_requests,
      tables (
        table_number,
        section_id,
        floor_sections (
          name
        )
      )
    `)
    .single()

  if (error) {
    console.error('Error creating reservation:', error)
    return NextResponse.json(
      { error: 'Failed to create reservation. Please try again or contact us directly.' },
      { status: 500 }
    )
  }

  // Send confirmation email if email was provided
  if (data.guest_email) {
    try {
      const emailResult = await sendReservationConfirmation({
        to: data.guest_email,
        guest_name: data.guest_name,
        reservation_id: newReservation.id,
        party_size: data.party_size,
        reservation_date: data.reservation_date,
        start_time: data.start_time,
        table_number: (newReservation as any).tables?.table_number,
        section: (newReservation as any).tables?.floor_sections?.name,
        special_requests: data.special_requests,
        language: data.language,
      })

      if (emailResult.success) {
        // Log confirmation email sent
        await supabase.from('reservation_confirmations').insert({
          reservation_id: newReservation.id,
          confirmation_type: 'email',
          recipient: data.guest_email,
          sent_at: new Date().toISOString(),
        })
      } else {
        console.error('Failed to send confirmation email:', emailResult.error)
      }
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError)
      // Continue even if email fails - reservation is created
    }
  }

  // Return success response
  return NextResponse.json(
    {
      success: true,
      message: 'Your reservation has been received! We will confirm it shortly.',
      reservation: {
        id: newReservation.id,
        guest_name: newReservation.guest_name,
        party_size: newReservation.party_size,
        date: newReservation.reservation_date,
        time: newReservation.start_time.substring(0, 5),
        status: newReservation.reservation_status,
        table_number: (newReservation as any).tables?.table_number,
        section: (newReservation as any).tables?.floor_sections?.name,
      },
    },
    { status: 201 }
  )
}
