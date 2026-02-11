/**
 * Meta Graph API Client for Instagram and Facebook Publishing
 *
 * Provides methods to:
 * - Publish posts to Instagram Feed
 * - Publish posts to Facebook Page
 * - Retrieve engagement analytics (likes, comments, reach, shares)
 *
 * @see https://developers.facebook.com/docs/graph-api
 * @see https://developers.facebook.com/docs/instagram-api
 */

// ============================================================================
// TYPES
// ============================================================================

export interface MetaPublishOptions {
  caption: string
  imageUrl?: string
  hashtags?: string[]
}

export interface InstagramPublishResult {
  success: boolean
  postId?: string
  error?: string
}

export interface FacebookPublishResult {
  success: boolean
  postId?: string
  error?: string
}

export interface PostAnalytics {
  likes: number
  comments: number
  shares: number
  reach: number
  engagement_rate: number
}

// ============================================================================
// ENVIRONMENT VALIDATION
// ============================================================================

function validateMetaConfig() {
  const accessToken = process.env.META_ACCESS_TOKEN
  const pageId = process.env.META_PAGE_ID
  const igUserId = process.env.META_IG_USER_ID

  if (!accessToken) {
    throw new Error('META_ACCESS_TOKEN environment variable is not set')
  }

  if (!pageId) {
    throw new Error('META_PAGE_ID environment variable is not set')
  }

  if (!igUserId) {
    throw new Error('META_IG_USER_ID environment variable is not set')
  }

  return { accessToken, pageId, igUserId }
}

// ============================================================================
// INSTAGRAM PUBLISHING
// ============================================================================

/**
 * Publishes a single image post to Instagram Feed
 *
 * Process:
 * 1. Create container (upload image + caption)
 * 2. Publish container
 *
 * @see https://developers.facebook.com/docs/instagram-api/guides/content-publishing
 */
export async function publishInstagramPost(
  options: MetaPublishOptions
): Promise<InstagramPublishResult> {
  try {
    const { accessToken, igUserId } = validateMetaConfig()

    if (!options.imageUrl) {
      return {
        success: false,
        error: 'Image URL is required for Instagram posts',
      }
    }

    // Step 1: Create media container
    const caption = formatCaption(options.caption, options.hashtags)
    const containerUrl = `https://graph.facebook.com/v18.0/${igUserId}/media`
    const containerParams = new URLSearchParams({
      image_url: options.imageUrl,
      caption: caption,
      access_token: accessToken,
    })

    const containerResponse = await fetch(`${containerUrl}?${containerParams}`, {
      method: 'POST',
    })

    if (!containerResponse.ok) {
      const errorData = await containerResponse.json()
      return {
        success: false,
        error: `Failed to create Instagram container: ${errorData.error?.message || 'Unknown error'}`,
      }
    }

    const { id: containerId } = await containerResponse.json()

    // Step 2: Publish the container
    const publishUrl = `https://graph.facebook.com/v18.0/${igUserId}/media_publish`
    const publishParams = new URLSearchParams({
      creation_id: containerId,
      access_token: accessToken,
    })

    const publishResponse = await fetch(`${publishUrl}?${publishParams}`, {
      method: 'POST',
    })

    if (!publishResponse.ok) {
      const errorData = await publishResponse.json()
      return {
        success: false,
        error: `Failed to publish Instagram post: ${errorData.error?.message || 'Unknown error'}`,
      }
    }

    const { id: mediaId } = await publishResponse.json()

    return {
      success: true,
      postId: mediaId,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error publishing Instagram post',
    }
  }
}

// ============================================================================
// FACEBOOK PUBLISHING
// ============================================================================

/**
 * Publishes a post to Facebook Page
 *
 * Supports:
 * - Text-only posts
 * - Photo posts with caption
 *
 * @see https://developers.facebook.com/docs/graph-api/reference/page/feed
 */
export async function publishFacebookPost(
  options: MetaPublishOptions
): Promise<FacebookPublishResult> {
  try {
    const { accessToken, pageId } = validateMetaConfig()

    const caption = formatCaption(options.caption, options.hashtags)
    const url = `https://graph.facebook.com/v18.0/${pageId}/feed`

    // Build request body
    const params = new URLSearchParams({
      message: caption,
      access_token: accessToken,
    })

    // If image is provided, use photo endpoint instead
    if (options.imageUrl) {
      const photoUrl = `https://graph.facebook.com/v18.0/${pageId}/photos`
      const photoParams = new URLSearchParams({
        url: options.imageUrl,
        caption: caption,
        access_token: accessToken,
      })

      const response = await fetch(`${photoUrl}?${photoParams}`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        return {
          success: false,
          error: `Failed to publish Facebook photo: ${errorData.error?.message || 'Unknown error'}`,
        }
      }

      const { id: postId } = await response.json()

      return {
        success: true,
        postId,
      }
    } else {
      // Text-only post
      const response = await fetch(`${url}?${params}`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        return {
          success: false,
          error: `Failed to publish Facebook post: ${errorData.error?.message || 'Unknown error'}`,
        }
      }

      const { id: postId } = await response.json()

      return {
        success: true,
        postId,
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error publishing Facebook post',
    }
  }
}

// ============================================================================
// ANALYTICS RETRIEVAL
// ============================================================================

/**
 * Retrieves engagement analytics for an Instagram post
 *
 * Metrics:
 * - like_count: Total likes
 * - comments_count: Total comments
 * - reach: Unique accounts reached
 * - engagement: Total interactions (likes + comments + saves + shares)
 *
 * @see https://developers.facebook.com/docs/instagram-api/reference/ig-media/insights
 */
export async function getInstagramPostAnalytics(
  postId: string
): Promise<PostAnalytics | null> {
  try {
    const { accessToken } = validateMetaConfig()

    // Fetch post insights
    const url = `https://graph.facebook.com/v18.0/${postId}`
    const params = new URLSearchParams({
      fields: 'like_count,comments_count,insights.metric(reach,engagement)',
      access_token: accessToken,
    })

    const response = await fetch(`${url}?${params}`)

    if (!response.ok) {
      console.error('Failed to fetch Instagram analytics:', await response.text())
      return null
    }

    const data = await response.json()

    // Extract metrics
    const likes = data.like_count || 0
    const comments = data.comments_count || 0

    // Insights are returned as an array of metric objects
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reach = data.insights?.data?.find((m: any) => m.name === 'reach')?.values?.[0]?.value || 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const engagement = data.insights?.data?.find((m: any) => m.name === 'engagement')?.values?.[0]?.value || 0

    // Calculate engagement rate
    const engagementRate = reach > 0 ? (engagement / reach) * 100 : 0

    return {
      likes,
      comments,
      shares: 0, // Instagram API doesn't provide share count directly
      reach,
      engagement_rate: parseFloat(engagementRate.toFixed(2)),
    }
  } catch (error) {
    console.error('Error fetching Instagram analytics:', error)
    return null
  }
}

/**
 * Retrieves engagement analytics for a Facebook post
 *
 * Metrics:
 * - reactions: Total reactions (likes, love, wow, etc.)
 * - comments: Total comments
 * - shares: Total shares
 * - reach: Unique users reached
 *
 * @see https://developers.facebook.com/docs/graph-api/reference/post
 */
export async function getFacebookPostAnalytics(
  postId: string
): Promise<PostAnalytics | null> {
  try {
    const { accessToken } = validateMetaConfig()

    // Fetch post data and insights
    const url = `https://graph.facebook.com/v18.0/${postId}`
    const params = new URLSearchParams({
      fields: 'reactions.summary(true),comments.summary(true),shares,insights.metric(post_impressions_unique)',
      access_token: accessToken,
    })

    const response = await fetch(`${url}?${params}`)

    if (!response.ok) {
      console.error('Failed to fetch Facebook analytics:', await response.text())
      return null
    }

    const data = await response.json()

    // Extract metrics
    const likes = data.reactions?.summary?.total_count || 0
    const comments = data.comments?.summary?.total_count || 0
    const shares = data.shares?.count || 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reach = data.insights?.data?.find((m: any) => m.name === 'post_impressions_unique')?.values?.[0]?.value || 0

    // Calculate engagement rate
    const totalEngagement = likes + comments + shares
    const engagementRate = reach > 0 ? (totalEngagement / reach) * 100 : 0

    return {
      likes,
      comments,
      shares,
      reach,
      engagement_rate: parseFloat(engagementRate.toFixed(2)),
    }
  } catch (error) {
    console.error('Error fetching Facebook analytics:', error)
    return null
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Formats caption with hashtags
 * Ensures proper spacing between caption text and hashtags
 */
function formatCaption(caption: string, hashtags?: string[]): string {
  if (!hashtags || hashtags.length === 0) {
    return caption
  }

  const formattedHashtags = hashtags
    .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
    .join(' ')

  return `${caption}\n\n${formattedHashtags}`
}

/**
 * Validates image URL format
 * Meta API requires publicly accessible URLs
 */
export function validateImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Checks if Meta API credentials are configured
 */
export function isMetaConfigured(): boolean {
  return !!(
    process.env.META_ACCESS_TOKEN &&
    process.env.META_PAGE_ID &&
    process.env.META_IG_USER_ID
  )
}
