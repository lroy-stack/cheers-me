# Marketing & Social Media API Documentation

## Overview

This document describes the API routes for Module 7 (Marketing & Social Media) of the GrandCafe Cheers platform. All routes require authentication and role-based authorization unless explicitly marked as public.

**Base path:** `/api/marketing/`

**Required roles:** `admin`, `manager` (unless otherwise noted)

---

## Content Calendar API

Manage social media content planning and scheduling.

### `GET /api/marketing/content-calendar`

List all content calendar entries with optional filters.

**Auth:** Required (admin, manager)

**Query Parameters:**
- `status` (optional): Filter by status (`draft`, `scheduled`, `published`, `failed`)
- `platform` (optional): Filter by platform (`instagram`, `facebook`, `multi`)
- `language` (optional): Filter by language (`nl`, `en`, `es`)
- `from` (optional): Filter by scheduled_date >= ISO date
- `to` (optional): Filter by scheduled_date <= ISO date

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "title": "Summer Beach Party Announcement",
    "description": "Promote upcoming DJ night",
    "content_text": "Join us this Saturday...",
    "image_url": "https://...",
    "platform": "instagram",
    "scheduled_date": "2024-07-15T18:00:00Z",
    "published_at": null,
    "status": "scheduled",
    "language": "en",
    "created_by": "uuid",
    "created_at": "2024-07-10T10:30:00Z",
    "updated_at": "2024-07-10T10:30:00Z",
    "created_by_employee": {
      "id": "uuid",
      "profile": {
        "id": "uuid",
        "full_name": "Leroy Manager"
      }
    }
  }
]
```

### `POST /api/marketing/content-calendar`

Create a new content calendar entry.

**Auth:** Required (admin, manager)

**Request Body:**
```json
{
  "title": "Summer Beach Party Announcement",
  "description": "Promote upcoming DJ night",
  "content_text": "Join us this Saturday for an unforgettable night!",
  "image_url": "https://storage.example.com/party.jpg",
  "platform": "instagram",
  "scheduled_date": "2024-07-15T18:00:00Z",
  "status": "scheduled",
  "language": "en"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "title": "Summer Beach Party Announcement",
  ...
}
```

### `GET /api/marketing/content-calendar/[id]`

Get a single content calendar entry with related social posts.

**Auth:** Required (admin, manager)

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "title": "Summer Beach Party Announcement",
  ...,
  "social_posts": [
    {
      "id": "uuid",
      "platform": "instagram",
      "status": "published",
      "likes": 234,
      "comments": 12
    }
  ]
}
```

### `PATCH /api/marketing/content-calendar/[id]`

Update a content calendar entry.

**Auth:** Required (admin, manager)

**Request Body:** (partial update supported)
```json
{
  "status": "published",
  "published_at": "2024-07-15T18:05:23Z"
}
```

**Response:** `200 OK`

### `DELETE /api/marketing/content-calendar/[id]`

Delete a content calendar entry (cascades to related social_posts).

**Auth:** Required (admin, manager)

**Response:** `200 OK`
```json
{
  "success": true
}
```

---

## Social Posts API

Track published social media posts and engagement metrics.

### `GET /api/marketing/social-posts`

List all social posts with engagement data.

**Auth:** Required (admin, manager)

**Query Parameters:**
- `status` (optional): Filter by status (`pending`, `published`, `failed`)
- `platform` (optional): Filter by platform (`instagram`, `facebook`)
- `content_calendar_id` (optional): Filter by parent content calendar entry
- `limit` (optional): Limit results (default: 50)

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "content_calendar_id": "uuid",
    "platform": "instagram",
    "platform_post_id": "17841234567890123",
    "caption": "Beautiful sunset at Playa de Palma 🌅",
    "hashtags": "#mallorca #playadepalma #cheers #sunset",
    "image_url": "https://...",
    "published_at": "2024-07-15T18:05:23Z",
    "status": "published",
    "likes": 234,
    "comments": 12,
    "shares": 5,
    "reach": 3421,
    "created_at": "2024-07-15T18:05:00Z",
    "updated_at": "2024-07-16T10:00:00Z",
    "content_calendar": {
      "id": "uuid",
      "title": "Sunset Post",
      "scheduled_date": "2024-07-15T18:00:00Z"
    }
  }
]
```

### `POST /api/marketing/social-posts`

Create a social post record (typically after publishing via Meta API).

**Auth:** Required (admin, manager)

**Request Body:**
```json
{
  "content_calendar_id": "uuid",
  "platform": "instagram",
  "platform_post_id": "17841234567890123",
  "caption": "Beautiful sunset at Playa de Palma 🌅",
  "hashtags": "#mallorca #playadepalma #cheers #sunset",
  "image_url": "https://...",
  "published_at": "2024-07-15T18:05:23Z",
  "status": "published"
}
```

**Response:** `201 Created`

### `GET /api/marketing/social-posts/[id]`

Get a single social post with details.

**Auth:** Required (admin, manager)

**Response:** `200 OK`

### `PATCH /api/marketing/social-posts/[id]`

Update a social post (typically for syncing engagement metrics from Meta API).

**Auth:** Required (admin, manager)

**Request Body:**
```json
{
  "likes": 250,
  "comments": 15,
  "shares": 8,
  "reach": 4123
}
```

**Response:** `200 OK`

### `DELETE /api/marketing/social-posts/[id]`

Delete a social post record (does not delete from social media).

**Auth:** Required (admin, manager)

**Response:** `200 OK`

---

## AI Content Generation API

Generate social media content using Claude AI.

### `POST /api/marketing/ai-generate`

Generate AI-powered marketing content.

**Auth:** Required (admin, manager)

**Request Body:**
```json
{
  "type": "post",
  "topic": "New craft beer menu with 22 beers on tap",
  "language": "en",
  "platform": "instagram",
  "tone": "playful",
  "include_hashtags": true,
  "context": "Focus on the variety and quality of Belgian beers"
}
```

**Parameters:**
- `type`: `post` | `reel_script` | `newsletter`
- `topic`: What the content should be about (1-500 chars)
- `language`: `nl` | `en` | `es`
- `platform`: `instagram` | `facebook` | `multi` (for posts only)
- `tone`: `casual` | `professional` | `playful` | `elegant`
- `include_hashtags`: boolean (for posts)
- `context`: Additional context/requirements (optional, max 1000 chars)

**Response:** `200 OK` (for type: "post")
```json
{
  "success": true,
  "type": "post",
  "language": "en",
  "content": {
    "caption": "🍺 22 craft beers, endless possibilities! Discover our new beer menu featuring the finest Belgian brews and international favorites. From crisp lagers to bold IPAs, there's something for every beer lover. Which one will you try first?",
    "hashtags": "#craftbeer #beerlover #mallorca #cheers #belgianbeers #beerme",
    "image_suggestion": "Overhead shot of multiple beer glasses on a wooden table with the beach in the background"
  },
  "usage": {
    "input_tokens": 245,
    "output_tokens": 132
  }
}
```

**Response:** `200 OK` (for type: "reel_script")
```json
{
  "success": true,
  "type": "reel_script",
  "language": "en",
  "content": {
    "title": "22 Beers, One Perfect Night 🍻",
    "script": "0-3s: Quick pan across the tap wall\n3-7s: Bartender pouring a perfect pour\n7-12s: Close-ups of different beer styles\n12-15s: Happy customers toasting at sunset\nText overlay: '22 craft beers on tap 🍺 @cheersmallorca'",
    "music_suggestion": "Upbeat indie rock or summer vibes",
    "hashtags": "#craftbeer #beertok #mallorca #reels #beerlover"
  },
  "usage": {
    "input_tokens": 267,
    "output_tokens": 158
  }
}
```

**Error Response:** `500 Internal Server Error`
```json
{
  "error": "Failed to generate content",
  "details": "API key not configured"
}
```

---

## Newsletters API

Manage email newsletter campaigns.

### `GET /api/marketing/newsletters`

List all newsletters with optional filters.

**Auth:** Required (admin, manager)

**Query Parameters:**
- `status` (optional): Filter by status (`draft`, `scheduled`, `sent`, `failed`)
- `segment` (optional): Filter by audience segment
- `from` (optional): Filter by scheduled_date >= ISO date
- `to` (optional): Filter by scheduled_date <= ISO date

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "subject": "Summer Events @ Cheers Mallorca",
    "content": "Plain text content...",
    "html_content": "<html>...</html>",
    "segment": "all",
    "scheduled_date": "2024-07-20T09:00:00Z",
    "sent_at": "2024-07-20T09:05:12Z",
    "status": "sent",
    "recipient_count": 1243,
    "created_by": "uuid",
    "created_at": "2024-07-18T14:30:00Z",
    "updated_at": "2024-07-20T09:05:12Z",
    "created_by_employee": {
      "id": "uuid",
      "profile": {
        "id": "uuid",
        "full_name": "Leroy Manager"
      }
    }
  }
]
```

### `POST /api/marketing/newsletters`

Create a new newsletter.

**Auth:** Required (admin, manager)

**Request Body:**
```json
{
  "subject": "Summer Events @ Cheers Mallorca",
  "content": "Dear subscribers, join us this summer...",
  "html_content": "<html><body><h1>Summer Events</h1>...</body></html>",
  "segment": "all",
  "scheduled_date": "2024-07-20T09:00:00Z",
  "status": "scheduled"
}
```

**Segments:**
- `all`: All active subscribers
- `vip`: VIP customers only
- `language_nl`: Dutch speakers
- `language_en`: English speakers
- `language_es`: Spanish speakers

**Response:** `201 Created`

### `GET /api/marketing/newsletters/[id]`

Get a single newsletter.

**Auth:** Required (admin, manager)

**Response:** `200 OK`

### `PATCH /api/marketing/newsletters/[id]`

Update a newsletter.

**Auth:** Required (admin, manager)

**Request Body:** (partial update)
```json
{
  "status": "sent",
  "sent_at": "2024-07-20T09:05:12Z",
  "recipient_count": 1243
}
```

**Response:** `200 OK`

### `DELETE /api/marketing/newsletters/[id]`

Delete a newsletter. Only drafts can be deleted; sent newsletters are kept for records.

**Auth:** Required (admin, manager)

**Response:** `200 OK` or `400 Bad Request`
```json
{
  "error": "Cannot delete sent newsletters. They must be kept for records."
}
```

---

## Newsletter Subscribers API

Manage newsletter subscriber database.

### `GET /api/marketing/subscribers`

List all newsletter subscribers.

**Auth:** Required (admin, manager)

**Query Parameters:**
- `language` (optional): Filter by language (`nl`, `en`, `es`)
- `is_active` (optional): Filter by subscription status (`true`, `false`)

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe",
    "language": "en",
    "subscribed_at": "2024-05-10T12:34:56Z",
    "unsubscribed_at": null,
    "is_active": true,
    "created_at": "2024-05-10T12:34:56Z"
  }
]
```

### `POST /api/marketing/subscribers`

Subscribe to newsletter (public endpoint, no authentication required).

**Auth:** None (public)

**Request Body:**
```json
{
  "email": "john@example.com",
  "name": "John Doe",
  "language": "en"
}
```

**Response:** `201 Created`
```json
{
  "message": "Successfully subscribed",
  "subscriber": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe",
    "language": "en",
    "is_active": true,
    "subscribed_at": "2024-07-20T14:30:00Z"
  }
}
```

**Resubscribe:** If email was previously unsubscribed, it will be reactivated.

**Response:** `200 OK`
```json
{
  "message": "Successfully resubscribed",
  "subscriber": { ... }
}
```

**Error:** `400 Bad Request`
```json
{
  "error": "Email is already subscribed"
}
```

### `PATCH /api/marketing/subscribers/[id]`

Update subscriber preferences.

**Auth:** Required (admin, manager)

**Request Body:**
```json
{
  "name": "John Doe Updated",
  "language": "es",
  "is_active": false
}
```

**Response:** `200 OK`

### `DELETE /api/marketing/subscribers/[id]`

Permanently delete a subscriber (GDPR compliance).

**Auth:** Required (admin, manager)

**Response:** `200 OK`

---

## Public Unsubscribe API

Public endpoints for newsletter unsubscription.

### `POST /api/marketing/subscribers/unsubscribe`

Unsubscribe via JSON API (for forms).

**Auth:** None (public)

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Successfully unsubscribed from newsletter"
}
```

### `GET /api/marketing/subscribers/unsubscribe?email={email}`

One-click unsubscribe via email link. Returns HTML page.

**Auth:** None (public)

**Query Parameters:**
- `email` (required): Email address to unsubscribe

**Response:** `200 OK` (HTML)
```html
<!DOCTYPE html>
<html>
  <head>
    <title>Unsubscribed - GrandCafe Cheers</title>
  </head>
  <body>
    <h1>✓ Successfully Unsubscribed</h1>
    <p>You have been unsubscribed from the GrandCafe Cheers newsletter.</p>
  </body>
</html>
```

**Usage in email:**
```html
<a href="https://app.cheersmallorca.com/api/marketing/subscribers/unsubscribe?email=john@example.com">
  Unsubscribe
</a>
```

---

## Error Responses

All endpoints follow consistent error response format:

**401 Unauthorized** (missing/invalid authentication)
```json
{
  "error": "Unauthorized"
}
```

**403 Forbidden** (insufficient permissions)
```json
{
  "error": "Forbidden"
}
```

**400 Bad Request** (validation error)
```json
{
  "error": "Validation failed",
  "details": [
    {
      "path": ["email"],
      "message": "Invalid email"
    }
  ]
}
```

**404 Not Found**
```json
{
  "error": "Resource not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error",
  "details": "Detailed error message"
}
```

---

## Notes for Frontend Team

### Authentication
- All routes (except public subscriber endpoints) require `admin` or `manager` role
- Use the `requireRole()` utility from `@/lib/utils/auth`
- Include auth cookie in requests (handled automatically by Supabase client)

### AI Content Generation
- Claude API uses Haiku model for cost optimization
- Responses include token usage for monitoring
- Set `ANTHROPIC_API_KEY` environment variable
- Response format varies by content type (post, reel_script, newsletter)

### Subscriber Management
- Public signup form can be embedded anywhere
- Unsubscribe link should be included in all newsletter emails
- Email validation handled server-side
- Resubscription automatically reactivates deactivated accounts

### Meta API Integration
- Social posts record platform_post_id from Meta Graph API
- Use PATCH to sync engagement metrics periodically
- Platform options: `instagram` or `facebook`

### Realtime Updates
- Consider enabling Supabase Realtime for `social_posts` to show live engagement
- See migration `010_marketing_enhancements.sql` for realtime setup

### Date/Time Handling
- All timestamps are in UTC (ISO 8601 format)
- Display conversion to Europe/Madrid timezone on frontend
- Use `scheduled_date` for planning, `published_at` for actual publish time

---

## Implementation Checklist

- [x] Content Calendar CRUD routes
- [x] Social Posts CRUD routes with engagement tracking
- [x] AI content generation (Claude API integration)
- [x] Newsletter CRUD routes
- [x] Newsletter subscriber management
- [x] Public subscriber signup endpoint
- [x] Public unsubscribe endpoint (JSON + HTML)
- [x] Zod validation on all inputs
- [x] Role-based access control
- [x] Error handling with proper HTTP status codes
- [x] Query parameter filtering
- [ ] Meta Graph API integration (separate task)
- [ ] Resend API integration for email sending (separate task)
- [ ] Scheduled job for sending newsletters (separate task)
- [ ] Scheduled job for syncing social engagement metrics (separate task)

---

## Related Documentation

- **Database Schema:** `/supabase/migrations/001_initial_schema.sql` (tables 489-547)
- **RLS Policies:** `/supabase/migrations/010_marketing_enhancements.sql`
- **App Spec:** `/app_spec.md` (Module M7: Marketing & Social Media)
- **Auth Utils:** `/src/lib/utils/auth.ts`
- **Supabase Client:** `/src/lib/supabase/server.ts`
