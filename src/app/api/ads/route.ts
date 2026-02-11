import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createAdSchema = z.object({
  title_en: z.string().default(''),
  title_nl: z.string().default(''),
  title_es: z.string().default(''),
  title_de: z.string().default(''),
  description_en: z.string().default(''),
  description_nl: z.string().default(''),
  description_es: z.string().default(''),
  description_de: z.string().default(''),
  cta_text_en: z.string().default(''),
  cta_text_nl: z.string().default(''),
  cta_text_es: z.string().default(''),
  cta_text_de: z.string().default(''),
  cta_url: z.string().url().optional().nullable(),
  background_color: z.string().default('#1a1a2e'),
  text_color: z.string().default('#ffffff'),
  template: z.enum(['football_match', 'special_menu', 'happy_hour', 'cocktail_presentation', 'custom']).default('custom'),
  placement: z.enum(['banner_top', 'between_categories', 'fullscreen_overlay']).default('banner_top'),
  display_pages: z.array(z.enum(['digital_menu', 'booking'])).default(['digital_menu']),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  days_of_week: z.array(z.number().min(0).max(6)).default([0, 1, 2, 3, 4, 5, 6]),
  status: z.enum(['draft', 'active', 'paused']).default('draft'),
  priority: z.number().int().default(0),
})

/**
 * GET /api/ads — List all advertisements (manager+)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { searchParams } = request.nextUrl
  const status = searchParams.get('status')
  const template = searchParams.get('template')
  const placement = searchParams.get('placement')

  const supabase = await createClient()
  let query = supabase.from('advertisements').select('*').order('priority', { ascending: false }).order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (template) query = query.eq('template', template)
  if (placement) query = query.eq('placement', placement)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * POST /api/ads — Create advertisement (manager+)
 */
export async function POST(request: NextRequest) {
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

  const parsed = createAdSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('advertisements')
    .insert({
      ...parsed.data,
      created_by: authResult.data.user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
