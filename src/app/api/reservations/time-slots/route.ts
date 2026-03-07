import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/utils/auth'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const upsertSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  time_slot: z.string().regex(/^\d{2}:\d{2}$/),
  capacity: z.number().int().min(0),
  is_active: z.boolean().optional().default(true),
})

/**
 * GET /api/reservations/time-slots
 * Returns all time slots grouped by day_of_week
 */
export async function GET() {
  const authResult = await requireAuth()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reservation_time_slots')
    .select('*')
    .order('day_of_week')
    .order('time_slot')

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch time slots' }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * PUT /api/reservations/time-slots
 * Upsert a single time slot (day_of_week + time_slot is unique key)
 * Requires admin/owner/manager
 */
export async function PUT(request: NextRequest) {
  const roleResult = await requireRole(['admin', 'owner', 'manager'])
  if ('error' in roleResult) {
    return NextResponse.json({ error: roleResult.error }, { status: roleResult.status })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = upsertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reservation_time_slots')
    .upsert(
      {
        day_of_week: parsed.data.day_of_week,
        time_slot: parsed.data.time_slot,
        capacity: parsed.data.capacity,
        is_active: parsed.data.is_active,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'day_of_week,time_slot' }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to save time slot' }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * POST /api/reservations/time-slots/bulk
 * Bulk upsert all time slots (replaces entire schedule)
 * Requires admin/owner/manager
 */
export async function POST(request: NextRequest) {
  const roleResult = await requireRole(['admin', 'owner', 'manager'])
  if ('error' in roleResult) {
    return NextResponse.json({ error: roleResult.error }, { status: roleResult.status })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const listSchema = z.array(upsertSchema)
  const parsed = listSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 })
  }

  const supabase = await createClient()
  const rows = parsed.data.map((slot) => ({
    ...slot,
    updated_at: new Date().toISOString(),
  }))

  const { data, error } = await supabase
    .from('reservation_time_slots')
    .upsert(rows, { onConflict: 'day_of_week,time_slot' })
    .select()

  if (error) {
    return NextResponse.json({ error: 'Failed to save time slots' }, { status: 500 })
  }

  return NextResponse.json(data)
}
