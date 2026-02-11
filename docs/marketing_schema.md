# Marketing & Social Media — Database Schema Documentation

## Overview

The Marketing & Social Media module (M7) manages content creation, scheduling, publishing, and analytics across social platforms (Instagram, Facebook) and email newsletters. All content supports multi-language (NL/EN/ES).

## Tables

### 1. `content_calendar`

Central calendar for planning all marketing content across platforms.

**Columns:**
- `id` (UUID, PK) — Unique identifier
- `title` (VARCHAR 255, NOT NULL) — Post title/internal name
- `description` (TEXT) — Internal notes about the content
- `content_text` (TEXT) — The actual post caption/text
- `image_url` (TEXT) — URL to uploaded image (Supabase Storage)
- `platform` (VARCHAR 100) — Target platform: `instagram`, `facebook`, `multi`
- `scheduled_date` (TIMESTAMPTZ) — When to publish (NULL = draft)
- `published_at` (TIMESTAMPTZ) — Actual publication timestamp
- `status` (VARCHAR 50, DEFAULT 'draft') — `draft`, `scheduled`, `published`, `failed`
- `language` (VARCHAR 5) — `nl`, `en`, `es`
- `created_by` (UUID, FK → employees) — Staff member who created it
- `created_at` (TIMESTAMPTZ) — When created
- `updated_at` (TIMESTAMPTZ) — Auto-updated via trigger

**Indexes:**
- `idx_content_calendar_scheduled_date` — For date range queries
- `idx_content_calendar_status` — Filter by draft/published
- `idx_content_calendar_platform` — Filter by platform
- `idx_content_calendar_created_by` — Filter by author

**RLS Policies:**
- SELECT: admin, manager
- INSERT: admin, manager
- UPDATE: admin, manager
- DELETE: admin, manager

**Use Cases:**
- Display monthly calendar grid with planned posts
- Filter by platform and language
- AI-powered caption generation (Claude API fills `content_text`)
- Schedule queue for automated posting

---

### 2. `social_posts`

Published posts with engagement metrics synced from Meta Graph API.

**Columns:**
- `id` (UUID, PK) — Unique identifier
- `content_calendar_id` (UUID, FK → content_calendar) — Link to planned post (optional)
- `platform` (VARCHAR 100, NOT NULL) — `instagram`, `facebook`
- `platform_post_id` (VARCHAR 255) — Meta API post ID (e.g., `17841234567890`)
- `caption` (TEXT) — Final published caption
- `hashtags` (TEXT) — Hashtag string (e.g., `#cheers #mallorca #beachbar`)
- `image_url` (TEXT) — Published image URL
- `published_at` (TIMESTAMPTZ) — When posted
- `status` (VARCHAR 50, DEFAULT 'pending') — `pending`, `published`, `failed`
- `likes` (INTEGER, DEFAULT 0) — Like count (synced from Meta Insights)
- `comments` (INTEGER, DEFAULT 0) — Comment count
- `shares` (INTEGER, DEFAULT 0) — Share count
- `reach` (INTEGER, DEFAULT 0) — Unique accounts reached
- `created_at` (TIMESTAMPTZ) — Record creation
- `updated_at` (TIMESTAMPTZ) — Auto-updated when metrics sync

**Indexes:**
- `idx_social_posts_platform` — Filter by platform
- `idx_social_posts_published_at` — Sort by date
- `idx_social_posts_status` — Filter by status
- `idx_social_posts_content_calendar_id` — Link to calendar

**RLS Policies:**
- SELECT: admin, manager
- INSERT: admin, manager
- UPDATE: admin, manager (for syncing metrics)
- DELETE: admin, manager

**Use Cases:**
- Display engagement dashboard (total likes/comments/reach)
- Sync analytics from Meta Graph API every 24h
- Identify best-performing posts by platform
- Track hashtag effectiveness

**Meta API Integration:**
- **Publish:** `POST /{ig-user-id}/media` → get `platform_post_id`
- **Get Insights:** `GET /{post-id}/insights?metric=reach,impressions,engagement`

---

### 3. `newsletters`

Email campaigns sent via Resend API.

**Columns:**
- `id` (UUID, PK) — Unique identifier
- `subject` (VARCHAR 255, NOT NULL) — Email subject line
- `content` (TEXT, NOT NULL) — Plain text content
- `html_content` (TEXT) — HTML email body (rendered from template)
- `segment` (VARCHAR 100) — Audience filter: `all`, `vip`, `language_nl`, `language_en`, `language_es`
- `scheduled_date` (TIMESTAMPTZ) — When to send (NULL = draft)
- `sent_at` (TIMESTAMPTZ) — Actual send time
- `status` (VARCHAR 50, DEFAULT 'draft') — `draft`, `scheduled`, `sent`, `failed`
- `recipient_count` (INTEGER, DEFAULT 0) — How many subscribers received it
- `created_by` (UUID, FK → employees) — Author
- `created_at` (TIMESTAMPTZ) — Created timestamp
- `updated_at` (TIMESTAMPTZ) — Auto-updated

**Indexes:**
- `idx_newsletters_status` — Filter by draft/sent
- `idx_newsletters_scheduled_date` — For sending queue
- `idx_newsletters_segment` — Filter by audience
- `idx_newsletters_created_by` — Filter by author

**RLS Policies:**
- SELECT: admin, manager
- INSERT: admin, manager
- UPDATE: admin, manager
- DELETE: admin, manager

**Use Cases:**
- Build email in visual editor (Markdown → HTML)
- Schedule weekly newsletters
- Segment by language (NL tourists, EN expats, ES locals)
- AI-generated content suggestions (Claude API)
- Track send status and recipient count

**Resend API Integration:**
```typescript
await resend.emails.send({
  from: 'GrandCafe Cheers <hello@cheersmallorca.com>',
  to: subscriberEmails, // batch send
  subject: newsletter.subject,
  html: newsletter.html_content,
  tags: [{ name: 'campaign_id', value: newsletter.id }]
})
```

---

### 4. `newsletter_subscribers`

Subscriber database with consent and preferences.

**Columns:**
- `id` (UUID, PK) — Unique identifier
- `email` (VARCHAR 255, NOT NULL, UNIQUE) — Subscriber email (GDPR compliant)
- `name` (VARCHAR 255) — Subscriber name (optional)
- `language` (VARCHAR 5, DEFAULT 'en') — Preferred language: `nl`, `en`, `es`
- `subscribed_at` (TIMESTAMPTZ, DEFAULT now()) — When they signed up
- `unsubscribed_at` (TIMESTAMPTZ) — NULL if active, timestamp if unsubscribed
- `is_active` (BOOLEAN, DEFAULT true) — `true` = subscribed, `false` = unsubscribed
- `created_at` (TIMESTAMPTZ) — Record creation

**Indexes:**
- `idx_newsletter_subscribers_language` — Filter by language preference
- `idx_newsletter_subscribers_is_active` — Get only active subscribers

**RLS Policies:**
- SELECT: admin, manager
- INSERT: public (anyone can subscribe via form)
- UPDATE: none (handled via server-side API with signed tokens)
- DELETE: admin, manager (for GDPR "right to be forgotten")

**Use Cases:**
- Public signup form embedded on website/Instagram bio link
- Language-specific segmentation for newsletters
- Unsubscribe link in emails (server-side token verification)
- GDPR compliance: export subscriber data, delete on request
- Dashboard: total subscribers, growth rate, language breakdown

**API Endpoints Needed:**
- `POST /api/newsletter/subscribe` — Add subscriber (public, rate-limited)
- `POST /api/newsletter/unsubscribe` — Mark as unsubscribed (requires token)
- `GET /api/newsletter/subscribers` — List all (auth required)
- `DELETE /api/newsletter/subscribers/:id` — GDPR deletion (auth required)

---

## Relationships

```
content_calendar (1) ──→ (0..1) social_posts
  └─ One calendar entry CAN become one published post

employees (1) ──→ (0..*) content_calendar
  └─ Staff members create content

employees (1) ──→ (0..*) newsletters
  └─ Staff members author newsletters
```

---

## Workflow Examples

### 1. **Creating a Social Post with AI**

```sql
-- Step 1: Create draft in content calendar
INSERT INTO content_calendar (title, platform, language, status, created_by)
VALUES ('Summer Weekend Vibes', 'instagram', 'en', 'draft', <employee_id>);

-- Step 2: AI generates caption (via API route calling Claude)
UPDATE content_calendar
SET content_text = 'Join us this Saturday for sunset cocktails! 🌅🍹',
    image_url = 'https://supabase.co/storage/.../beach.jpg'
WHERE id = <calendar_id>;

-- Step 3: Schedule for publishing
UPDATE content_calendar
SET scheduled_date = '2025-06-15 18:00:00+00',
    status = 'scheduled'
WHERE id = <calendar_id>;

-- Step 4: Cron job publishes via Meta API
-- (creates record in social_posts table with platform_post_id)

-- Step 5: Sync engagement metrics daily
UPDATE social_posts
SET likes = 342, comments = 28, reach = 5600
WHERE platform_post_id = '17841234567890';
```

### 2. **Sending a Newsletter**

```sql
-- Step 1: Get active NL subscribers
SELECT email, name
FROM newsletter_subscribers
WHERE is_active = true AND language = 'nl';

-- Step 2: Create newsletter draft
INSERT INTO newsletters (subject, content, segment, status, created_by)
VALUES (
  'Deze week bij Cheers! 🍻',
  'Hallo! Deze week hebben we...',
  'language_nl',
  'draft',
  <employee_id>
);

-- Step 3: Schedule send
UPDATE newsletters
SET scheduled_date = '2025-06-10 09:00:00+00',
    status = 'scheduled'
WHERE id = <newsletter_id>;

-- Step 4: Cron job sends via Resend API
UPDATE newsletters
SET sent_at = NOW(),
    status = 'sent',
    recipient_count = 234
WHERE id = <newsletter_id>;
```

---

## Required API Routes

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/marketing/calendar` | GET | List content calendar | admin/manager |
| `/api/marketing/calendar` | POST | Create new entry | admin/manager |
| `/api/marketing/calendar/:id` | PATCH | Update entry | admin/manager |
| `/api/marketing/calendar/:id` | DELETE | Delete entry | admin/manager |
| `/api/marketing/ai/generate-caption` | POST | AI caption generation | admin/manager |
| `/api/marketing/ai/generate-hashtags` | POST | AI hashtag suggestions | admin/manager |
| `/api/marketing/posts` | GET | List published posts | admin/manager |
| `/api/marketing/posts/sync` | POST | Sync Meta API metrics | admin/manager |
| `/api/marketing/publish` | POST | Publish to Meta API | admin/manager |
| `/api/newsletter` | GET | List newsletters | admin/manager |
| `/api/newsletter` | POST | Create newsletter | admin/manager |
| `/api/newsletter/:id/send` | POST | Send newsletter | admin/manager |
| `/api/newsletter/subscribe` | POST | Add subscriber | public |
| `/api/newsletter/unsubscribe` | POST | Unsubscribe (token) | public |
| `/api/newsletter/subscribers` | GET | List subscribers | admin/manager |

---

## Environment Variables Needed

```env
# Meta Graph API
META_ACCESS_TOKEN=EAAxxxxx
META_PAGE_ID=123456789  # Facebook Page ID
META_IG_USER_ID=987654321  # Instagram Business Account ID

# Resend API
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=hello@cheersmallorca.com

# Claude AI
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

---

## Testing Checklist

- [ ] Create content calendar entry with all languages
- [ ] Generate AI caption via Claude API
- [ ] Schedule post for future date
- [ ] Publish post to Instagram (test account)
- [ ] Sync engagement metrics from Meta API
- [ ] Create newsletter draft with HTML template
- [ ] Send test newsletter via Resend
- [ ] Subscribe to newsletter via public form
- [ ] Unsubscribe via email link
- [ ] Filter subscribers by language
- [ ] GDPR: delete subscriber completely

---

## Notes for Frontend Agent

1. **Multi-language Support:**
   - All forms must have language selector (NL/EN/ES)
   - Store content in correct language column
   - Display content based on user's preferred language

2. **Image Upload:**
   - Use Supabase Storage bucket: `marketing-images`
   - Public bucket (images visible to all)
   - Store URL in `image_url` field
   - Max size: 10MB, formats: jpg, png, webp

3. **AI Features:**
   - Caption generation: send image + context → Claude API → suggested caption
   - Hashtag suggestions: send caption → Claude API → relevant hashtags
   - Reel script: send theme → Claude API → storyboard + voiceover script

4. **Calendar UI:**
   - Month/week/day views
   - Drag-and-drop to reschedule
   - Color-coded by platform (blue=Instagram, green=Facebook)
   - Tooltips show preview of caption

5. **Analytics Dashboard:**
   - Total reach this month
   - Average engagement rate per platform
   - Best performing posts (by reach)
   - Growth chart (followers over time - stored in separate `social_analytics` table if needed)

6. **Realtime (Optional):**
   - Enable if you want live updates when metrics sync
   - Add `ALTER PUBLICATION supabase_realtime ADD TABLE social_posts;`
   - Use `supabase.channel().on('postgres_changes', ...)` in frontend
