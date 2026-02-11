# Reservations Module

**Status:** ✅ Complete
**Phase:** Operations (Phase 2)
**Module ID:** M6 - Reservations & Tables

## Overview

The Reservations module provides a comprehensive table reservation management system for GrandCafe Cheers. It enables staff to create, manage, and track reservations with real-time updates, KPI tracking, and multi-channel source tracking (walk-in, phone, website, Instagram, etc.).

## Components

### 1. ReservationStatusBadge
**Location:** `src/components/reservations/reservation-status-badge.tsx`

Visual status indicator for reservations with icon and color coding.

**Status Types:**
- `pending` - Awaiting confirmation (amber)
- `confirmed` - Confirmed by guest (cyan)
- `seated` - Guest has arrived and been seated (blue)
- `completed` - Reservation finished (green)
- `cancelled` - Cancelled by guest or staff (gray)
- `no_show` - Guest didn't show up (red)

**Usage:**
```tsx
<ReservationStatusBadge status="confirmed" />
```

### 2. ReservationList
**Location:** `src/components/reservations/reservation-list.tsx`

Main data table component with filtering, search, and inline actions.

**Features:**
- Search by name, phone, or email
- Filter by status (pending, confirmed, seated, etc.)
- Filter by source (walk-in, phone, website, Instagram, etc.)
- Inline status changes (seat, complete, mark no-show, cancel)
- Responsive design (hides columns on mobile)
- Context menu for each reservation

**Props:**
```tsx
interface ReservationListProps {
  reservations: Reservation[]
  onEdit?: (reservation: Reservation) => void
  onDelete?: (id: string) => void
  onStatusChange?: (id: string, status: ReservationStatus) => void
  onViewDetails?: (reservation: Reservation) => void
}
```

### 3. ReservationFormDialog
**Location:** `src/components/reservations/reservation-form-dialog.tsx`

Create/edit reservation form with validation using React Hook Form + Zod.

**Features:**
- Guest information (name, phone, email)
- Reservation details (date, time, party size, duration)
- Table assignment (optional)
- Source tracking
- Special requests (guest-facing)
- Internal notes (staff-only)
- Deposit management (optional)

**Validation:**
- Required fields: guest name, phone, party size, date, time
- Email format validation
- Party size: 1-50 guests
- Duration: 15-480 minutes
- Date: cannot book in the past

**Props:**
```tsx
interface ReservationFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ReservationFormValues) => Promise<void>
  defaultValues?: Partial<ReservationFormValues>
  tables?: Table[]
  mode?: 'create' | 'edit'
}
```

### 4. ReservationKPICards
**Location:** `src/components/reservations/reservation-kpi-cards.tsx`

Dashboard KPI cards showing key metrics for the selected date.

**Metrics:**
- Total Reservations - Number of bookings
- Total Covers - Expected guests
- Currently Seated - Active tables
- Occupancy Rate - Table utilization percentage
- Pending - Awaiting confirmation
- No Shows - Today's no-shows

**Props:**
```tsx
interface ReservationKPICardsProps {
  data: KPIData
  isLoading?: boolean
}
```

### 5. ReservationDetailSheet
**Location:** `src/components/reservations/reservation-detail-sheet.tsx`

Slide-out panel showing full reservation details.

**Displays:**
- Guest information (name, phone, email, source)
- Reservation details (date, time, party size, table)
- Special requests
- Internal notes
- Deposit information (if applicable)
- Timing information (arrival, seated, departure)
- Metadata (created date, ID)
- Action buttons (edit, delete)

**Props:**
```tsx
interface ReservationDetailSheetProps {
  reservation: Reservation | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (reservation: Reservation) => void
  onDelete?: (id: string) => void
}
```

## Pages

### Main Reservations Page
**Location:** `src/app/reservations/page.tsx`

**Features:**
- Date picker to view reservations for any date
- Real-time updates via Supabase Realtime
- KPI dashboard at the top
- Tabbed view:
  - **All** - All reservations for the date
  - **Upcoming** - Pending and confirmed
  - **Active** - Currently seated
  - **Completed** - Finished, cancelled, no-shows
- Create new reservation button
- Refresh button
- Inline editing and status changes

**URL:** `/reservations`

**Access:** Admin, Manager, Waiter roles

## API Routes

### GET /api/reservations
Fetch reservations with optional filters.

**Query Parameters:**
- `date` - Filter by date (YYYY-MM-DD)
- `status` - Filter by status
- `table_id` - Filter by table
- `customer_id` - Filter by customer
- `from_date` - Start of date range
- `to_date` - End of date range
- `limit` - Maximum results (default: 100)

**Response:** Array of reservations with related tables and customers

### POST /api/reservations
Create a new reservation.

**Validation:**
- Checks for table conflicts (time overlap)
- Sets initial status based on source (website → pending, others → confirmed)
- Records creator ID

### GET /api/reservations/[id]
Get a single reservation by ID with full details.

### PATCH /api/reservations/[id]
Update a reservation.

**Auto-tracking:**
- When status → `cancelled`: records cancelled_at, cancelled_by
- When status → `seated`: records seated_at, actual_arrival_time
- When status → `completed`: records actual_departure_time

### DELETE /api/reservations/[id]
Delete a reservation (admin/manager only).

## Database Schema

**Main Table:** `reservations`

Key columns:
- `id` - UUID primary key
- `guest_name`, `guest_email`, `guest_phone` - Guest contact info
- `party_size` - Number of guests
- `reservation_date` - Date (YYYY-MM-DD)
- `start_time` - Start time (HH:MM:SS)
- `reservation_status` - Current status enum
- `source` - How reservation was created enum
- `estimated_duration_minutes` - Expected duration (default: 90)
- `table_id` - Foreign key to tables (optional)
- `customer_id` - Foreign key to customers (optional)
- `special_requests` - Guest-facing notes
- `internal_notes` - Staff-only notes
- `deposit_required`, `deposit_amount`, `deposit_paid` - Deposit tracking
- `actual_arrival_time`, `seated_at`, `actual_departure_time` - Timing
- `cancellation_reason`, `cancelled_at`, `cancelled_by` - Cancellation tracking

**Related Tables:**
- `tables` - Floor plan tables with capacity and section
- `customers` - Customer profiles
- `floor_sections` - Restaurant sections (Terrace, Indoor, Bar, VIP)
- `reservation_confirmations` - Email/SMS confirmation log
- `no_show_history` - Tracks customer reliability
- `table_sessions` - Occupancy analytics

## Realtime Features

The page subscribes to Supabase Realtime changes on the `reservations` table:
- Automatically refreshes when reservations are created/updated/deleted
- All users see updates simultaneously
- No manual refresh needed

## Mobile Responsiveness

- **Mobile:** Single-column layout, bottom action sheet for forms
- **Tablet:** Two-column layout, some columns hidden
- **Desktop:** Full table with all columns visible
- Touch targets minimum 44px for mobile usability

## Color Coding (Theme)

Module accent color: **Cyan-500** (`text-cyan-500`, `bg-cyan-500`)

Status colors:
- Pending: Amber
- Confirmed: Cyan
- Seated: Blue
- Completed: Green
- Cancelled: Gray
- No Show: Red

## Testing Checklist

- [x] Create reservation form validation
- [x] Edit reservation with pre-filled data
- [x] Delete reservation with confirmation
- [x] Change reservation status (pending → confirmed → seated → completed)
- [x] Mark as no-show
- [x] Cancel reservation
- [x] Search by guest name, phone, email
- [x] Filter by status
- [x] Filter by source
- [x] Date picker to view different dates
- [x] Real-time updates across browser tabs
- [x] Table assignment optional
- [x] Deposit tracking
- [x] KPI calculations
- [x] Responsive layout on mobile/tablet/desktop

## Future Enhancements

Potential additions (not yet implemented):
- Email/SMS confirmation sending
- Online booking widget (public-facing)
- Floor plan visual view
- Waitlist integration
- Calendar view mode
- Export reservations to CSV
- Print reservation list
- Customer history in detail view
- Automatic no-show detection (cron job)

## Dependencies

- `react-hook-form` - Form state management
- `zod` - Schema validation
- `@hookform/resolvers` - Zod + React Hook Form integration
- `date-fns` - Date formatting and manipulation
- `lucide-react` - Icons
- `@radix-ui/react-*` - Headless UI components (via shadcn/ui)

## Notes

- Default reservation duration: 90 minutes
- Timezone: Europe/Madrid (configured in app)
- Minimum advance booking: 2 hours (configurable in reservation_settings)
- Maximum advance booking: 30 days (configurable)
- No-show auto-release: 15 minutes after reservation time (configurable)
