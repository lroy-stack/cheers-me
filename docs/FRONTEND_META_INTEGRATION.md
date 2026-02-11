# Frontend Integration Guide - Meta API

This guide is for the **Frontend Agent** to integrate Meta Graph API features into the Marketing & Social Media UI.

## Overview

The backend has implemented:
- ✅ Meta Graph API client library
- ✅ Instagram post publishing
- ✅ Facebook post publishing
- ✅ Cross-platform publishing (multi)
- ✅ Analytics syncing
- ✅ Error tracking and reporting

## What You Need to Build

### 1. Post Creator UI Enhancements

**Location:** `src/app/marketing/create/page.tsx`

#### Add "Publish Now" Button

When a user finishes creating a post in the Post Creator, add a button to publish immediately:

```tsx
<Button
  onClick={handlePublishNow}
  disabled={!imageUrl || !caption || publishing}
>
  {publishing ? 'Publishing...' : 'Publish Now to ' + platform}
</Button>
```

#### API Call Example

```typescript
async function handlePublishNow() {
  setPublishing(true)

  try {
    const response = await fetch('/api/marketing/social-posts/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content_calendar_id: contentId,
        platform: selectedPlatform, // 'instagram', 'facebook', or 'multi'
        caption: postCaption,
        hashtags: ['cheersmallorca', 'mallorca', 'beachlife'], // extract from caption or separate field
        image_url: uploadedImageUrl,
      }),
    })

    const result = await response.json()

    if (result.success) {
      toast.success('Post published successfully!')
      // Show which platforms succeeded
      result.results.forEach((r) => {
        if (r.success) {
          console.log(`✅ ${r.platform}: ${r.postId}`)
        } else {
          console.error(`❌ ${r.platform}: ${r.error}`)
        }
      })
    } else {
      toast.error('Failed to publish: ' + result.message)
    }
  } catch (error) {
    toast.error('Error publishing post')
  } finally {
    setPublishing(false)
  }
}
```

### 2. Content Calendar UI - Publish Action

**Location:** `src/app/marketing/page.tsx` (Content Calendar)

For each calendar entry with status='scheduled', add a "Publish" button:

```tsx
{entry.status === 'scheduled' && (
  <Button
    size="sm"
    onClick={() => handlePublish(entry.id)}
  >
    Publish Now
  </Button>
)}
```

Use the same API call as above, fetching the `content_text` and `image_url` from the calendar entry.

### 3. Analytics Dashboard

**Location:** `src/app/marketing/page.tsx` or create `src/app/marketing/analytics/page.tsx`

#### Display Post Performance

Fetch published posts with analytics:

```typescript
async function fetchPostAnalytics() {
  const response = await fetch('/api/marketing/social-posts?status=published&limit=20')
  const posts = await response.json()

  // posts now includes: likes, comments, shares, reach, engagement_rate
  return posts
}
```

#### UI Components Needed

1. **Analytics Cards** - Show top-performing posts:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Top Posts This Week</CardTitle>
  </CardHeader>
  <CardContent>
    {posts.map((post) => (
      <div key={post.id} className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {post.image_url && (
            <img src={post.image_url} className="w-16 h-16 rounded object-cover" />
          )}
          <div>
            <p className="font-medium">{truncate(post.content_text, 50)}</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(post.published_at), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold">{post.engagement_rate}%</p>
          <p className="text-xs text-muted-foreground">Engagement</p>
        </div>
      </div>
    ))}
  </CardContent>
</Card>
```

2. **Metrics Overview**:

```tsx
<div className="grid grid-cols-4 gap-4">
  <MetricCard
    title="Total Reach"
    value={posts.reduce((sum, p) => sum + (p.reach || 0), 0)}
    icon={<Users />}
  />
  <MetricCard
    title="Total Likes"
    value={posts.reduce((sum, p) => sum + (p.likes || 0), 0)}
    icon={<Heart />}
  />
  <MetricCard
    title="Total Comments"
    value={posts.reduce((sum, p) => sum + (p.comments || 0), 0)}
    icon={<MessageCircle />}
  />
  <MetricCard
    title="Avg Engagement"
    value={
      (posts.reduce((sum, p) => sum + (p.engagement_rate || 0), 0) / posts.length).toFixed(1) + '%'
    }
    icon={<TrendingUp />}
  />
</div>
```

### 4. Sync Analytics Button

Add a button to manually sync analytics:

```tsx
<Button onClick={handleSyncAnalytics} disabled={syncing}>
  {syncing ? 'Syncing...' : 'Sync Analytics'}
</Button>
```

```typescript
async function handleSyncAnalytics() {
  setSyncing(true)

  try {
    const response = await fetch('/api/marketing/social-posts/sync-analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sync_all: true,
        limit: 50,
      }),
    })

    const result = await response.json()

    if (result.success) {
      toast.success(`Synced ${result.synced} of ${result.total} posts`)
      // Refresh the posts list
      await fetchPostAnalytics()
    } else {
      toast.error('Failed to sync analytics')
    }
  } catch (error) {
    toast.error('Error syncing analytics')
  } finally {
    setSyncing(false)
  }
}
```

### 5. Error Handling UI

For posts with `status='failed'`, show the error message:

```tsx
{post.status === 'failed' && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Publishing Failed</AlertTitle>
    <AlertDescription>
      {post.error_message || 'Unknown error occurred'}
    </AlertDescription>
  </Alert>
)}
```

Add a "Retry" button for failed posts.

### 6. Platform Selection

Add radio buttons or tabs for platform selection:

```tsx
<Tabs value={platform} onValueChange={setPlatform}>
  <TabsList>
    <TabsTrigger value="instagram">
      <Instagram className="mr-2 h-4 w-4" />
      Instagram
    </TabsTrigger>
    <TabsTrigger value="facebook">
      <Facebook className="mr-2 h-4 w-4" />
      Facebook
    </TabsTrigger>
    <TabsTrigger value="multi">
      <Share2 className="mr-2 h-4 w-4" />
      Both
    </TabsTrigger>
  </TabsList>
</Tabs>
```

### 7. Image Upload Validation

When the user uploads an image, validate it meets Instagram requirements:

```typescript
function validateImageForInstagram(file: File): string | null {
  // Max 8MB
  if (file.size > 8 * 1024 * 1024) {
    return 'Image must be less than 8MB'
  }

  // Must be JPEG or PNG
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    return 'Image must be JPEG or PNG format'
  }

  return null // Valid
}
```

### 8. Hashtag Input Field

Add a hashtag input field (optional, separate from caption):

```tsx
<Label>Hashtags (optional)</Label>
<Input
  placeholder="mallorca, craftbeer, cheers"
  value={hashtagInput}
  onChange={(e) => setHashtagInput(e.target.value)}
/>
<p className="text-sm text-muted-foreground">
  Separate with commas. Don't include # symbol.
</p>
```

Parse hashtags on submit:

```typescript
const hashtags = hashtagInput
  .split(',')
  .map((tag) => tag.trim())
  .filter(Boolean)
```

## Types to Use

Import these types from `@/types/marketing`:

```typescript
import type {
  SocialPost,
  PublishPostRequest,
  PublishPostResponse,
  SyncAnalyticsRequest,
  SyncAnalyticsResponse,
} from '@/types/marketing'
```

## Environment Check

Before showing the "Publish" button, check if Meta API is configured:

```typescript
// Create a client-side check (call an API endpoint)
async function checkMetaConfigured() {
  try {
    const response = await fetch('/api/marketing/social-posts/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true }),
    })

    const data = await response.json()

    if (data.error?.includes('not configured')) {
      return false
    }

    return true
  } catch {
    return false
  }
}
```

Show a banner if not configured:

```tsx
{!metaConfigured && (
  <Alert>
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Meta API Not Configured</AlertTitle>
    <AlertDescription>
      Contact your administrator to set up Instagram and Facebook publishing.
    </AlertDescription>
  </Alert>
)}
```

## Testing Checklist

Before marking this feature as complete, test:

- [ ] Publish to Instagram only
- [ ] Publish to Facebook only
- [ ] Cross-post to both platforms (multi)
- [ ] Handle publishing errors gracefully
- [ ] Display error messages for failed posts
- [ ] Sync analytics for a single post
- [ ] Sync analytics for all posts
- [ ] Display engagement metrics (likes, comments, shares, reach)
- [ ] Calculate and display engagement rate
- [ ] Retry publishing a failed post
- [ ] Image validation (size, format)
- [ ] Caption length validation (max 2200 chars for Instagram)
- [ ] Hashtag parsing and formatting

## Icons to Use

From `lucide-react`:

```tsx
import {
  Instagram,
  Facebook,
  Share2,
  Heart,
  MessageCircle,
  Users,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
```

## Example: Complete Publish Flow

```typescript
// 1. User creates post in Post Creator
const [caption, setCaption] = useState('')
const [imageUrl, setImageUrl] = useState('')
const [platform, setPlatform] = useState<'instagram' | 'facebook' | 'multi'>('multi')
const [hashtags, setHashtags] = useState<string[]>([])

// 2. User clicks "Publish Now"
async function handlePublish() {
  // Validate
  if (platform === 'instagram' && !imageUrl) {
    toast.error('Instagram posts require an image')
    return
  }

  if (caption.length > 2200) {
    toast.error('Caption is too long (max 2200 characters)')
    return
  }

  setPublishing(true)

  try {
    // First, save to content_calendar if not already saved
    let contentId = existingContentId

    if (!contentId) {
      const saveResponse = await fetch('/api/marketing/content-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: caption.substring(0, 50) + '...',
          content_text: caption,
          image_url: imageUrl,
          platform,
          language: 'en',
          status: 'scheduled',
        }),
      })

      const saveResult = await saveResponse.json()
      contentId = saveResult.id
    }

    // Now publish
    const response = await fetch('/api/marketing/social-posts/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content_calendar_id: contentId,
        platform,
        caption,
        hashtags,
        image_url: imageUrl,
      }),
    })

    const result: PublishPostResponse = await response.json()

    if (result.success) {
      toast.success('Post published successfully! 🎉')

      // Show details
      result.results.forEach((r) => {
        console.log(`${r.platform}: ${r.success ? '✅' : '❌'}`)
      })

      // Redirect to calendar or analytics
      router.push('/marketing')
    } else {
      toast.error('Failed to publish: ' + result.message)
    }
  } catch (error) {
    toast.error('Error publishing post')
  } finally {
    setPublishing(false)
  }
}
```

## Questions?

If you have questions about the backend API or need additional endpoints, contact the Backend Agent.

For Meta Graph API documentation, see: `docs/META_API_INTEGRATION.md`
