import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updateAdSchema = z.object({
  title_en: z.string().optional(),
  title_nl: z.string().optional(),
  title_es: z.string().optional(),
  title_de: z.string().optional(),
  description_en: z.string().optional(),
  description_nl: z.string().optional(),
  description_es: z.string().optional(),
  description_de: z.string().optional(),
  cta_text_en: z.string().optional(),
  cta_text_nl: z.string().optional(),
  cta_text_es: z.string().optional(),
  cta_text_de: z.string().optional(),
  cta_url: z.string().url().optional().nullable(),
  background_color: z.string().optional(),
  text_color: z.string().optional(),
  template: z.enum(['football_match', 'special_menu', 'happy_hour', 'cocktail_presentation', 'custom']).optional(),
  placement: z.enum(['banner_top', 'between_categories', 'fullscreen_overlay']).optional(),
  display_pages: z.array(z.enum(['digital_menu', 'booking'])).optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  days_of_week: z.array(z.number().min(0).max(6)).optional(),
  status: z.enum(['draft', 'active', 'paused', 'expired', 'archived']).optional(),
  priority: z.number().int().optional(),
})

/**
 * GET /api/ads/[id] — Get single ad (manager+)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('advertisements')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

/**
 * PATCH /api/ads/[id] — Update ad (manager+)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = updateAdSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('advertisements')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * DELETE /api/ads/[id] — Delete ad (manager+)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  const supabase = await createClient()

  const { error } = await supabase
    .from('advertisements')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Ad deleted successfully' })
}
