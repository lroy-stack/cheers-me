import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating content calendar entry
const createContentSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  content_text: z.string().optional(),
  image_url: z.string().url().optional().nullable(),
  platform: z.enum(['instagram', 'facebook', 'multi']).optional().nullable(),
  scheduled_date: z.string().datetime().optional().nullable(),
  status: z.enum(['draft', 'scheduled', 'published', 'failed']).default('draft'),
  language: z.enum(['nl', 'en', 'es']).optional().nullable(),
})


/**
 * GET /api/marketing/content-calendar
 * List all content calendar entries (managers/admins only)
 * Query params:
 * - status: filter by status (draft, scheduled, published, failed)
 * - platform: filter by platform (instagram, facebook, multi)
 * - language: filter by language (nl, en, es)
 * - from: filter by scheduled_date >= from (ISO date)
 * - to: filter by scheduled_date <= to (ISO date)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  // Build query with optional filters
  let query = supabase
    .from('content_calendar')
    .select(`
      *,
      created_by_employee:employees!content_calendar_created_by_fkey(
        id,
        profile:profiles(
          id,
          full_name
        )
      )
    `)
    .order('scheduled_date', { ascending: true, nullsFirst: false })

  // Apply filters
  const status = searchParams.get('status')
  if (status) {
    query = query.eq('status', status)
  }

  const platform = searchParams.get('platform')
  if (platform) {
    query = query.eq('platform', platform)
  }

  const language = searchParams.get('language')
  if (language) {
    query = query.eq('language', language)
  }

  const from = searchParams.get('from')
  if (from) {
    query = query.gte('scheduled_date', from)
  }

  const to = searchParams.get('to')
  if (to) {
    query = query.lte('scheduled_date', to)
  }

  const { data: content, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(content)
}

/**
 * POST /api/marketing/content-calendar
 * Create a new content calendar entry (managers/admins only)
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])

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
  const validation = createContentSchema.safeParse(body)
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

  // Get employee record for created_by
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('profile_id', authResult.data.user.id)
    .single()

  // Create content calendar entry
  const { data: newContent, error } = await supabase
    .from('content_calendar')
    .insert({
      ...validation.data,
      created_by: employee?.id || null,
    })
    .select(`
      *,
      created_by_employee:employees!content_calendar_created_by_fkey(
        id,
        profile:profiles(
          id,
          full_name
        )
      )
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(newContent, { status: 201 })
}
