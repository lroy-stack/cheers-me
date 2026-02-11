import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import {
  getInstagramPostAnalytics,
  getFacebookPostAnalytics,
  isMetaConfigured,
} from '@/lib/meta/graph-api'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const syncAnalyticsSchema = z.object({
  post_id: z.string().uuid().optional(), // Sync specific post
  sync_all: z.boolean().optional().default(false), // Sync all published posts
  limit: z.number().int().min(1).max(100).optional().default(50), // Limit when syncing all
})

// ============================================================================
// POST /api/marketing/social-posts/sync-analytics
// ============================================================================

/**
 * Syncs engagement analytics from Meta API for published social posts
 *
 * Required role: admin, manager
 *
 * Request body:
 * - post_id: UUID of specific post to sync (optional)
 * - sync_all: Boolean to sync all published posts (default: false)
 * - limit: Max number of posts to sync when sync_all=true (default: 50)
 *
 * Returns:
 * - 200: Analytics synced successfully
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
  const validation = syncAnalyticsSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: validation.error.errors,
      },
      { status: 400 }
    )
  }

  const { post_id, sync_all, limit } = validation.data

  const supabase = await createClient()

  // ============================================================================
  // FETCH POSTS TO SYNC
  // ============================================================================

  let postsToSync: Array<{
    id: string
    platform: string
    platform_post_id: string | null
  }> = []

  if (post_id) {
    // Sync specific post
    const { data: post, error } = await supabase
      .from('social_posts')
      .select('id, platform, platform_post_id')
      .eq('id', post_id)
      .eq('status', 'published')
      .single()

    if (error || !post) {
      return NextResponse.json(
        { error: 'Post not found or not published' },
        { status: 400 }
      )
    }

    if (!post.platform_post_id) {
      return NextResponse.json(
        { error: 'Post does not have a platform_post_id (cannot sync analytics)' },
        { status: 400 }
      )
    }

    postsToSync = [post]
  } else if (sync_all) {
    // Sync all published posts with platform_post_id
    const { data: posts, error } = await supabase
      .from('social_posts')
      .select('id, platform, platform_post_id')
      .eq('status', 'published')
      .not('platform_post_id', 'is', null)
      .order('published_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch posts', details: error.message },
        { status: 500 }
      )
    }

    postsToSync = posts || []
  } else {
    return NextResponse.json(
      { error: 'Either post_id or sync_all must be specified' },
      { status: 400 }
    )
  }

  // ============================================================================
  // SYNC ANALYTICS FOR EACH POST
  // ============================================================================

  const results: Array<{
    post_id: string
    platform: string
    success: boolean
    error?: string
  }> = []

  for (const post of postsToSync) {
    if (!post.platform_post_id) {
      results.push({
        post_id: post.id,
        platform: post.platform,
        success: false,
        error: 'Missing platform_post_id',
      })
      continue
    }

    try {
      let analytics = null

      if (post.platform === 'instagram') {
        analytics = await getInstagramPostAnalytics(post.platform_post_id)
      } else if (post.platform === 'facebook') {
        analytics = await getFacebookPostAnalytics(post.platform_post_id)
      }

      if (!analytics) {
        results.push({
          post_id: post.id,
          platform: post.platform,
          success: false,
          error: 'Failed to fetch analytics from Meta API',
        })
        continue
      }

      // Update post with analytics
      const { error: updateError } = await supabase
        .from('social_posts')
        .update({
          likes: analytics.likes,
          comments: analytics.comments,
          shares: analytics.shares,
          reach: analytics.reach,
          engagement_rate: analytics.engagement_rate,
        })
        .eq('id', post.id)

      if (updateError) {
        results.push({
          post_id: post.id,
          platform: post.platform,
          success: false,
          error: `Failed to update database: ${updateError.message}`,
        })
        continue
      }

      results.push({
        post_id: post.id,
        platform: post.platform,
        success: true,
      })
    } catch (error) {
      results.push({
        post_id: post.id,
        platform: post.platform,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // ============================================================================
  // RETURN RESULTS
  // ============================================================================

  const successCount = results.filter((r) => r.success).length
  const totalCount = results.length

  return NextResponse.json({
    success: successCount > 0,
    synced: successCount,
    total: totalCount,
    results,
    message:
      successCount === totalCount
        ? `Successfully synced analytics for ${successCount} post(s)`
        : successCount > 0
          ? `Synced ${successCount} of ${totalCount} posts (see results for details)`
          : `Failed to sync analytics for all ${totalCount} posts`,
  })
}

// ============================================================================
// GET /api/marketing/social-posts/sync-analytics
// ============================================================================

/**
 * Retrieves sync status and last sync time for posts
 *
 * Required role: admin, manager
 *
 * Query params:
 * - limit: Number of posts to return (default: 20)
 *
 * Returns:
 * - Posts with their last updated timestamp and analytics status
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '20', 10)

  const supabase = await createClient()

  const { data: posts, error } = await supabase
    .from('social_posts')
    .select('id, platform, platform_post_id, status, updated_at, likes, comments, shares, reach, engagement_rate')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch posts', details: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    posts: posts || [],
    count: posts?.length || 0,
  })
}
