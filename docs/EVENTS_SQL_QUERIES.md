# Events & DJ Management — SQL Query Reference

Quick reference for common queries needed in API routes.

---

## Events

### List Events with Filters
```sql
-- Basic list with filters
SELECT *
FROM events
WHERE event_type = $1
  AND status = $2
  AND event_date >= $3
  AND event_date <= $4
ORDER BY event_date ASC, start_time ASC;

-- With DJ information (JOIN)
SELECT
  e.*,
  json_build_object(
    'id', d.id,
    'name', d.name,
    'genre', d.genre,
    'fee', d.fee,
    'email', d.email,
    'phone', d.phone,
    'social_links', d.social_links
  ) as dj
FROM events e
LEFT JOIN djs d ON e.dj_id = d.id
WHERE e.event_date >= CURRENT_DATE
ORDER BY e.event_date ASC;
```

### Check DJ Availability
```sql
-- Find if DJ is available on specific date
SELECT EXISTS (
  SELECT 1
  FROM events
  WHERE dj_id = $1
    AND event_date = $2
    AND status IN ('pending', 'confirmed')
) as is_booked;
```

### Upcoming Events for DJ
```sql
SELECT *
FROM events
WHERE dj_id = $1
  AND event_date >= CURRENT_DATE
  AND status IN ('pending', 'confirmed')
ORDER BY event_date ASC
LIMIT 10;
```

---

## DJs

### DJ Statistics
```sql
-- Get DJ stats (upcoming events, past events, earnings)
SELECT
  d.*,
  (
    SELECT COUNT(*)
    FROM events
    WHERE dj_id = d.id
      AND event_date < CURRENT_DATE
      AND status = 'completed'
  ) as past_events_count,
  (
    SELECT COALESCE(SUM(d2.fee), 0)
    FROM events e
    JOIN djs d2 ON e.dj_id = d2.id
    WHERE e.dj_id = d.id
      AND e.status = 'completed'
  ) as total_earnings
FROM djs d
WHERE d.id = $1;
```

### Available DJs on Date
```sql
-- Find DJs NOT booked on specific date
SELECT d.*
FROM djs d
WHERE NOT EXISTS (
  SELECT 1
  FROM events e
  WHERE e.dj_id = d.id
    AND e.event_date = $1
    AND e.status IN ('pending', 'confirmed')
);
```

---

## Music Requests

### Get Queue for Event (Ordered)
```sql
SELECT *
FROM music_requests
WHERE event_id = $1
  AND status = 'pending'
ORDER BY created_at ASC;
```

### Count Requests by IP (Rate Limiting)
```sql
-- Note: IP tracking needs to be in application layer or add ip_address column
-- This query assumes you add: ip_address VARCHAR(45) to music_requests table

SELECT COUNT(*)
FROM music_requests
WHERE event_id = $1
  AND created_at > NOW() - INTERVAL '1 hour'
  AND ip_address = $2;
```

---

## Equipment Checklist

### Get Checklist Completion
```sql
SELECT
  COUNT(*) as total_items,
  COUNT(*) FILTER (WHERE is_checked = true) as checked_items,
  ROUND(
    (COUNT(*) FILTER (WHERE is_checked = true)::DECIMAL / COUNT(*)) * 100,
    2
  ) as completion_percentage
FROM event_equipment_checklists
WHERE event_id = $1;
```

### Check if All Equipment Ready
```sql
SELECT NOT EXISTS (
  SELECT 1
  FROM event_equipment_checklists
  WHERE event_id = $1
    AND is_checked = false
) as all_checked;
```

---

## Marketing Drafts

### Get Latest Draft for Event
```sql
SELECT *
FROM event_marketing_drafts
WHERE event_id = $1
ORDER BY generated_at DESC
LIMIT 1;
```

### Pending Approval Drafts
```sql
SELECT
  emd.*,
  e.title as event_title,
  e.event_date,
  e.event_type
FROM event_marketing_drafts emd
JOIN events e ON emd.event_id = e.id
WHERE emd.approved = false
  AND emd.published = false
ORDER BY e.event_date ASC;
```

---

## Analytics Queries

### Events This Month
```sql
SELECT
  event_type,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count
FROM events
WHERE event_date >= DATE_TRUNC('month', CURRENT_DATE)
  AND event_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
GROUP BY event_type;
```

### Top DJs by Bookings
```sql
SELECT
  d.name,
  d.genre,
  COUNT(e.id) as booking_count,
  AVG(d.fee) as avg_fee
FROM djs d
JOIN events e ON d.id = e.dj_id
WHERE e.status = 'completed'
  AND e.event_date >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY d.id, d.name, d.genre
ORDER BY booking_count DESC
LIMIT 10;
```

### Music Requests Statistics
```sql
SELECT
  e.title as event_title,
  e.event_date,
  COUNT(mr.id) as total_requests,
  COUNT(*) FILTER (WHERE mr.status = 'played') as played_count,
  COUNT(*) FILTER (WHERE mr.status = 'skipped') as skipped_count
FROM events e
LEFT JOIN music_requests mr ON e.id = mr.event_id
WHERE e.event_date >= CURRENT_DATE - INTERVAL '3 months'
  AND e.event_type = 'dj_night'
GROUP BY e.id, e.title, e.event_date
ORDER BY e.event_date DESC;
```

---

## Supabase TypeScript Usage

### Basic Query (using generated types)
```typescript
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();

  const { data: events, error } = await supabase
    .from('events')
    .select('*, dj:djs(*)')
    .eq('status', 'confirmed')
    .gte('event_date', new Date().toISOString().split('T')[0])
    .order('event_date', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: events });
}
```

### Insert with RLS
```typescript
const { data: newEvent, error } = await supabase
  .from('events')
  .insert({
    title: 'DJ Night',
    event_date: '2026-06-15',
    start_time: '22:00',
    event_type: 'dj_night',
    dj_id: 'uuid-here',
    status: 'pending'
  })
  .select()
  .single();
```

### Realtime Subscription
```typescript
const channel = supabase
  .channel('events-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'events',
      filter: `event_date=gte.${today}`
    },
    (payload) => {
      console.log('Event changed:', payload);
      // Update UI state
    }
  )
  .subscribe();
```

---

## Performance Tips

1. **Use Indexes**: All date and status filters use indexes created in migration
2. **Avoid N+1 Queries**: Use JOIN or Supabase's `.select('*, dj:djs(*)')` syntax
3. **Pagination**: Add `LIMIT` and `OFFSET` for large result sets
4. **Filter Early**: Apply WHERE clauses before JOINs when possible
5. **RLS Performance**: Policies use indexed columns (auth.uid() lookups are fast)

---

## Testing Queries

```sql
-- Insert test DJ
INSERT INTO djs (name, genre, fee, email, phone)
VALUES ('DJ Test', 'House', 500.00, 'dj@test.com', '+34612345678')
RETURNING *;

-- Insert test event
INSERT INTO events (title, event_date, start_time, event_type, dj_id, status)
VALUES ('Test DJ Night', '2026-06-15', '22:00', 'dj_night', 'dj-uuid-here', 'confirmed')
RETURNING *;

-- Insert test music request
INSERT INTO music_requests (event_id, guest_name, song_title, artist, status)
VALUES ('event-uuid-here', 'John Doe', 'Sandstorm', 'Darude', 'pending')
RETURNING *;
```

---

**End of SQL Query Reference**
