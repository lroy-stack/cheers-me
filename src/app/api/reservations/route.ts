import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating a reservation
const createReservationSchema = z.object({
  guest_name: z.string().min(1).max(255),
  guest_email: z.string().email().optional(),
  guest_phone: z.string().min(1).max(20),
  party_size: z.number().int().min(1).max(50),
  reservation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/), // HH:MM or HH:MM:SS
  table_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  source: z.enum(['walk_in', 'phone', 'website', 'instagram', 'email', 'staff_created']).default('staff_created'),
  estimated_duration_minutes: z.number().int().min(15).max(480).default(90),
  special_requests: z.string().max(1000).optional(),
  internal_notes: z.string().max(1000).optional(),
  deposit_required: z.boolean().default(false),
  deposit_amount: z.number().min(0).optional(),
})

/**
 * GET /api/reservations
 * List reservations with optional filters
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

  // Extract query parameters
  const date = searchParams.get('date') // YYYY-MM-DD
  const status = searchParams.get('status')
  const table_id = searchParams.get('table_id')
  const customer_id = searchParams.get('customer_id')
  const from_date = searchParams.get('from_date')
  const to_date = searchParams.get('to_date')
  const limit = searchParams.get('limit') || '100'

  let query = supabase
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
        phone
      )
    `)
    .order('reservation_date', { ascending: false })
    .order('start_time', { ascending: true })
    .limit(parseInt(limit))

  // Apply filters
  if (date) {
    query = query.eq('reservation_date', date)
  }

  if (status) {
    query = query.eq('reservation_status', status)
  }

  if (table_id) {
    query = query.eq('table_id', table_id)
  }

  if (customer_id) {
    query = query.eq('customer_id', customer_id)
  }

  if (from_date) {
    query = query.gte('reservation_date', from_date)
  }

  if (to_date) {
    query = query.lte('reservation_date', to_date)
  }

  const { data: reservations, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(reservations)
}

/**
 * POST /api/reservations
 * Create a new reservation
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
  const validation = createReservationSchema.safeParse(body)
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

  // Check if table is already reserved at this time (if table_id provided)
  if (data.table_id) {
    const { data: existingReservations } = await supabase
      .from('reservations')
      .select('id, start_time, estimated_duration_minutes')
      .eq('table_id', data.table_id)
      .eq('reservation_date', data.reservation_date)
      .in('reservation_status', ['pending', 'confirmed', 'seated'])

    if (existingReservations && existingReservations.length > 0) {
      // Check for time overlap
      const newStartTime = new Date(`${data.reservation_date}T${data.start_time}`)
      const newEndTime = new Date(newStartTime.getTime() + data.estimated_duration_minutes * 60000)

      for (const existing of existingReservations) {
        const existingStartTime = new Date(`${data.reservation_date}T${existing.start_time}`)
        const existingEndTime = new Date(
          existingStartTime.getTime() + (existing.estimated_duration_minutes || 90) * 60000
        )

        // Check if times overlap
        if (
          (newStartTime >= existingStartTime && newStartTime < existingEndTime) ||
          (newEndTime > existingStartTime && newEndTime <= existingEndTime) ||
          (newStartTime <= existingStartTime && newEndTime >= existingEndTime)
        ) {
          return NextResponse.json(
            { error: 'Table is already reserved during this time slot' },
            { status: 409 }
          )
        }
      }
    }
  }

  // Determine initial status based on source
  const initialStatus = data.source === 'website' ? 'pending' : 'confirmed'

  // Create reservation
  const { data: newReservation, error } = await supabase
    .from('reservations')
    .insert({
      ...data,
      reservation_status: initialStatus,
    })
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // TODO: Send confirmation email/SMS if guest_email or guest_phone provided
  // This would be handled by a separate email service or edge function

  return NextResponse.json(newReservation, { status: 201 })
}
