# Reservations & Tables Module — Database Schema Documentation

## Overview

The Reservations & Tables module handles:
- Interactive floor plan management with drag-and-drop tables
- Online and walk-in reservation booking
- Waitlist management
- Table status tracking (available, occupied, reserved, cleaning)
- Automated confirmation emails/SMS
- No-show tracking and customer reliability metrics
- Occupancy analytics and dashboard KPIs

## Database Tables

### Core Tables

#### `tables`
Physical tables in the restaurant with floor plan positioning.

**Key Columns:**
- `table_number` (VARCHAR) — Display identifier (e.g., "T1", "Bar-3")
- `capacity` (INTEGER) — Maximum number of guests
- `section_id` (UUID) → `floor_sections.id` — Which section (Terrace, Indoor, Bar, VIP)
- `x_position`, `y_position` (DECIMAL) — Coordinates for floor plan editor
- `width`, `height` (DECIMAL) — Dimensions for rectangular tables
- `shape` (ENUM: round, square, rectangle) — Visual shape for rendering
- `rotation` (DECIMAL) — Rotation angle in degrees
- `status` (ENUM: available, occupied, reserved, cleaning) — Current state
- `is_active` (BOOLEAN) — Whether table is in use (vs. removed/storage)

**Usage Notes:**
- Floor plan editor will update `x_position`, `y_position`, `rotation`
- When creating tables, assign to a `section_id`
- `status` is auto-updated by triggers when reservations are seated/completed

#### `floor_sections`
Logical divisions of the restaurant (Terrace, Indoor, Bar, VIP).

**Key Columns:**
- `name` (VARCHAR) — Section name
- `description` (TEXT) — Description (e.g., "Outdoor seating facing beach")
- `sort_order` (INTEGER) — Display order
- `is_active` (BOOLEAN) — Whether section is currently available

**Default Sections:**
1. Terrace (outdoor, beach-facing)
2. Indoor (main dining area)
3. Bar (counter and high tables)
4. VIP (reserved for special guests)

#### `reservations`
Guest reservations with full lifecycle tracking.

**Key Columns:**
- `table_id` (UUID) → `tables.id` — Assigned table (nullable, can assign on arrival)
- `customer_id` (UUID) → `customers.id` — Link to CRM if repeat customer
- `guest_name`, `guest_email`, `guest_phone` — Guest contact info
- `reservation_date` (DATE) — Date of reservation
- `start_time` (TIME) — Reserved time slot start
- `end_time` (TIME) — Expected end time
- `party_size` (INTEGER) — Number of guests
- `reservation_status` (ENUM) — Lifecycle status:
  - `pending` — Awaiting confirmation
  - `confirmed` — Guest confirmed
  - `seated` — Guest has arrived and been seated
  - `completed` — Finished, table freed
  - `cancelled` — Cancelled by guest/staff
  - `no_show` — Guest didn't arrive
- `source` (ENUM: walk_in, phone, website, instagram, email, staff_created) — Booking channel
- `estimated_duration_minutes` (INTEGER) — Expected duration (default 90)
- `actual_arrival_time`, `actual_departure_time` (TIMESTAMPTZ) — Actual times
- `seated_at` (TIMESTAMPTZ) — When guest was seated
- `confirmation_sent_at` (TIMESTAMPTZ) — When confirmation email/SMS sent
- `deposit_required`, `deposit_amount`, `deposit_paid` (BOOLEAN/DECIMAL) — For large parties
- `special_requests` (TEXT) — Dietary restrictions, occasion notes
- `internal_notes` (TEXT) — Staff-only notes

**Status Flow:**
```
pending → confirmed → seated → completed
         ↓          ↓
     cancelled  no_show
```

**Indexes:**
- `reservation_date`, `start_time` — Fast lookups for today's schedule
- `reservation_status` — Filter by status
- `customer_id` — Customer history
- `table_id` — Table availability checks

#### `waitlist_entries`
Walk-in guests waiting for tables.

**Key Columns:**
- `guest_name`, `guest_phone` — Contact info
- `customer_id` (UUID) → `customers.id` — Link if known customer
- `party_size` (INTEGER) — Number of guests
- `waitlist_status` (ENUM: waiting, notified, seated, cancelled, expired)
- `position` (INTEGER) — Queue position (1 = next)
- `quote_time_minutes` (INTEGER) — Wait time quoted to guest
- `actual_wait_minutes` (INTEGER) — Calculated when seated
- `estimated_wait_time_minutes` (INTEGER) — System estimate
- `table_id` (UUID) — Table assigned when seated
- `preferred_section` (VARCHAR) — Guest preference (Terrace, Indoor, etc.)
- `notified_at` (TIMESTAMPTZ) — When guest notified table is ready
- `seated_at` (TIMESTAMPTZ) — When seated

**Status Flow:**
```
waiting → notified → seated
         ↓
     cancelled / expired
```

**Auto-Calculation:**
- `actual_wait_minutes` calculated by trigger on `seated_at` update

### Configuration Tables

#### `reservation_settings`
Global reservation system configuration (single row table).

**Key Columns:**
- `slot_duration_minutes` (INTEGER) — 15, 30, or 60 minutes
- `max_advance_booking_days` (INTEGER) — How far ahead guests can book (default 30)
- `min_advance_booking_hours` (INTEGER) — Minimum notice required (default 2)
- `auto_release_no_show_minutes` (INTEGER) — Auto-release table after N minutes (default 15)
- `require_confirmation` (BOOLEAN) — Require guest to confirm booking
- `allow_online_booking` (BOOLEAN) — Enable public booking form
- `max_party_size` (INTEGER) — Maximum party size for online booking (default 12)

**Usage:**
- Single row — use `SELECT * FROM reservation_settings LIMIT 1`
- Update via settings UI (managers only)

#### `reservation_time_slots`
Available booking time slots by day of week.

**Key Columns:**
- `day_of_week` (INTEGER) — 0 = Sunday, 6 = Saturday
- `start_time`, `end_time` (TIME) — Slot window
- `max_covers` (INTEGER) — Max total guests in this slot
- `is_active` (BOOLEAN) — Enable/disable specific slots
- `notes` (TEXT) — Special notes (e.g., "DJ night, reduced seating")

**Default Slots:**
High season (Jun-Sep): 10:30-03:00
- Morning: 10:30-15:00 (max 80 covers)
- Afternoon: 15:00-20:00 (max 100 covers)
- Night: 20:00-03:00 (max 120 covers)

Low season (Apr-May, Oct): 10:30-01:00 (adjust `end_time` and `is_active`)

**Usage:**
- Frontend checks available slots for date picker
- Validation: guest can't book outside active slots

### Analytics & Tracking Tables

#### `table_sessions`
Track actual table occupancy (vs. reservations) for revenue/analytics.

**Key Columns:**
- `table_id` (UUID) → `tables.id`
- `reservation_id` (UUID) → `reservations.id` — If from reservation (nullable for walk-ins)
- `party_size` (INTEGER) — Actual guest count
- `seated_at` (TIMESTAMPTZ) — When guests sat down
- `departed_at` (TIMESTAMPTZ) — When guests left
- `duration_minutes` (INTEGER) — Auto-calculated by trigger
- `revenue` (DECIMAL) — Total bill (updated from POS)

**Usage:**
- Create session when seating guests (reservation OR walk-in)
- Update `departed_at` when clearing table
- Link to POS sales for revenue attribution

#### `no_show_history`
Historical record of no-shows for customer reliability tracking.

**Key Columns:**
- `reservation_id` (UUID) → `reservations.id`
- `customer_id` (UUID) → `customers.id` — If known customer
- `guest_phone`, `guest_email` — Contact for tracking repeat offenders
- `reservation_date` (DATE)
- `party_size` (INTEGER)
- `marked_no_show_at` (TIMESTAMPTZ)
- `marked_by` (UUID) → `profiles.id` — Staff who marked

**Auto-Created:**
- Trigger creates record when `reservation.status` → `no_show`

**Usage:**
- CRM dashboard: flag customers with high no-show rate
- Require deposits for known no-show customers

#### `reservation_confirmations`
Log of confirmation emails/SMS sent to guests.

**Key Columns:**
- `reservation_id` (UUID) → `reservations.id`
- `confirmation_type` (VARCHAR: email, sms, whatsapp)
- `recipient` (VARCHAR) — Email or phone number
- `sent_at` (TIMESTAMPTZ)
- `delivered_at`, `opened_at`, `clicked_at` (TIMESTAMPTZ) — Tracking metrics
- `failed_at` (TIMESTAMPTZ)
- `error_message` (TEXT) — If send failed

**Usage:**
- Create record when sending confirmation via Resend API
- Update delivery status via webhooks
- Dashboard: confirmation delivery rate

## Database Views (for Dashboard)

### `todays_reservations_summary`
Quick metrics for today's reservations.

**Returns:**
- `reservation_date` (DATE)
- `total_reservations` (INTEGER)
- `total_covers` (INTEGER) — Sum of party sizes
- `confirmed_count`, `pending_count`, `currently_seated`, `no_show_count`, `completed_count`

**Usage:**
```sql
SELECT * FROM todays_reservations_summary;
```

### `occupancy_by_time_slot`
Table occupancy rate by hour.

**Returns:**
- `reservation_date` (DATE)
- `hour` (INTEGER) — 0-23
- `tables_reserved` (INTEGER)
- `total_tables` (INTEGER)
- `occupancy_percentage` (DECIMAL)

**Usage:**
```sql
SELECT * FROM occupancy_by_time_slot
WHERE reservation_date = CURRENT_DATE
ORDER BY hour;
```

### `customer_no_show_rate`
Customer reliability based on no-show history.

**Returns:**
- `id`, `name`, `email`, `phone` (from customers)
- `total_reservations` (INTEGER)
- `no_show_count` (INTEGER)
- `no_show_percentage` (DECIMAL)

**Usage:**
```sql
-- Find unreliable customers (>50% no-show rate)
SELECT * FROM customer_no_show_rate
WHERE no_show_percentage > 50
ORDER BY no_show_percentage DESC;
```

## Triggers & Automation

### `calculate_waitlist_wait_time`
**When:** Waitlist entry `seated_at` is updated
**Action:** Calculates `actual_wait_minutes` = seated_at - created_at

### `calculate_table_session_duration`
**When:** Table session `departed_at` is updated
**Action:** Calculates `duration_minutes` = departed_at - seated_at

### `create_no_show_record`
**When:** Reservation `reservation_status` changes to `no_show`
**Action:** Inserts record into `no_show_history` table

### `update_table_status_from_reservation`
**When:** Reservation status changes
**Actions:**
- `seated` → Set table status to `occupied`
- `completed`/`cancelled`/`no_show` → Set table status to `cleaning` (if no other active sessions)

## Row Level Security (RLS)

### Who Can Access What

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `tables` | All staff | Admin, Manager | Admin, Manager | Admin, Manager |
| `floor_sections` | All staff | Admin, Manager | Admin, Manager | Admin, Manager |
| `reservations` | Waiter, Manager, Admin | Waiter, Manager, Admin | Waiter, Manager, Admin | Admin |
| `waitlist_entries` | Waiter, Manager, Admin | Waiter, Manager, Admin | Waiter, Manager, Admin | Admin |
| `reservation_settings` | Manager, Admin, Owner | Admin | Admin, Manager | None |
| `reservation_time_slots` | Waiter, Manager, Admin | Admin, Manager | Admin, Manager | Admin |
| `table_sessions` | Waiter, Manager, Admin | Waiter, Manager, Admin | Waiter, Manager, Admin | Admin |
| `no_show_history` | Manager, Admin, Owner | Auto (trigger) | None | Admin |
| `reservation_confirmations` | Waiter, Manager, Admin | API | API | None |

**Note:** Public online booking form requires special anonymous INSERT policy (to be added when implementing public API).

## API Route Requirements

Based on this schema, the API routes should support:

### Reservations
- `GET /api/reservations` — List reservations (filter by date, status, table_id)
- `POST /api/reservations` — Create new reservation
- `PATCH /api/reservations/[id]` — Update reservation (status, table assignment, etc.)
- `DELETE /api/reservations/[id]` — Cancel reservation
- `POST /api/reservations/[id]/confirm` — Send confirmation email/SMS
- `POST /api/reservations/[id]/seat` — Mark as seated, create table_session
- `POST /api/reservations/[id]/complete` — Mark as completed, update table_session

### Tables
- `GET /api/tables` — List all tables with current status
- `POST /api/tables` — Create new table
- `PATCH /api/tables/[id]` — Update table (position, capacity, status)
- `DELETE /api/tables/[id]` — Remove table (soft delete via is_active)
- `POST /api/tables/[id]/status` — Update table status only

### Floor Plan
- `GET /api/floor-plan` — Get complete floor plan (sections + tables)
- `PATCH /api/floor-plan/tables` — Bulk update table positions (drag-drop)

### Waitlist
- `GET /api/waitlist` — Current waitlist entries
- `POST /api/waitlist` — Add guest to waitlist
- `PATCH /api/waitlist/[id]` — Update status, notify guest
- `POST /api/waitlist/[id]/seat` — Seat guest from waitlist

### Public Booking
- `GET /api/public/availability` — Check available time slots for date
- `POST /api/public/reservations` — Create reservation (anonymous)
- `GET /api/public/reservations/[token]` — View reservation details
- `POST /api/public/reservations/[token]/confirm` — Guest confirms reservation

### Dashboard
- `GET /api/reservations/dashboard` — Today's metrics (uses views)
- `GET /api/reservations/occupancy` — Occupancy by time slot

## TypeScript Types

Recommended type definitions for frontend:

```typescript
// Enums
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning'
export type TableShape = 'round' | 'square' | 'rectangle'
export type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show'
export type ReservationSource = 'walk_in' | 'phone' | 'website' | 'instagram' | 'email' | 'staff_created'
export type WaitlistStatus = 'waiting' | 'notified' | 'seated' | 'cancelled' | 'expired'

// Tables
export interface Table {
  id: string
  table_number: string
  capacity: number
  section_id: string | null
  section?: FloorSection
  x_position: number | null
  y_position: number | null
  width: number | null
  height: number | null
  shape: TableShape
  rotation: number
  status: TableStatus
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface FloorSection {
  id: string
  name: string
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Reservations
export interface Reservation {
  id: string
  table_id: string | null
  table?: Table
  customer_id: string | null
  guest_name: string
  guest_email: string | null
  guest_phone: string | null
  reservation_date: string // DATE
  start_time: string // TIME
  end_time: string | null
  party_size: number
  reservation_status: ReservationStatus
  source: ReservationSource
  estimated_duration_minutes: number
  actual_arrival_time: string | null
  actual_departure_time: string | null
  seated_at: string | null
  confirmation_sent_at: string | null
  reminder_sent_at: string | null
  special_requests: string | null
  internal_notes: string | null
  deposit_required: boolean
  deposit_amount: number | null
  deposit_paid: boolean
  created_at: string
  updated_at: string
}

// Waitlist
export interface WaitlistEntry {
  id: string
  guest_name: string
  guest_phone: string | null
  customer_id: string | null
  party_size: number
  waitlist_status: WaitlistStatus
  position: number
  quote_time_minutes: number | null
  actual_wait_minutes: number | null
  estimated_wait_time_minutes: number | null
  table_id: string | null
  preferred_section: string | null
  notified_at: string | null
  seated_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// Dashboard
export interface ReservationDashboard {
  reservation_date: string
  total_reservations: number
  total_covers: number
  confirmed_count: number
  pending_count: number
  currently_seated: number
  no_show_count: number
  completed_count: number
}

export interface OccupancyData {
  reservation_date: string
  hour: number
  tables_reserved: number
  total_tables: number
  occupancy_percentage: number
}
```

## Testing Checklist

When implementing API routes, ensure:

- [ ] Reservation CRUD operations work
- [ ] Table status updates correctly when reservations change
- [ ] Waitlist position auto-recalculates when entries removed
- [ ] No-show records created automatically
- [ ] Table session duration calculated correctly
- [ ] RLS policies prevent unauthorized access
- [ ] Triggers fire correctly (test with sample data)
- [ ] Views return correct dashboard metrics
- [ ] Timezone handling correct (Europe/Madrid)
- [ ] Concurrent reservations don't double-book tables

## Next Steps for Frontend Agent

1. Create API routes in `src/app/api/reservations/`, `/tables/`, `/waitlist/`
2. Build UI components:
   - Reservation calendar/list view
   - Interactive floor plan editor (drag-drop tables)
   - Waitlist management panel
   - Table status board
3. Implement real-time updates with Supabase Realtime for table status
4. Create public booking form (embeddable widget)
5. Add confirmation email sending via Resend API
6. Build dashboard with KPI cards using views

## Questions?

Contact the backend agent for:
- Additional indexes needed
- Complex queries for reports
- RLS policy adjustments
- New triggers/functions
