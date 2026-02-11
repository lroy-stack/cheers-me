# Events & DJ Management — API Specification

**Module:** M8: Events & DJ Management
**Status:** Schema ✅ Complete | API Routes ⏳ Pending | UI ⏳ Pending

---

## Database Schema Reference

### Tables Available

#### 1. `djs`
```typescript
interface DJ {
  id: string;                    // UUID
  name: string;
  genre: string | null;          // "House", "Techno", "Latin", etc.
  fee: number | null;            // DECIMAL(10,2)
  email: string | null;
  phone: string | null;
  social_links: string | null;   // JSON string: {"instagram": "@dj", "spotify": "..."}
  rider_notes: string | null;    // Equipment requirements
  created_at: string;            // ISO 8601 timestamp
  updated_at: string;
}
```

#### 2. `events`
```typescript
interface Event {
  id: string;                    // UUID
  title: string;
  description: string | null;
  event_date: string;            // YYYY-MM-DD
  start_time: string;            // HH:MM:SS
  end_time: string | null;
  event_type: string | null;     // 'dj_night', 'sports', 'themed', 'private'
  dj_id: string | null;          // FK to djs
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';

  // Sports-specific fields (Migration 012)
  sport_name: string | null;     // "Football", "Rugby", "F1"
  home_team: string | null;
  away_team: string | null;
  broadcast_channel: string | null;  // "beIN Sports", "DAZN"
  match_info: string | null;     // "Champions League Quarter Final"

  created_at: string;
  updated_at: string;
}
```

#### 3. `event_equipment_checklists`
```typescript
interface EventEquipmentChecklist {
  id: string;
  event_id: string;              // FK to events
  equipment_name: string;        // "DJ Mixer", "Speakers", "TV Screen 1"
  is_checked: boolean;
  created_at: string;
}
```

#### 4. `music_requests`
```typescript
interface MusicRequest {
  id: string;
  event_id: string;              // FK to events
  guest_name: string | null;     // Optional
  song_title: string;
  artist: string;
  status: string;                // 'pending', 'played', 'skipped'
  created_at: string;
}
```

#### 5. `event_marketing_drafts` (NEW - Migration 012)
```typescript
interface EventMarketingDraft {
  id: string;
  event_id: string;              // FK to events
  social_caption: string | null;
  social_hashtags: string | null;
  suggested_platforms: string[] | null;  // ['instagram', 'facebook']
  newsletter_mention: string | null;
  generated_at: string;
  approved: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
}
```

---

## API Routes to Build

### 1. Events CRUD

#### `GET /api/events`
**Purpose:** List all events with filters
**Auth:** Required (staff role)
**Query Params:**
- `event_type?: string` — Filter by type ('dj_night', 'sports', etc.)
- `status?: string` — Filter by status
- `start_date?: string` — Filter events >= date
- `end_date?: string` — Filter events <= date
- `include_dj?: boolean` — Include DJ info in response (default: false)

**Response:**
```typescript
{
  data: Event[],
  count: number
}
```

**Example:**
```bash
GET /api/events?event_type=dj_night&status=confirmed&include_dj=true
```

#### `POST /api/events`
**Purpose:** Create new event
**Auth:** Required (manager, admin)
**Body:**
```typescript
{
  title: string;
  description?: string;
  event_date: string;           // YYYY-MM-DD
  start_time: string;           // HH:MM
  end_time?: string;
  event_type: string;           // 'dj_night' | 'sports' | 'themed' | 'private'
  dj_id?: string;

  // If event_type === 'sports'
  sport_name?: string;
  home_team?: string;
  away_team?: string;
  broadcast_channel?: string;
  match_info?: string;
}
```

**Response:**
```typescript
{
  data: Event,
  marketing_draft_id?: string   // If auto-marketing triggered
}
```

#### `PATCH /api/events/[id]`
**Purpose:** Update event details
**Auth:** Required (manager, admin)
**Body:** Partial<Event>

**Response:**
```typescript
{ data: Event }
```

#### `DELETE /api/events/[id]`
**Purpose:** Delete event (cascade deletes equipment checklist, music requests)
**Auth:** Required (admin only)

**Response:**
```typescript
{ success: true }
```

---

### 2. Event Status Workflow

#### `PATCH /api/events/[id]/status`
**Purpose:** Update event status (workflow: pending → confirmed → completed)
**Auth:** Required (manager, admin, or dj for own events)
**Body:**
```typescript
{
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled',
  reason?: string  // If cancelling
}
```

**Response:**
```typescript
{ data: Event }
```

**Business Logic:**
- If status changes to 'confirmed' → send notification to DJ (if dj_id present)
- If status changes to 'completed' → calculate event performance metrics
- Cannot go backwards (completed → pending)

---

### 3. DJ Database

#### `GET /api/djs`
**Purpose:** List all DJs
**Auth:** Required (staff)
**Query Params:**
- `genre?: string` — Filter by genre
- `available_on?: string` — Filter DJs available on specific date (not booked)

**Response:**
```typescript
{
  data: DJ[],
  count: number
}
```

#### `POST /api/djs`
**Purpose:** Add new DJ to database
**Auth:** Required (manager, admin)
**Body:**
```typescript
{
  name: string;
  genre?: string;
  fee?: number;
  email?: string;
  phone?: string;
  social_links?: string;  // JSON string
  rider_notes?: string;
}
```

**Response:**
```typescript
{ data: DJ }
```

#### `GET /api/djs/[id]`
**Purpose:** Get DJ details with upcoming/past events
**Auth:** Required (staff)

**Response:**
```typescript
{
  data: DJ & {
    upcoming_events: Event[],
    past_events_count: number,
    total_earnings: number  // sum of fees from completed events
  }
}
```

#### `PATCH /api/djs/[id]`
**Purpose:** Update DJ info
**Auth:** Required (manager, admin)
**Body:** Partial<DJ>

**Response:**
```typescript
{ data: DJ }
```

#### `DELETE /api/djs/[id]`
**Purpose:** Delete DJ (sets events.dj_id to NULL)
**Auth:** Required (admin)

**Response:**
```typescript
{ success: true }
```

---

### 4. Equipment Checklist

#### `GET /api/events/[id]/checklist`
**Purpose:** Get equipment checklist for event
**Auth:** Required (staff)

**Response:**
```typescript
{
  data: EventEquipmentChecklist[]
}
```

#### `POST /api/events/[id]/checklist`
**Purpose:** Add equipment item to checklist
**Auth:** Required (manager, admin)
**Body:**
```typescript
{
  equipment_name: string;
}
```

**Response:**
```typescript
{ data: EventEquipmentChecklist }
```

#### `PATCH /api/events/[id]/checklist/[checklist_id]`
**Purpose:** Toggle checklist item checked status
**Auth:** Required (staff)
**Body:**
```typescript
{
  is_checked: boolean;
}
```

**Response:**
```typescript
{ data: EventEquipmentChecklist }
```

**Business Logic:**
- When all items checked → send notification "Event setup complete"

---

### 5. Music Request Queue

#### `GET /api/music-requests`
**Purpose:** Get music requests for an event (DJ interface)
**Auth:** Required (staff)
**Query Params:**
- `event_id: string` (required)
- `status?: string` — Filter by status

**Response:**
```typescript
{
  data: MusicRequest[],
  count: number
}
```

**Realtime:** Subscribe to changes on this endpoint

#### `POST /api/music-requests` (PUBLIC)
**Purpose:** Customer submits song request (no auth required)
**Auth:** None (rate-limited by IP)
**Body:**
```typescript
{
  event_id: string;
  guest_name?: string;
  song_title: string;
  artist: string;
}
```

**Response:**
```typescript
{
  data: MusicRequest,
  message: "Request sent to DJ!"
}
```

**Rate Limiting:**
- Max 5 requests per IP per event
- Return 429 if exceeded

#### `PATCH /api/music-requests/[id]`
**Purpose:** DJ updates request status (played/skipped)
**Auth:** Required (dj, manager, admin)
**Body:**
```typescript
{
  status: 'played' | 'skipped';
}
```

**Response:**
```typescript
{ data: MusicRequest }
```

---

### 6. Auto-Marketing

#### `POST /api/events/[id]/generate-marketing`
**Purpose:** Trigger Claude AI to generate social post + newsletter mention
**Auth:** Required (manager, admin)

**Response:**
```typescript
{
  data: EventMarketingDraft
}
```

**Business Logic:**
1. Fetch event details (including DJ if present)
2. Call Claude API with prompt:
   - Generate Instagram caption (max 150 words)
   - Generate hashtags (relevant to event type)
   - Suggest platforms (instagram, facebook)
   - Generate newsletter mention (1 paragraph)
3. Save to `event_marketing_drafts` table
4. Return draft for preview

**Claude Prompt Template:**
```
You are a social media manager for GrandCafe Cheers, a beachfront restaurant/bar in Mallorca.

Generate marketing content for this event:
- Title: {event.title}
- Type: {event.event_type}
- Date: {event.event_date}
- DJ: {dj.name} ({dj.genre}) [if applicable]
- Teams: {home_team} vs {away_team} [if sports event]

Create:
1. Instagram caption (engaging, max 150 words, include call-to-action)
2. Hashtags (10-15 relevant tags)
3. Newsletter mention (1 paragraph, email-friendly tone)

Languages: English, Spanish, Dutch (detect from user preference).
Brand voice: Energetic, welcoming, beach vibes.
```

#### `GET /api/events/[id]/marketing`
**Purpose:** Get marketing drafts for event
**Auth:** Required (manager, admin)

**Response:**
```typescript
{
  data: EventMarketingDraft[]
}
```

#### `PATCH /api/events/[id]/marketing/[draft_id]`
**Purpose:** Edit marketing draft
**Auth:** Required (manager, admin)
**Body:** Partial<EventMarketingDraft>

**Response:**
```typescript
{ data: EventMarketingDraft }
```

#### `POST /api/events/[id]/marketing/[draft_id]/approve`
**Purpose:** Approve draft and schedule for publishing
**Auth:** Required (manager, admin)

**Response:**
```typescript
{
  data: EventMarketingDraft,
  message: "Draft approved. Ready for publishing."
}
```

**Business Logic:**
- Set `approved = true`
- Create draft in `social_posts` table (from M7: Marketing module)
- Add mention to next newsletter draft

---

## Realtime Subscriptions

### Events Table
```typescript
// Subscribe to event status changes
supabase
  .channel('events-changes')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'events' },
    (payload) => {
      // Update UI when event status changes
      console.log('Event updated:', payload.new);
    }
  )
  .subscribe();
```

### Music Requests (DJ Interface)
```typescript
// Subscribe to new music requests for specific event
supabase
  .channel(`music-requests-${eventId}`)
  .on('postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'music_requests',
      filter: `event_id=eq.${eventId}`
    },
    (payload) => {
      // Add new request to queue in real-time
      console.log('New song request:', payload.new);
      // Play notification sound
    }
  )
  .subscribe();
```

### Equipment Checklist
```typescript
// Subscribe to checklist updates
supabase
  .channel(`checklist-${eventId}`)
  .on('postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'event_equipment_checklists',
      filter: `event_id=eq.${eventId}`
    },
    (payload) => {
      // Update checklist UI
      console.log('Checklist item checked:', payload.new);
    }
  )
  .subscribe();
```

---

## RLS Policies Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `events` | Staff (all roles) | Manager, Admin | Manager, Admin | Admin only |
| `djs` | Staff | Manager, Admin | Manager, Admin | Admin only |
| `event_equipment_checklists` | Staff | Manager, Admin | Staff (all) | Manager, Admin |
| `music_requests` | Staff | **PUBLIC** (rate-limited) | DJ, Manager, Admin | Manager, Admin |
| `event_marketing_drafts` | Manager, Admin, Owner | Manager, Admin | Manager, Admin | Manager, Admin |

**Note:** `music_requests` has NO RLS for INSERT — this is intentional for public submission. Rate limiting is handled at API route level.

---

## Error Handling

All API routes should return consistent error format:

```typescript
// Success
{ data: T }

// Error
{
  error: string,           // User-facing message
  code?: string,           // Error code (e.g., 'RATE_LIMIT_EXCEEDED')
  details?: any            // Additional context (not shown to user)
}
```

**Common HTTP Status Codes:**
- `200` — Success
- `201` — Created
- `400` — Bad request (validation error)
- `401` — Unauthorized (no auth token)
- `403` — Forbidden (insufficient permissions)
- `404` — Not found
- `429` — Too many requests (rate limited)
- `500` — Internal server error

---

## Testing Checklist

Before marking API routes complete:

- [ ] Create DJ event → status = 'pending'
- [ ] Change status to 'confirmed' → updates successfully
- [ ] Create sports event with teams → all fields saved
- [ ] Filter events by type and date range
- [ ] Add equipment checklist item
- [ ] Toggle checklist item → realtime update works
- [ ] Submit music request (no auth) → saved to DB
- [ ] Rate limiting: 6th request from same IP → 429 error
- [ ] Generate marketing draft → Claude API returns content
- [ ] Approve draft → creates entry in `social_posts`
- [ ] Delete event → cascades to checklist and music requests
- [ ] RLS: waiter can view events but cannot create
- [ ] RLS: manager can create/edit events
- [ ] Realtime subscription: two browsers, change in one reflects in other

---

## Next Steps

1. **Backend Agent:** Create API routes following this spec
2. **Frontend Agent:** Build UI components (calendar, DJ database, music queue)
3. **AI Integration:** Test Claude API for marketing generation
4. **Testing:** Write E2E tests for critical flows

---

## Questions for Frontend Agent

When building UI, consider:
- How should the event calendar display different event types? (color-coded?)
- Should music request queue auto-scroll when new requests arrive?
- Should equipment checklist show completion percentage?
- How to handle timezone display? (All timestamps are UTC in DB, display in Europe/Madrid)
- Should there be a public QR code generator for music requests?

---

**End of API Specification**
