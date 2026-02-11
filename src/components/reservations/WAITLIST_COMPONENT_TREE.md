# Waitlist Component Tree

```
/reservations/waitlist (Page)
│
├── Header
│   ├── Title & Description
│   └── Actions
│       ├── Refresh Button
│       └── Add to Waitlist Button
│
├── WaitlistKPICards
│   ├── Currently Waiting Card
│   ├── Notified Card
│   ├── Seated Today Card
│   └── Avg Wait Time Card
│
├── Alert (No Tables Available)
│   └── Conditional: when no tables are available
│
├── Tabs (Waitlist Status Views)
│   │
│   ├── Tab: Waiting (Default)
│   │   ├── WaitlistEmptyState (if empty)
│   │   └── WaitlistEntryCard[] (loop)
│   │       ├── Position Badge (#1, #2, etc.)
│   │       ├── Guest Info (name, phone)
│   │       ├── Party Details (size, wait time)
│   │       ├── WaitlistStatusBadge
│   │       ├── Actions Dropdown
│   │       │   ├── Notify Guest
│   │       │   ├── Seat Guest
│   │       │   ├── Cancel
│   │       │   └── Remove
│   │       └── Mobile Quick Actions
│   │           ├── Notify Button
│   │           └── Seat Button
│   │
│   ├── Tab: Notified
│   │   ├── Empty State (if empty)
│   │   └── WaitlistEntryCard[] (loop)
│   │       └── [Same structure as Waiting tab]
│   │
│   └── Tab: Completed
│       ├── Empty State (if empty)
│       └── WaitlistEntryCard[] (loop)
│           └── [Same structure, limited actions]
│
├── WaitlistFormDialog (Add Guest)
│   ├── Dialog Header
│   ├── Form
│   │   ├── Guest Name Input *
│   │   ├── Phone Input *
│   │   ├── Party Size Input *
│   │   ├── Estimated Wait Input
│   │   ├── Preferred Section Input
│   │   └── Notes Textarea
│   └── Dialog Footer
│       ├── Cancel Button
│       └── Submit Button
│
└── WaitlistSeatDialog (Table Assignment)
    ├── Dialog Header (Guest name + party size)
    ├── Form
    │   └── Table Select
    │       ├── Filter: available tables only
    │       ├── Filter: capacity >= party_size
    │       └── Options:
    │           └── Table Number + Capacity + Section
    └── Dialog Footer
        ├── Cancel Button
        └── Seat Guest Button

```

## Component Relationships

### Data Flow

```
Page (State Container)
  ↓
  ├─ Fetch waitlist entries → WaitlistEntryCard[]
  ├─ Fetch tables → WaitlistSeatDialog
  ├─ Calculate KPIs → WaitlistKPICards
  ↓
User Actions (Callbacks)
  ↓
  ├─ handleAddToWaitlist → POST /api/waitlist
  ├─ handleNotify → PATCH /api/waitlist/[id] (status: notified)
  ├─ handleSeatClick → Open WaitlistSeatDialog
  ├─ handleConfirmSeat → PATCH /api/waitlist/[id] (status: seated, table_id)
  │                    → PATCH /api/tables/[id] (status: occupied)
  ├─ handleCancel → PATCH /api/waitlist/[id] (status: cancelled)
  └─ handleRemove → DELETE /api/waitlist/[id]
  ↓
Realtime Subscription
  ↓
  ├─ waitlist_entries table changes → fetchWaitlist()
  └─ tables table changes → fetchTables()
  ↓
Re-render with updated data
```

### Props Flow

```
WaitlistPage
  ├─ passes 'data' → WaitlistKPICards
  ├─ passes 'entry + callbacks' → WaitlistEntryCard
  ├─ passes 'onSubmit callback' → WaitlistFormDialog
  └─ passes 'tables + partySize + onSubmit' → WaitlistSeatDialog

WaitlistEntryCard
  └─ renders → WaitlistStatusBadge (with status prop)
```

## State Management

### Local State (useState)
- `waitlist` - Array of waitlist entries
- `tables` - Array of tables for assignment
- `kpiData` - Calculated KPI metrics
- `isLoading` - Loading state
- `isFormOpen` - Add to waitlist dialog open state
- `isSeatDialogOpen` - Seat guest dialog open state
- `selectedEntry` - Currently selected entry for seating
- `activeTab` - Active tab (waiting/notified/completed)

### Computed State
- `waitingEntries` - Filtered by status = 'waiting'
- `notifiedEntries` - Filtered by status = 'notified'
- `completedEntries` - Filtered by status in ['seated', 'cancelled', 'expired']

### Side Effects (useEffect)
1. **On Mount:**
   - Fetch waitlist entries
   - Fetch tables
   - Subscribe to Realtime changes

2. **On Unmount:**
   - Unsubscribe from Realtime channels

3. **On Realtime Event:**
   - Re-fetch waitlist data
   - Re-calculate KPIs

## Component Reusability

### Shared Components
- `Button` - shadcn/ui
- `Card` - shadcn/ui
- `Dialog` - shadcn/ui
- `Badge` - shadcn/ui
- `Alert` - shadcn/ui
- `Tabs` - shadcn/ui
- `Form` - shadcn/ui (with react-hook-form)
- `Select` - shadcn/ui

### Custom Components
- `WaitlistStatusBadge` - Reusable in any waitlist context
- `WaitlistEntryCard` - Reusable in waitlist views
- `WaitlistKPICards` - Reusable in dashboards
- `WaitlistFormDialog` - Reusable anywhere to add guests
- `WaitlistSeatDialog` - Reusable for table assignments
- `WaitlistEmptyState` - Reusable for empty views

## File Organization

```
src/
├── app/
│   └── reservations/
│       └── waitlist/
│           └── page.tsx (Main Page)
│
├── components/
│   └── reservations/
│       ├── waitlist-status-badge.tsx (Badge)
│       ├── waitlist-form-dialog.tsx (Add Form)
│       ├── waitlist-entry-card.tsx (Entry Display)
│       ├── waitlist-kpi-cards.tsx (KPI Dashboard)
│       ├── waitlist-seat-dialog.tsx (Table Assignment)
│       ├── waitlist-empty-state.tsx (Empty View)
│       └── index.ts (Exports)
│
└── lib/
    └── supabase/
        └── client.ts (Supabase browser client)
```

## TypeScript Interfaces

```typescript
// Shared across components
interface WaitlistEntry {
  id: string
  position: number
  guest_name: string
  guest_phone: string
  party_size: number
  waitlist_status: WaitlistStatus
  quote_time_minutes?: number
  preferred_section?: string
  notes?: string
  created_at: string
  notified_at?: string
  seated_at?: string
  table_id?: string
  tables?: { id: string; table_number: string; capacity: number }
}

type WaitlistStatus = 'waiting' | 'notified' | 'seated' | 'cancelled' | 'expired'

interface Table {
  id: string
  table_number: string
  capacity: number
  table_status: string
  section?: string
}

interface KPIData {
  total_waiting: number
  total_notified: number
  total_seated_today: number
  average_wait_minutes: number | null
}
```
