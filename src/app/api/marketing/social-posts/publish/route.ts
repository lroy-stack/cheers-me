import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import {
  publishInstagramPost,
  publishFacebookPost,
  isMetaConfigured,
  validateImageUrl,
} from '@/lib/meta/graph-api'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const publishPostSchema = z.object({
  content_calendar_id: z.string().uuid(),
  platform: z.enum(['instagram', 'facebook', 'multi']),
  caption: z.string().min(1).max(2200), // Instagram limit is 2200 chars
  hashtags: z.array(z.string()).optional().default([]),
  image_url: z.string().url().optional(),
})

// ============================================================================
// POST /api/marketing/social-posts/publish
// ============================================================================

/**
 * Publishes a social media post to Instagram and/or Facebook
 *
 * Required role: admin, manager
 *
 * Request body:
 * - content_calendar_id: UUID of the content calendar entry
 * - platform: 'instagram' | 'facebook' | 'multi'
 * - caption: Post caption text
 * - hashtags: Array of hashtags (without # prefix)
 * - image_url: Optional image URL (required for Instagram)
 *
 * Returns:
 * - 200: Post(s) published successfully
 * - 400: Invalid request or validation error
 * - 401: Unauthorized
 * - 500: Server error or API error
 */
export async function POST(request: NextRequest) {
  // Check authentication and authorization
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  // Check if Meta API is configured
  if (!isMetaConfigured()) {
    return NextResponse.json(
      {
        error: 'Meta API is not configured',
        details: 'Please set META_ACCESS_TOKEN, META_PAGE_ID, and META_IG_USER_ID environment variables',
      },
      { status: 500 }
    )
  }

  // Parse request body
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = publishPostSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: validation.error.errors,
      },
      { status: 400 }
    )
  }

  const { content_calendar_id, platform, caption, hashtags, image_url } = validation.data

  // Validate image URL if provided
  if (image_url && !validateImageUrl(image_url)) {
    return NextResponse.json(
      { error: 'Invalid image URL format' },
      { status: 400 }
    )
  }

  // Instagram requires an image
  if ((platform === 'instagram' || platform === 'multi') && !image_url) {
    return NextResponse.json(
      { error: 'Image URL is required for Instagram posts' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Verify content calendar entry exists
  const { data: calendarEntry, error: calendarError } = await supabase
    .from('content_calendar')
    .select('id, title, status')
    .eq('id', content_calendar_id)
    .single()

  if (calendarError || !calendarEntry) {
    return NextResponse.json(
      { error: 'Content calendar entry not found' },
      { status: 400 }
    )
  }

  // Prepare publishing results
  const results: {
    platform: string
    success: boolean
    postId?: string
    error?: string
  }[] = []

  // ============================================================================
  // PUBLISH TO INSTAGRAM
  // ============================================================================

  if (platform === 'instagram' || platform === 'multi') {
    const instagramResult = await publishInstagramPost({
      caption,
      imageUrl: image_url!,
      hashtags,
    })

    results.push({
      platform: 'instagram',
      success: instagramResult.success,
      postId: instagramResult.postId,
      error: instagramResult.error,
    })

    // Store in social_posts table
    if (instagramResult.success) {
      await supabase.from('social_posts').insert({
        content_calendar_id,
        platform: 'instagram',
        platform_post_id: instagramResult.postId,
        content_text: caption,
        image_url,
        published_at: new Date().toISOString(),
        status: 'published',
      })
    } else {
      // Store failed attempt
      await supabase.from('social_posts').insert({
        content_calendar_id,
        platform: 'instagram',
        content_text: caption,
        image_url,
        status: 'failed',
        error_message: instagramResult.error,
      })
    }
  }

  // ============================================================================
  // PUBLISH TO FACEBOOK
  // ============================================================================

  if (platform === 'facebook' || platform === 'multi') {
    const facebookResult = await publishFacebookPost({
      caption,
      imageUrl: image_url,
      hashtags,
    })

    results.push({
      platform: 'facebook',
      success: facebookResult.success,
      postId: facebookResult.postId,
      error: facebookResult.error,
    })

    // Store in social_posts table
    if (facebookResult.success) {
      await supabase.from('social_posts').insert({
        content_calendar_id,
        platform: 'facebook',
        platform_post_id: facebookResult.postId,
        content_text: caption,
        image_url,
        published_at: new Date().toISOString(),
        status: 'published',
      })
    } else {
      // Store failed attempt
      await supabase.from('social_posts').insert({
        content_calendar_id,
        platform: 'facebook',
        content_text: caption,
        image_url,
        status: 'failed',
        error_message: facebookResult.error,
      })
    }
  }

  // ============================================================================
  // UPDATE CONTENT CALENDAR STATUS
  // ============================================================================

  // Check if all posts succeeded
  const allSucceeded = results.every((r) => r.success)
  const anySucceeded = results.some((r) => r.success)

  if (allSucceeded) {
    // Update content calendar to published
    await supabase
      .from('content_calendar')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', content_calendar_id)
  } else if (anySucceeded) {
    // Partial success (e.g., Instagram succeeded but Facebook failed)
    await supabase
      .from('content_calendar')
      .update({
        status: 'published', // Still mark as published since at least one succeeded
        published_at: new Date().toISOString(),
      })
      .eq('id', content_calendar_id)
  } else {
    // All failed
    await supabase
      .from('content_calendar')
      .update({ status: 'failed' })
      .eq('id', content_calendar_id)
  }

  // ============================================================================
  // RETURN RESULTS
  // ============================================================================

  return NextResponse.json(
    {
      success: anySucceeded,
      results,
      message: allSucceeded
        ? 'Post published successfully to all platforms'
        : anySucceeded
          ? 'Post published partially (see results for details)'
          : 'Failed to publish post to all platforms',
    },
    { status: allSucceeded ? 200 : 207 } // 207 = Multi-Status for partial success
  )
}
