import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updateSchema = z.object({
  max_party_size: z.number().int().min(1).max(200).optional(),
  buffer_minutes: z.number().int().min(0).max(120).optional(),
  auto_confirm: z.boolean().optional(),
})

/**
 * GET /api/reservations/settings
 * Returns current reservation_settings row
 */
export async function GET() {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reservation_settings')
    .select('*')
    .limit(1)
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * PATCH /api/reservations/settings
 * Update reservation settings
 */
export async function PATCH(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 })
  }

  const supabase = await createClient()

  // Get the first (and only) settings row
  const { data: existing } = await supabase
    .from('reservation_settings')
    .select('id')
    .limit(1)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Settings not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('reservation_settings')
    .update(parsed.data)
    .eq('id', existing.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }

  return NextResponse.json(data)
}
