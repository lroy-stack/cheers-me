# Events & DJ Management API Routes

## Overview
This document describes all API route handlers for the Events & DJ Management module (M8).

## Authentication & Authorization

All routes (except public endpoints) require authentication via Supabase Auth. Authorization is role-based:
- **Admin/Manager**: Full access to all endpoints
- **DJ**: Can view events, confirm/cancel their own events, update music request status
- **Bar/Waiter**: Can view events and equipment checklists
- **Public**: Can view tonight's events and submit music requests

## DJ Management

### `GET /api/events/djs`
List all DJs with optional filtering.

**Auth**: admin, manager, dj

**Query Parameters**:
- `search` (string, optional): Search DJs by name
- `genre` (string, optional): Filter by genre

**Response**: Array of DJ objects
```json
[
  {
    "id": "uuid",
    "name": "DJ Name",
    "genre": "House",
    "fee": 150.00,
    "email": "dj@example.com",
    "phone": "+34123456789",
    "social_links": "@djname",
    "rider_notes": "Equipment requirements...",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

### `POST /api/events/djs`
Create a new DJ record.

**Auth**: admin, manager

**Request Body**:
```json
{
  "name": "DJ Name",
  "genre": "House",
  "fee": 150.00,
  "email": "dj@example.com",
  "phone": "+34123456789",
  "social_links": "@djname",
  "rider_notes": "Equipment requirements..."
}
```

**Response**: Created DJ object (201)

### `GET /api/events/djs/[id]`
Get a single DJ by ID.

**Auth**: admin, manager, dj

**Response**: DJ object

### `PATCH /api/events/djs/[id]`
Update a DJ record.

**Auth**: admin, manager

**Request Body**: Partial DJ object (any fields to update)

**Response**: Updated DJ object

### `DELETE /api/events/djs/[id]`
Delete a DJ record. Fails if DJ is assigned to any events.

**Auth**: admin, manager

**Response**: Success message

---

## Event Management

### `GET /api/events`
List all events with optional filtering.

**Auth**: admin, manager, dj, bar, waiter

**Query Parameters**:
- `event_type` (string, optional): Filter by type (dj_night, sports, themed_night, private_event, other)
- `status` (string, optional): Filter by status (pending, confirmed, completed, cancelled)
- `start_date` (YYYY-MM-DD, optional): Filter events from this date
- `end_date` (YYYY-MM-DD, optional): Filter events until this date
- `dj_id` (uuid, optional): Filter events by DJ

**Response**: Array of event objects with DJ details
```json
[
  {
    "id": "uuid",
    "title": "Friday Night House Music",
    "description": "DJ spinning house classics",
    "event_date": "2024-06-15",
    "start_time": "22:00:00",
    "end_time": "03:00:00",
    "event_type": "dj_night",
    "dj_id": "uuid",
    "status": "confirmed",
    "sport_name": null,
    "home_team": null,
    "away_team": null,
    "broadcast_channel": null,
    "match_info": null,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "dj": {
      "id": "uuid",
      "name": "DJ Name",
      "genre": "House",
      "fee": 150.00
    }
  }
]
```

### `POST /api/events`
Create a new event.

**Auth**: admin, manager

**Request Body**:
```json
{
  "title": "Friday Night House Music",
  "description": "DJ spinning house classics",
  "event_date": "2024-06-15",
  "start_time": "22:00",
  "end_time": "03:00",
  "event_type": "dj_night",
  "dj_id": "uuid",
  "status": "pending",
  // Sports-specific fields (optional)
  "sport_name": "Football",
  "home_team": "Real Madrid",
  "away_team": "Barcelona",
  "broadcast_channel": "Sky Sports",
  "match_info": "La Liga Final"
}
```

**Response**: Created event object with DJ details (201)

### `GET /api/events/[id]`
Get a single event with full details including equipment and music requests.

**Auth**: admin, manager, dj, bar, waiter

**Response**: Event object with nested DJ, equipment, and music_requests

### `PATCH /api/events/[id]`
Update an event. DJs can only update their own events and only the status field.

**Auth**: admin, manager, dj

**Request Body**: Partial event object (any fields to update)

**Response**: Updated event object

### `DELETE /api/events/[id]`
Delete an event (cascade deletes equipment and music requests).

**Auth**: admin, manager

**Response**: Success message

---

## Event Confirmation

### `POST /api/events/[id]/confirm`
Confirm an event. Changes status from 'pending' to 'confirmed'.

**Auth**: admin, manager, dj (only their own events)

**Response**:
```json
{
  "message": "Event confirmed successfully",
  "event": { /* updated event object */ }
}
```

### `DELETE /api/events/[id]/confirm`
Cancel an event. Changes status to 'cancelled'.

**Auth**: admin, manager, dj (only their own events)

**Response**:
```json
{
  "message": "Event cancelled successfully",
  "event": { /* updated event object */ }
}
```

---

## Equipment Checklists

### `GET /api/events/[id]/equipment`
Get equipment checklist for an event.

**Auth**: admin, manager, dj, bar

**Response**: Array of equipment checklist items
```json
[
  {
    "id": "uuid",
    "event_id": "uuid",
    "equipment_name": "Microphone",
    "is_checked": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### `POST /api/events/[id]/equipment`
Add an equipment item to the checklist.

**Auth**: admin, manager

**Request Body**:
```json
{
  "equipment_name": "Microphone",
  "is_checked": false
}
```

**Response**: Created equipment item (201)

### `PATCH /api/events/[id]/equipment`
Bulk update equipment checklist (check/uncheck multiple items).

**Auth**: admin, manager, dj, bar

**Request Body**:
```json
{
  "items": [
    {
      "id": "uuid",
      "is_checked": true
    },
    {
      "id": "uuid",
      "is_checked": false
    }
  ]
}
```

**Response**: Updated equipment array

### `PATCH /api/events/[id]/equipment/[equipmentId]`
Update a single equipment item.

**Auth**: admin, manager, dj, bar

**Request Body**:
```json
{
  "equipment_name": "Updated name",
  "is_checked": true
}
```

**Response**: Updated equipment item

### `DELETE /api/events/[id]/equipment/[equipmentId]`
Delete an equipment item.

**Auth**: admin, manager

**Response**: Success message

---

## Music Requests

### `GET /api/events/music-requests`
Get music requests (optionally filtered by event).

**Auth**: Not required (can be public)

**Query Parameters**:
- `event_id` (uuid, optional): Filter by event
- `status` (string, optional): Filter by status (pending, played, declined)

**Response**: Array of music request objects
```json
[
  {
    "id": "uuid",
    "event_id": "uuid",
    "guest_name": "John Doe",
    "song_title": "Dancing Queen",
    "artist": "ABBA",
    "status": "pending",
    "created_at": "2024-01-01T00:00:00Z",
    "event": {
      "id": "uuid",
      "title": "Friday Night",
      "event_date": "2024-06-15",
      "start_time": "22:00:00"
    }
  }
]
```

### `POST /api/events/music-requests`
Create a music request (public endpoint).

**Auth**: Not required

**Request Body**:
```json
{
  "event_id": "uuid",
  "guest_name": "John Doe",
  "song_title": "Dancing Queen",
  "artist": "ABBA"
}
```

**Response**: Created music request (201)

### `GET /api/events/music-requests/[id]`
Get a single music request.

**Auth**: Not required

**Response**: Music request object with event details

### `PATCH /api/events/music-requests/[id]`
Update music request status (played/declined).

**Auth**: admin, manager, dj

**Request Body**:
```json
{
  "status": "played"
}
```

**Response**: Updated music request

### `DELETE /api/events/music-requests/[id]`
Delete a music request.

**Auth**: admin, manager

**Response**: Success message

---

## Marketing Drafts

### `GET /api/events/[id]/marketing-draft`
Get auto-generated marketing draft for an event.

**Auth**: admin, manager

**Response**: Marketing draft object or null
```json
{
  "id": "uuid",
  "event_id": "uuid",
  "social_caption": "Join us tonight for...",
  "social_hashtags": "#CheersMallorca #DJNight #ElArenal",
  "suggested_platforms": ["instagram", "facebook"],
  "newsletter_mention": "Don't miss our DJ night this Friday...",
  "generated_at": "2024-01-01T00:00:00Z",
  "approved": false,
  "published": false,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### `POST /api/events/[id]/marketing-draft`
Create a marketing draft for an event.

**Auth**: admin, manager

**Request Body**:
```json
{
  "social_caption": "Join us tonight for...",
  "social_hashtags": "#CheersMallorca #DJNight",
  "suggested_platforms": ["instagram", "facebook"],
  "newsletter_mention": "Don't miss our DJ night...",
  "approved": false
}
```

**Response**: Created marketing draft (201)

### `PATCH /api/events/[id]/marketing-draft`
Update marketing draft.

**Auth**: admin, manager

**Request Body**: Partial marketing draft object

**Response**: Updated marketing draft

### `DELETE /api/events/[id]/marketing-draft`
Delete marketing draft.

**Auth**: admin, manager

**Response**: Success message

---

## Dashboard & Analytics

### `GET /api/events/dashboard`
Get events dashboard statistics and upcoming events.

**Auth**: admin, manager, dj, bar, waiter

**Query Parameters**:
- `start_date` (YYYY-MM-DD, optional): Start date for statistics (default: today)
- `end_date` (YYYY-MM-DD, optional): End date for statistics

**Response**:
```json
{
  "summary": {
    "total_events": 45,
    "by_type": {
      "dj_night": 30,
      "sports": 10,
      "themed_night": 3,
      "private_event": 2
    },
    "by_status": {
      "confirmed": 40,
      "pending": 3,
      "completed": 2
    },
    "pending_confirmations": 3,
    "pending_music_requests": 12
  },
  "upcoming_events": [ /* next 7 days */ ],
  "today_events": [ /* today's events */ ],
  "pending_confirmations": [ /* events awaiting DJ confirmation */ ],
  "top_djs": [
    {
      "dj": { /* DJ object */ },
      "count": 15
    }
  ]
}
```

---

## Public Endpoints

### `GET /api/public/events/tonight`
Get tonight's events (public, no auth required). Used for customer-facing displays.

**Auth**: Not required

**Response**:
```json
{
  "date": "2024-06-15",
  "events": [
    {
      "id": "uuid",
      "title": "Friday Night House Music",
      "description": "DJ spinning house classics",
      "start_time": "22:00:00",
      "end_time": "03:00:00",
      "event_type": "dj_night",
      "sport_name": null,
      "home_team": null,
      "away_team": null,
      "broadcast_channel": null,
      "dj": {
        "name": "DJ Name",
        "genre": "House",
        "social_links": "@djname"
      }
    }
  ]
}
```

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "error": "Error message",
  "details": [ /* validation errors if applicable */ ]
}
```

**Common HTTP Status Codes**:
- `200 OK`: Successful GET/PATCH
- `201 Created`: Successful POST
- `400 Bad Request`: Validation failed or business logic error
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not authorized for this action
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## Realtime Updates

The following tables have realtime updates enabled via Supabase Realtime:
- `events`: Subscribe to get live updates when event status changes
- `music_requests`: Subscribe to get live updates to the music queue
- `event_equipment_checklists`: Subscribe to get live checklist updates

**Example subscription (client-side)**:
```typescript
const channel = supabase
  .channel('event-updates')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'events' },
    (payload) => {
      console.log('Event updated:', payload)
    }
  )
  .subscribe()
```

---

## Notes for Frontend Agent

1. **Event Creation Flow**:
   - Create event → Auto-generate marketing draft → DJ receives notification → DJ confirms → Marketing draft gets approved → Post to social media

2. **Music Request Queue**:
   - Public interface allows customers to submit requests without auth
   - DJ interface shows live queue with realtime updates
   - DJs can mark as played/declined

3. **Equipment Checklists**:
   - Pre-populate common items based on event type
   - Allow bar staff to check items before event starts

4. **Dashboard**:
   - Show pending confirmations prominently
   - Display upcoming events in calendar view
   - Alert when music requests pile up

5. **Sports Events**:
   - Use different UI for sports vs DJ nights
   - Show match info, teams, channel prominently

6. **Timezone**:
   - All times stored in UTC in database
   - Convert to Europe/Madrid (GMT+1/+2) on frontend
