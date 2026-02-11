import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/reservations/availability
 * Check availability for a given date, time, and party size
 * Public access (for online booking form)
 *
 * Query params:
 * - date: YYYY-MM-DD
 * - time: HH:MM
 * - party_size: number
 * - duration: minutes (optional, defaults to 90)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const date = searchParams.get('date')
  const time = searchParams.get('time')
  const partySizeStr = searchParams.get('party_size')
  const durationStr = searchParams.get('duration') || '90'

  // Validate required parameters
  if (!date || !time || !partySizeStr) {
    return NextResponse.json(
      { error: 'Missing required parameters: date, time, party_size' },
      { status: 400 }
    )
  }

  const partySize = parseInt(partySizeStr)
  const duration = parseInt(durationStr)

  if (isNaN(partySize) || partySize < 1) {
    return NextResponse.json(
      { error: 'Invalid party_size' },
      { status: 400 }
    )
  }

  if (isNaN(duration) || duration < 15) {
    return NextResponse.json(
      { error: 'Invalid duration' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  // Check reservation settings
  const { data: settings } = await supabase
    .from('reservation_settings')
    .select('*')
    .single()

  if (!settings) {
    return NextResponse.json(
      { error: 'Reservation system not configured' },
      { status: 500 }
    )
  }

  // Check if online booking is allowed
  if (!settings.allow_online_booking) {
    return NextResponse.json(
      {
        available: false,
        reason: 'Online booking is currently disabled. Please call to make a reservation.',
      },
      { status: 200 }
    )
  }

  // Check if party size exceeds max
  if (partySize > settings.max_party_size) {
    return NextResponse.json(
      {
        available: false,
        reason: `Party size exceeds maximum of ${settings.max_party_size}. Please call for large groups.`,
      },
      { status: 200 }
    )
  }

  // Check if booking is within allowed advance booking window
  const requestDate = new Date(date)
  const now = new Date()
  const hoursUntilReservation = (requestDate.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (hoursUntilReservation < settings.min_advance_booking_hours) {
    return NextResponse.json(
      {
        available: false,
        reason: `Reservations must be made at least ${settings.min_advance_booking_hours} hours in advance.`,
      },
      { status: 200 }
    )
  }

  const daysUntilReservation = (requestDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (daysUntilReservation > settings.max_advance_booking_days) {
    return NextResponse.json(
      {
        available: false,
        reason: `Reservations can only be made up to ${settings.max_advance_booking_days} days in advance.`,
      },
      { status: 200 }
    )
  }

  // Check if time slot is valid for this day of week
  const dayOfWeek = requestDate.getDay()
  const { data: timeSlots } = await supabase
    .from('reservation_time_slots')
    .select('*')
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)

  if (!timeSlots || timeSlots.length === 0) {
    return NextResponse.json(
      {
        available: false,
        reason: 'No reservations available for this day.',
      },
      { status: 200 }
    )
  }

  // Check if requested time falls within any time slot
  const requestTime = time + ':00'
  const validSlot = timeSlots.find((slot) => {
    return requestTime >= slot.start_time && requestTime < slot.end_time
  })

  if (!validSlot) {
    return NextResponse.json(
      {
        available: false,
        reason: 'Requested time is outside operating hours.',
        available_slots: timeSlots.map((slot) => ({
          start_time: slot.start_time,
          end_time: slot.end_time,
        })),
      },
      { status: 200 }
    )
  }

  // Get all active tables that can accommodate the party size
  const { data: suitableTables } = await supabase
    .from('tables')
    .select('id, table_number, capacity, section_id')
    .gte('capacity', partySize)
    .eq('is_active', true)
    .order('capacity', { ascending: true }) // Prefer smallest suitable table

  if (!suitableTables || suitableTables.length === 0) {
    return NextResponse.json(
      {
        available: false,
        reason: 'No tables available that can accommodate your party size.',
      },
      { status: 200 }
    )
  }

  // Check which tables are already reserved during the requested time
  const requestStartTime = new Date(`${date}T${time}:00`)
  const requestEndTime = new Date(requestStartTime.getTime() + duration * 60000)

  const { data: existingReservations } = await supabase
    .from('reservations')
    .select('table_id, start_time, estimated_duration_minutes')
    .eq('reservation_date', date)
    .in('reservation_status', ['pending', 'confirmed', 'seated'])
    .in(
      'table_id',
      suitableTables.map((t) => t.id)
    )

  // Find available tables (not reserved during the requested time)
  const availableTables = suitableTables.filter((table) => {
    const tableReservations = existingReservations?.filter((r) => r.table_id === table.id) || []

    // Check if any reservation overlaps with requested time
    for (const reservation of tableReservations) {
      const resStartTime = new Date(`${date}T${reservation.start_time}`)
      const resEndTime = new Date(
        resStartTime.getTime() + (reservation.estimated_duration_minutes || 90) * 60000
      )

      // Check for overlap
      if (
        (requestStartTime >= resStartTime && requestStartTime < resEndTime) ||
        (requestEndTime > resStartTime && requestEndTime <= resEndTime) ||
        (requestStartTime <= resStartTime && requestEndTime >= resEndTime)
      ) {
        return false // Table is occupied during requested time
      }
    }

    return true // Table is available
  })

  if (availableTables.length === 0) {
    // Suggest alternative times
    const suggestedTimes = await findAlternativeTimes(
      supabase,
      date,
      time,
      partySize,
      duration,
      suitableTables
    )

    return NextResponse.json(
      {
        available: false,
        reason: 'No tables available at the requested time.',
        suggested_times: suggestedTimes,
      },
      { status: 200 }
    )
  }

  // Return available
  return NextResponse.json(
    {
      available: true,
      available_tables: availableTables.length,
      suggested_table: availableTables[0], // Smallest suitable table
    },
    { status: 200 }
  )
}

/**
 * Helper function to find alternative available times
 */
async function findAlternativeTimes(
  supabase: any,
  date: string,
  requestedTime: string,
  _partySize: number,
  duration: number,
  suitableTables: any[]
) {
  const alternatives: string[] = []
  const requestedHour = parseInt(requestedTime.split(':')[0])
  const requestedMinute = parseInt(requestedTime.split(':')[1])

  // Check slots 30 minutes before and after
  const timesToCheck = [
    `${String(requestedHour).padStart(2, '0')}:${String(requestedMinute - 30).padStart(2, '0')}`,
    `${String(requestedHour).padStart(2, '0')}:${String(requestedMinute + 30).padStart(2, '0')}`,
    `${String(requestedHour - 1).padStart(2, '0')}:${String(requestedMinute).padStart(2, '0')}`,
    `${String(requestedHour + 1).padStart(2, '0')}:${String(requestedMinute).padStart(2, '0')}`,
  ]

  for (const timeToCheck of timesToCheck) {
    // Validate time format
    const [hour, minute] = timeToCheck.split(':').map(Number)
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) continue

    const checkStartTime = new Date(`${date}T${timeToCheck}:00`)
    const checkEndTime = new Date(checkStartTime.getTime() + duration * 60000)

    const { data: existingReservations } = await supabase
      .from('reservations')
      .select('table_id, start_time, estimated_duration_minutes')
      .eq('reservation_date', date)
      .in('reservation_status', ['pending', 'confirmed', 'seated'])
      .in(
        'table_id',
        suitableTables.map((t) => t.id)
      )

    const availableTables = suitableTables.filter((table) => {
      const tableReservations = existingReservations?.filter((r: any) => r.table_id === table.id) || []

      for (const reservation of tableReservations) {
        const resStartTime = new Date(`${date}T${reservation.start_time}`)
        const resEndTime = new Date(
          resStartTime.getTime() + (reservation.estimated_duration_minutes || 90) * 60000
        )

        if (
          (checkStartTime >= resStartTime && checkStartTime < resEndTime) ||
          (checkEndTime > resStartTime && checkEndTime <= resEndTime) ||
          (checkStartTime <= resStartTime && checkEndTime >= resEndTime)
        ) {
          return false
        }
      }

      return true
    })

    if (availableTables.length > 0) {
      alternatives.push(timeToCheck)
    }
  }

  return alternatives.slice(0, 3) // Return up to 3 alternatives
}
