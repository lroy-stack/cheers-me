import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating social post (mainly for syncing analytics)
const updateSocialPostSchema = z.object({
  platform_post_id: z.string().optional().nullable(),
  caption: z.string().optional().nullable(),
  hashtags: z.string().optional().nullable(),
  image_url: z.string().url().optional().nullable(),
  published_at: z.string().datetime().optional().nullable(),
  status: z.enum(['pending', 'published', 'failed']).optional(),
  likes: z.number().int().min(0).optional(),
  comments: z.number().int().min(0).optional(),
  shares: z.number().int().min(0).optional(),
  reach: z.number().int().min(0).optional(),
})

/**
 * GET /api/marketing/social-posts/[id]
 * Get a single social post by ID (managers/admins only)
 */
export async function GET(
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

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: post, error } = await supabase
    .from('social_posts')
    .select(`
      *,
      content_calendar(
        id,
        title,
        description,
        scheduled_date
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(post)
}

/**
 * PATCH /api/marketing/social-posts/[id]
 * Update a social post (managers/admins only)
 * Typically used to sync engagement metrics from Meta API
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

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = updateSocialPostSchema.safeParse(body)
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

  // Update social post
  const { data: updatedPost, error } = await supabase
    .from('social_posts')
    .update(validation.data)
    .eq('id', id)
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
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updatedPost)
}

/**
 * DELETE /api/marketing/social-posts/[id]
 * Delete a social post record (managers/admins only)
 * Note: This only deletes the record, not the actual post on social media
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

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  const supabase = await createClient()

  // Delete social post
  const { error } = await supabase
    .from('social_posts')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
