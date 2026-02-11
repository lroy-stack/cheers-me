# Waitlist Management UI

**Status:** ✅ Complete
**Phase:** Operations (Phase 2)
**Module ID:** M6 - Reservations & Tables (Waitlist Feature)

## Overview

The Waitlist Management feature provides a comprehensive walk-in guest management system for GrandCafe Cheers. It enables staff to manage waiting guests, track wait times, notify guests when tables become available, and seamlessly seat them with table assignments.

## Components

### 1. WaitlistStatusBadge
**Location:** `src/components/reservations/waitlist-status-badge.tsx`

Visual status indicator for waitlist entries with icon and color coding.

**Status Types:**
- `waiting` - Guest is waiting (amber)
- `notified` - Guest has been notified table is ready (blue)
- `seated` - Guest has been seated (green)
- `cancelled` - Guest cancelled or left (gray)
- `expired` - Wait time expired, guest didn't respond (red)

**Usage:**
```tsx
<WaitlistStatusBadge status="waiting" />
```

### 2. WaitlistFormDialog
**Location:** `src/components/reservations/waitlist-form-dialog.tsx`

Dialog form for adding walk-in guests to the waitlist with React Hook Form + Zod validation.

**Features:**
- Guest information (name, phone - required)
- Party size (1-50 guests)
- Estimated wait time quote (5-240 minutes, optional)
- Preferred section (Terrace, Indoor, Bar, VIP)
- Special notes

**Validation:**
- Name: Required, max 255 characters
- Phone: Required, max 20 characters
- Party size: Required, 1-50
- Quote time: Optional, 5-240 minutes
- Notes: Optional, max 500 characters

**Props:**
```tsx
interface WaitlistFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: WaitlistFormValues) => Promise<void>
  defaultValues?: Partial<WaitlistFormValues>
}
```

### 3. WaitlistEntryCard
**Location:** `src/components/reservations/waitlist-entry-card.tsx`

Card component displaying individual waitlist entry with inline actions.

**Features:**
- Position badge (visual queue position)
- Guest name and phone
- Party size and estimated wait time
- Preferred section
- Time since added (relative time)
- Status badge
- Dropdown menu with context actions
- Mobile-optimized quick action buttons

**Actions:**
- Notify Guest - Send notification table is ready
- Seat Guest - Assign to table and mark as seated
- Cancel - Mark entry as cancelled
- Remove from List - Delete entry

**Props:**
```tsx
interface WaitlistEntryCardProps {
  entry: WaitlistEntry
  onNotify?: (id: string) => void
  onSeat?: (id: string) => void
  onCancel?: (id: string) => void
  onRemove?: (id: string) => void
}
```

### 4. WaitlistKPICards
**Location:** `src/components/reservations/waitlist-kpi-cards.tsx`

Dashboard KPI cards showing real-time waitlist metrics.

**Metrics:**
- **Currently Waiting** - Active guests in queue
- **Notified** - Guests notified, awaiting response
- **Seated Today** - Total guests seated from waitlist today
- **Avg. Wait Time** - Average wait time for seated guests today

**Props:**
```tsx
interface WaitlistKPICardsProps {
  data: WaitlistKPIData
  isLoading?: boolean
}
```

### 5. WaitlistSeatDialog
**Location:** `src/components/reservations/waitlist-seat-dialog.tsx`

Dialog for assigning a waitlist guest to an available table.

**Features:**
- Shows guest name and party size
- Filters tables by availability and capacity
- Shows table number, capacity, and section
- Prevents seating if no suitable tables available
- Updates both waitlist entry and table status

**Smart Filtering:**
- Only shows tables with status = 'available'
- Only shows tables with capacity >= party size
- Displays warning if no suitable tables

**Props:**
```tsx
interface WaitlistSeatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (tableId: string) => Promise<void>
  tables: Table[]
  partySize: number
  guestName: string
}
```

## Page

### Waitlist Management Page
**Location:** `src/app/reservations/waitlist/page.tsx`

**Features:**
- Real-time updates via Supabase Realtime
- KPI dashboard showing current waitlist stats
- Tabbed view:
  - **Waiting** - Active queue with position numbers
  - **Notified** - Guests that have been notified
  - **Completed** - Seated, cancelled, or expired entries
- Add to Waitlist button
- Refresh button for manual sync
- Alert when no tables available
- Inline actions for each entry

**Workflows:**

1. **Add Guest to Waitlist:**
   - Click "Add to Waitlist"
   - Fill in guest details (name, phone, party size)
   - Optionally set quote time and preferred section
   - Guest is added with automatic position number

2. **Notify Guest:**
   - Click "Notify" on waiting entry
   - Status changes to "notified"
   - Timestamp recorded
   - (Future: SMS/email notification sent)

3. **Seat Guest:**
   - Click "Seat Guest"
   - Select available table from filtered list
   - Table assigned, status → "seated"
   - Table status → "occupied"
   - Actual wait time calculated and recorded

4. **Cancel Entry:**
   - Click "Cancel" if guest leaves
   - Status → "cancelled"
   - Entry moves to Completed tab

**URL:** `/reservations/waitlist`

**Access:** Admin, Manager, Waiter roles

## API Routes (Pre-existing)

The waitlist UI integrates with the following API routes:

### GET /api/waitlist
Fetch waitlist entries with optional filters.

**Query Parameters:**
- `status` - Filter by status (default: 'waiting')
- `date` - Filter by date (default: today)

**Response:** Array of waitlist entries with related tables and customers

### POST /api/waitlist
Add a guest to the waitlist.

**Auto-features:**
- Calculates next position number
- Sets initial status to 'waiting'
- Records creation timestamp

### GET /api/waitlist/[id]
Get a single waitlist entry by ID.

### PATCH /api/waitlist/[id]
Update a waitlist entry.

**Auto-tracking:**
- When status → `notified`: records notified_at
- When status → `seated`: records seated_at, calculates actual_wait_minutes
- Supports table assignment via table_id

### DELETE /api/waitlist/[id]
Remove an entry from the waitlist.

**Auto-features:**
- Reorders remaining entries (decrements positions)
- Only reorders entries with status = 'waiting'

### PATCH /api/waitlist (reorder)
Bulk reorder waitlist positions.

**Body:** Array of `{id, position}` objects

## Database Schema

**Main Table:** `waitlist_entries`

Key columns:
- `id` - UUID primary key
- `position` - Queue position (integer)
- `guest_name` - Guest name (required)
- `guest_phone` - Phone number (required)
- `party_size` - Number of guests (required)
- `waitlist_status` - Status enum (waiting/notified/seated/cancelled/expired)
- `quote_time_minutes` - Estimated wait time (optional)
- `preferred_section` - Preferred seating area (optional)
- `notes` - Special requests or notes (optional)
- `table_id` - Foreign key to tables (optional, set when seated)
- `created_at` - When added to waitlist
- `notified_at` - When guest was notified
- `seated_at` - When guest was seated
- `actual_wait_minutes` - Calculated wait time (seated_at - created_at)

**Related Tables:**
- `tables` - Floor plan tables
- `customers` - Customer profiles (optional link)

## Real-time Features

The page subscribes to Supabase Realtime changes on:
- `waitlist_entries` table - Updates queue automatically
- `tables` table - Updates available tables list

**Benefits:**
- Multiple staff members see updates simultaneously
- No manual refresh needed
- Instant position updates when entries are added/removed
- Live table availability

## Mobile Responsiveness

- **Mobile:**
  - Single-column card layout
  - Quick action buttons below each card
  - Touch targets minimum 44px
  - Swipe-friendly dropdowns

- **Tablet:**
  - Two-column card grid
  - Hybrid desktop/mobile controls

- **Desktop:**
  - Multi-column card grid
  - Dropdown menu for actions
  - Full KPI dashboard visible

## Color Coding

Module accent color: **Cyan-500** (`text-cyan-500`, `bg-cyan-500`)

Status colors:
- Waiting: Amber (urgency)
- Notified: Blue (action pending)
- Seated: Green (success)
- Cancelled: Gray (neutral)
- Expired: Red (failure)

## User Experience Highlights

1. **Visual Queue Position:**
   - Large position badge (#1, #2, #3)
   - Guests know exactly where they are in line

2. **Time Tracking:**
   - Shows relative time since added ("5 minutes ago")
   - Displays estimated wait time
   - Calculates actual wait time when seated

3. **Smart Table Assignment:**
   - Only shows suitable tables (capacity match)
   - Displays table section and capacity
   - Warns if no tables available

4. **Quick Actions:**
   - One-click notify
   - Two-click seating (select table)
   - Cancel/remove options

5. **KPI Dashboard:**
   - At-a-glance waitlist status
   - Average wait time helps set expectations
   - Today's performance metrics

## Future Enhancements

Potential additions (not yet implemented):
- SMS/email notification sending (Twilio integration)
- Estimated wait time algorithm (ML-based)
- Customer preferences from CRM
- Automatic expiration after quote time
- Push notifications for staff
- Wait time history charts
- Customer check-in QR code
- Text-to-join waitlist (public-facing)

## Testing Checklist

- [x] Add guest to waitlist with validation
- [x] Position auto-increments correctly
- [x] Notify guest (status change)
- [x] Seat guest with table assignment
- [x] Table status updates to occupied
- [x] Cancel entry
- [x] Remove entry (reorders positions)
- [x] KPI calculations accurate
- [x] Real-time updates across tabs
- [x] Filter by status (waiting/notified/completed)
- [x] Responsive layout mobile/tablet/desktop
- [x] Table filtering by capacity
- [x] Alert when no tables available
- [x] Relative time display updates

## Dependencies

- `react-hook-form` - Form state management
- `zod` - Schema validation
- `@hookform/resolvers` - Zod + React Hook Form integration
- `date-fns` - Date formatting and relative time
- `lucide-react` - Icons
- `@radix-ui/react-*` - Headless UI components (via shadcn/ui)
- `@supabase/ssr` - Supabase client with real-time

## Notes

- Default quote time: 30 minutes
- Maximum party size: 50 guests
- Timezone: Europe/Madrid (configured in app)
- Position reordering is automatic on delete
- Realtime subscriptions ensure all staff see same queue
- Table assignment is required when seating guests
- Waitlist is reset daily (entries from previous days in "completed" tab)

## Integration with Other Modules

- **Tables Module:** Fetches available tables, updates table status
- **Reservations Module:** Shares same table pool, no conflicts
- **CRM Module:** (Future) Links to customer profiles, preferences
- **Notifications Module:** (Future) SMS/email confirmations
