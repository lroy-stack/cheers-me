# Meta Graph API Integration

This document describes the Meta Graph API integration for publishing social media posts to Instagram and Facebook, and syncing engagement analytics.

## Overview

The GrandCafe Cheers platform integrates with Meta's Graph API to:

- ✅ Publish posts to Instagram Feed
- ✅ Publish posts to Facebook Page
- ✅ Cross-post to both platforms simultaneously
- ✅ Sync engagement metrics (likes, comments, shares, reach)
- ✅ Calculate engagement rates
- ✅ Track publishing errors

## Prerequisites

### 1. Meta Developer Account Setup

1. Create a Meta Developer account at https://developers.facebook.com/
2. Create a new app with "Business" type
3. Add "Instagram Basic Display" and "Instagram Graph API" products
4. Add "Facebook Pages" and "Facebook Login" products

### 2. Get Required Credentials

You need three environment variables:

```env
META_ACCESS_TOKEN=<your-page-access-token>
META_PAGE_ID=<your-facebook-page-id>
META_IG_USER_ID=<your-instagram-business-account-id>
```

#### Getting the Access Token

1. Go to Graph API Explorer: https://developers.facebook.com/tools/explorer
2. Select your app
3. Click "Get User Access Token"
4. Select permissions:
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `instagram_basic`
   - `instagram_content_publish`
5. Generate token
6. **Important:** Exchange for a long-lived token (60 days):

```bash
curl -i -X GET "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id={app-id}&client_secret={app-secret}&fb_exchange_token={short-lived-token}"
```

#### Getting the Page ID

```bash
curl -i -X GET "https://graph.facebook.com/v18.0/me/accounts?access_token={access-token}"
```

Find your page in the response and copy the `id` field.

#### Getting the Instagram Business Account ID

```bash
curl -i -X GET "https://graph.facebook.com/v18.0/{page-id}?fields=instagram_business_account&access_token={access-token}"
```

Copy the `instagram_business_account.id` from the response.

### 3. Instagram Account Requirements

- Account must be a **Business Account** (not Creator or Personal)
- Account must be connected to a Facebook Page
- Posts must include publicly accessible image URLs

## API Endpoints

### 1. Publish Post

**Endpoint:** `POST /api/marketing/social-posts/publish`

**Authentication:** Required (admin, manager roles)

**Request Body:**

```json
{
  "content_calendar_id": "uuid",
  "platform": "instagram" | "facebook" | "multi",
  "caption": "Post caption text with emojis 🎉",
  "hashtags": ["mallorca", "craftbeer", "cheers"],
  "image_url": "https://example.com/image.jpg"
}
```

**Response:**

```json
{
  "success": true,
  "results": [
    {
      "platform": "instagram",
      "success": true,
      "postId": "17895695668004550"
    },
    {
      "platform": "facebook",
      "success": true,
      "postId": "122104953768951234"
    }
  ],
  "message": "Post published successfully to all platforms"
}
```

**Example Usage:**

```typescript
const response = await fetch('/api/marketing/social-posts/publish', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content_calendar_id: 'abc-123',
    platform: 'multi',
    caption: 'Join us tonight for live DJ music! 🎶',
    hashtags: ['cheersmallorca', 'mallorcanightlife', 'elarenalbeach'],
    image_url: 'https://cheersmallorca.com/images/tonight.jpg',
  }),
})

const result = await response.json()
```

### 2. Sync Analytics

**Endpoint:** `POST /api/marketing/social-posts/sync-analytics`

**Authentication:** Required (admin, manager roles)

**Request Body (Option A - Sync specific post):**

```json
{
  "post_id": "uuid"
}
```

**Request Body (Option B - Sync all posts):**

```json
{
  "sync_all": true,
  "limit": 50
}
```

**Response:**

```json
{
  "success": true,
  "synced": 2,
  "total": 2,
  "results": [
    {
      "post_id": "abc-123",
      "platform": "instagram",
      "success": true
    },
    {
      "post_id": "def-456",
      "platform": "facebook",
      "success": true
    }
  ],
  "message": "Successfully synced analytics for 2 post(s)"
}
```

**Example Usage:**

```typescript
// Sync all recent posts
const response = await fetch('/api/marketing/social-posts/sync-analytics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sync_all: true,
    limit: 50,
  }),
})

const result = await response.json()
console.log(`Synced ${result.synced} posts`)
```

### 3. Get Sync Status

**Endpoint:** `GET /api/marketing/social-posts/sync-analytics?limit=20`

**Authentication:** Required (admin, manager roles)

**Response:**

```json
{
  "posts": [
    {
      "id": "abc-123",
      "platform": "instagram",
      "platform_post_id": "17895695668004550",
      "status": "published",
      "updated_at": "2024-06-15T20:30:00Z",
      "likes": 342,
      "comments": 28,
      "shares": 0,
      "reach": 2145,
      "engagement_rate": 17.25
    }
  ],
  "count": 1
}
```

## Library Functions

The Meta API client is located at `src/lib/meta/graph-api.ts`.

### Publishing Functions

#### `publishInstagramPost(options)`

Publishes a single image post to Instagram Feed.

```typescript
import { publishInstagramPost } from '@/lib/meta/graph-api'

const result = await publishInstagramPost({
  caption: 'Beautiful sunset at the beach 🌅',
  imageUrl: 'https://example.com/sunset.jpg',
  hashtags: ['mallorca', 'sunset', 'beachlife'],
})

if (result.success) {
  console.log('Post ID:', result.postId)
} else {
  console.error('Error:', result.error)
}
```

#### `publishFacebookPost(options)`

Publishes a post to Facebook Page (with or without image).

```typescript
import { publishFacebookPost } from '@/lib/meta/graph-api'

const result = await publishFacebookPost({
  caption: 'Join us tonight for live music!',
  imageUrl: 'https://example.com/event.jpg', // Optional
  hashtags: ['cheers', 'livemusic'],
})
```

### Analytics Functions

#### `getInstagramPostAnalytics(postId)`

Fetches engagement metrics for an Instagram post.

```typescript
import { getInstagramPostAnalytics } from '@/lib/meta/graph-api'

const analytics = await getInstagramPostAnalytics('17895695668004550')

if (analytics) {
  console.log('Likes:', analytics.likes)
  console.log('Comments:', analytics.comments)
  console.log('Reach:', analytics.reach)
  console.log('Engagement Rate:', analytics.engagement_rate + '%')
}
```

#### `getFacebookPostAnalytics(postId)`

Fetches engagement metrics for a Facebook post.

```typescript
import { getFacebookPostAnalytics } from '@/lib/meta/graph-api'

const analytics = await getFacebookPostAnalytics('122104953768951234')

if (analytics) {
  console.log('Reactions:', analytics.likes)
  console.log('Comments:', analytics.comments)
  console.log('Shares:', analytics.shares)
  console.log('Reach:', analytics.reach)
}
```

### Utility Functions

#### `isMetaConfigured()`

Checks if Meta API credentials are properly configured.

```typescript
import { isMetaConfigured } from '@/lib/meta/graph-api'

if (!isMetaConfigured()) {
  console.error('Meta API is not configured')
}
```

#### `validateImageUrl(url)`

Validates that an image URL is properly formatted.

```typescript
import { validateImageUrl } from '@/lib/meta/graph-api'

if (!validateImageUrl(imageUrl)) {
  console.error('Invalid image URL')
}
```

## Database Schema

### social_posts Table

| Column            | Type              | Description                               |
| ----------------- | ----------------- | ----------------------------------------- |
| id                | UUID              | Primary key                               |
| content_calendar_id | UUID            | Reference to content_calendar entry       |
| platform          | VARCHAR           | 'instagram' or 'facebook'                 |
| platform_post_id  | VARCHAR           | Post ID from Meta API                     |
| content_text      | TEXT              | Post caption including hashtags           |
| image_url         | TEXT              | URL of posted image                       |
| published_at      | TIMESTAMPTZ       | When post was published                   |
| status            | VARCHAR           | 'pending', 'published', or 'failed'       |
| likes             | INTEGER           | Total likes/reactions                     |
| comments          | INTEGER           | Total comments                            |
| shares            | INTEGER           | Total shares (Facebook only)              |
| reach             | INTEGER           | Unique accounts reached                   |
| engagement_rate   | NUMERIC(5,2)      | Auto-calculated: (likes+comments+shares)/reach * 100 |
| error_message     | TEXT              | Error from Meta API if publishing failed  |
| created_at        | TIMESTAMPTZ       | Record creation time                      |
| updated_at        | TIMESTAMPTZ       | Last update time                          |

## Error Handling

### Common Errors

#### 1. Invalid Access Token

```json
{
  "error": "Failed to publish Instagram post: Error validating access token"
}
```

**Solution:** Regenerate your access token or exchange for a new long-lived token.

#### 2. Image URL Not Accessible

```json
{
  "error": "Failed to create Instagram container: Invalid image URL"
}
```

**Solution:** Ensure the image URL is publicly accessible (not behind authentication).

#### 3. Instagram Business Account Not Connected

```json
{
  "error": "Failed to publish Instagram post: Instagram account is not a business account"
}
```

**Solution:** Convert your Instagram account to a Business account and connect it to your Facebook Page.

#### 4. Caption Too Long

```json
{
  "error": "Validation failed",
  "details": [
    {
      "message": "String must contain at most 2200 character(s)"
    }
  ]
}
```

**Solution:** Instagram captions have a 2,200 character limit. Shorten your caption.

### Retry Logic

For transient errors (network issues, rate limits), implement exponential backoff:

```typescript
async function publishWithRetry(options: PublishOptions, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const result = await publishInstagramPost(options)

    if (result.success) {
      return result
    }

    // Wait before retrying (exponential backoff)
    if (i < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, i)))
    }
  }

  throw new Error('Failed after retries')
}
```

## Rate Limits

Meta imposes rate limits on API calls:

- **Instagram Content Publishing:** 50 posts per 24 hours per user
- **Facebook Page Posts:** 50 posts per 24 hours per page
- **Insights API:** 200 calls per hour per app

The platform handles these limits by:
- Tracking failed requests with error messages
- Storing posts with 'failed' status for manual retry
- Implementing analytics sync on-demand (not real-time polling)

## Best Practices

### 1. Image Requirements

- **Format:** JPEG or PNG
- **Size:** Maximum 8MB
- **Dimensions:** Minimum 320px width
- **Aspect Ratio:** 1.91:1 to 4:5 (Instagram), any ratio (Facebook)
- **URL:** Must be publicly accessible via HTTPS

### 2. Caption Guidelines

- **Instagram:** Max 2,200 characters
- **Facebook:** Max 63,206 characters (but shorter is better)
- **Hashtags:** 3-5 relevant hashtags for optimal reach
- **Emojis:** Use strategically for engagement

### 3. Posting Schedule

Best times to post for GrandCafe Cheers (Mallorca timezone):
- **Morning:** 10:00-11:00 (breakfast/brunch announcement)
- **Afternoon:** 14:00-15:00 (lunch specials)
- **Evening:** 19:00-20:00 (dinner/events announcement)

### 4. Analytics Sync Strategy

- Sync analytics **24 hours after posting** for accurate metrics
- Re-sync weekly for older posts to track long-term engagement
- Use sync_all with limit for batch updates

## Troubleshooting

### Check Configuration

```bash
# Test if environment variables are set
curl http://localhost:3000/api/marketing/social-posts/publish \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

If you get "Meta API is not configured", check your `.env` file.

### Test Access Token

```bash
# Verify access token is valid
curl -i -X GET "https://graph.facebook.com/v18.0/me?access_token={YOUR_TOKEN}"
```

Should return your Facebook user info.

### Test Page Access

```bash
# Verify page ID is correct
curl -i -X GET "https://graph.facebook.com/v18.0/{PAGE_ID}?access_token={TOKEN}"
```

### Test Instagram Connection

```bash
# Verify Instagram account is connected
curl -i -X GET "https://graph.facebook.com/v18.0/{PAGE_ID}?fields=instagram_business_account&access_token={TOKEN}"
```

## Frontend Integration

Example React component for publishing posts:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function PublishButton({ contentId, caption, imageUrl, platform }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handlePublish = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/marketing/social-posts/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_calendar_id: contentId,
          platform,
          caption,
          image_url: imageUrl,
          hashtags: ['cheersmallorca', 'mallorca'],
        }),
      })

      const data = await res.json()
      setResult(data)

      if (data.success) {
        alert('Post published successfully!')
      } else {
        alert('Failed to publish: ' + data.message)
      }
    } catch (error) {
      alert('Error publishing post')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handlePublish} disabled={loading}>
      {loading ? 'Publishing...' : 'Publish Now'}
    </Button>
  )
}
```

## Support

For Meta Graph API issues:
- Meta Developer Documentation: https://developers.facebook.com/docs/graph-api
- Instagram API Documentation: https://developers.facebook.com/docs/instagram-api
- Meta Business Help Center: https://www.facebook.com/business/help

For platform-specific issues, contact the GrandCafe Cheers development team.
