import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating DJ
const updateDjSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  genre: z.string().max(100).optional(),
  fee: z.number().min(0).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(20).optional(),
  social_links: z.string().optional(),
  rider_notes: z.string().optional(),
})

/**
 * GET /api/events/djs/[id]
 * Get a single DJ by ID
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'dj'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params
  const supabase = await createClient()

  const { data: dj, error } = await supabase
    .from('djs')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !dj) {
    return NextResponse.json({ error: 'DJ not found' }, { status: 404 })
  }

  return NextResponse.json(dj)
}

/**
 * PATCH /api/events/djs/[id]
 * Update a DJ
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = updateDjSchema.safeParse(body)
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

  // Check if DJ exists
  const { data: existingDj } = await supabase
    .from('djs')
    .select('id')
    .eq('id', id)
    .single()

  if (!existingDj) {
    return NextResponse.json({ error: 'DJ not found' }, { status: 404 })
  }

  // Update DJ
  const { data: updatedDj, error } = await supabase
    .from('djs')
    .update(validation.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updatedDj)
}

/**
 * DELETE /api/events/djs/[id]
 * Delete a DJ
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params
  const supabase = await createClient()

  // Check if DJ is assigned to any events
  const { data: events } = await supabase
    .from('events')
    .select('id')
    .eq('dj_id', id)
    .limit(1)

  if (events && events.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete DJ with assigned events. Remove DJ from events first.' },
      { status: 400 }
    )
  }

  // Delete DJ
  const { error } = await supabase.from('djs').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'DJ deleted successfully' })
}
