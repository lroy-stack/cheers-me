import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating music request
const updateMusicRequestSchema = z.object({
  status: z.enum(['pending', 'played', 'declined']),
})

/**
 * GET /api/events/music-requests/[id]
 * Get a single music request
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: musicRequest, error } = await supabase
    .from('music_requests')
    .select(`
      *,
      event:events(
        id,
        title,
        event_date,
        start_time,
        dj:djs(name, genre)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !musicRequest) {
    return NextResponse.json(
      { error: 'Music request not found' },
      { status: 404 }
    )
  }

  return NextResponse.json(musicRequest)
}

/**
 * PATCH /api/events/music-requests/[id]
 * Update music request status (DJs, managers, admins)
 */
export async function PATCH(
  request: NextRequest,
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

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = updateMusicRequestSchema.safeParse(body)
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

  // Check if music request exists
  const { data: existingRequest } = await supabase
    .from('music_requests')
    .select('id')
    .eq('id', id)
    .single()

  if (!existingRequest) {
    return NextResponse.json(
      { error: 'Music request not found' },
      { status: 404 }
    )
  }

  // Update status
  const { data: updatedRequest, error } = await supabase
    .from('music_requests')
    .update({ status: validation.data.status })
    .eq('id', id)
    .select(`
      *,
      event:events(
        id,
        title,
        event_date,
        start_time
      )
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updatedRequest)
}

/**
 * DELETE /api/events/music-requests/[id]
 * Delete a music request (admins/managers only)
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

  const { error } = await supabase.from('music_requests').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Music request deleted successfully' })
}
