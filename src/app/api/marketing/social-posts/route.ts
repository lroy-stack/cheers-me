import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating social post
const createSocialPostSchema = z.object({
  content_calendar_id: z.string().uuid().optional().nullable(),
  platform: z.enum(['instagram', 'facebook']),
  platform_post_id: z.string().optional().nullable(),
  caption: z.string().optional().nullable(),
  hashtags: z.string().optional().nullable(),
  image_url: z.string().url().optional().nullable(),
  published_at: z.string().datetime().optional().nullable(),
  status: z.enum(['pending', 'published', 'failed']).default('pending'),
  likes: z.number().int().min(0).default(0),
  comments: z.number().int().min(0).default(0),
  shares: z.number().int().min(0).default(0),
  reach: z.number().int().min(0).default(0),
})

/**
 * GET /api/marketing/social-posts
 * List all social posts with engagement metrics (managers/admins only)
 * Query params:
 * - status: filter by status (pending, published, failed)
 * - platform: filter by platform (instagram, facebook)
 * - content_calendar_id: filter by content calendar entry
 * - limit: limit number of results (default: 50)
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
    .from('social_posts')
    .select(`
      *,
      content_calendar(
        id,
        title,
        scheduled_date
      )
    `)
    .order('published_at', { ascending: false, nullsFirst: false })

  // Apply filters
  const status = searchParams.get('status')
  if (status) {
    query = query.eq('status', status)
  }

  const platform = searchParams.get('platform')
  if (platform) {
    query = query.eq('platform', platform)
  }

  const contentCalendarId = searchParams.get('content_calendar_id')
  if (contentCalendarId) {
    query = query.eq('content_calendar_id', contentCalendarId)
  }

  // Apply limit
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  query = query.limit(limit)

  const { data: posts, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(posts)
}

/**
 * POST /api/marketing/social-posts
 * Create a new social post record (managers/admins only)
 * This is typically used when a post is published via Meta API
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
  const validation = createSocialPostSchema.safeParse(body)
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

  // Verify content_calendar_id exists if provided
  if (validation.data.content_calendar_id) {
    const { data: calendar } = await supabase
      .from('content_calendar')
      .select('id')
      .eq('id', validation.data.content_calendar_id)
      .single()

    if (!calendar) {
      return NextResponse.json(
        { error: 'Content calendar entry not found' },
        { status: 400 }
      )
    }
  }

  // Create social post
  const { data: newPost, error } = await supabase
    .from('social_posts')
    .insert(validation.data)
    .select(`
      *,
      content_calendar(
        id,
        title,
        scheduled_date
      )
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(newPost, { status: 201 })
}
