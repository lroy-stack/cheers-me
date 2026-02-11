# Staff Management Database Schema

**Module:** M2 - Staff Management
**Status:** ✅ Complete
**Migrations:** `001_initial_schema.sql`, `002_staff_rls_policies.sql`

---

## Tables Overview

### 1. `profiles`
Core user authentication and profile data (linked to Supabase Auth).

**Key Fields:**
- `id` UUID (FK to auth.users)
- `email` VARCHAR(255) UNIQUE
- `full_name` VARCHAR(255)
- `role` user_role ENUM
- `phone` VARCHAR(20)
- `emergency_contact` VARCHAR(255)
- `emergency_phone` VARCHAR(20)
- `language` VARCHAR(5) (default: 'en')
- `active` BOOLEAN

**Roles:** admin | manager | kitchen | bar | waiter | dj | owner

---

### 2. `employees`
Employment details separate from auth profiles.

**Key Fields:**
- `id` UUID PRIMARY KEY
- `profile_id` UUID (FK to profiles, UNIQUE)
- `hourly_rate` DECIMAL(10,2)
- `contract_type` contract_type ENUM
- `date_hired` DATE
- `date_terminated` DATE

**Contract Types:** full_time | part_time | casual | contractor

---

### 3. `shifts`
Individual scheduled shifts for employees.

**Key Fields:**
- `id` UUID PRIMARY KEY
- `employee_id` UUID (FK to employees)
- `date` DATE
- `shift_type` shift_type ENUM
- `start_time` TIME
- `end_time` TIME
- `break_duration_minutes` INTEGER (default: 0)
- `status` VARCHAR(50) (default: 'scheduled')
- `notes` TEXT

**Shift Types:** morning | afternoon | night

**Indexes:**
- `idx_shifts_employee_id`
- `idx_shifts_date`

**Realtime:** ✅ Enabled (staff receive live schedule updates)

---

### 4. `shift_templates`
Preset shift configurations for quick scheduling.

**Key Fields:**
- `id` UUID PRIMARY KEY
- `name` VARCHAR(100)
- `shift_type` shift_type ENUM
- `start_time` TIME
- `end_time` TIME
- `break_duration_minutes` INTEGER

**Example Templates:**
- Morning: 10:30 - 17:00 (6.5h)
- Afternoon: 17:00 - 23:00 (6h)
- Night: 23:00 - 03:00 (4h)

---

### 5. `availability`
Staff-marked available/unavailable days.

**Key Fields:**
- `id` UUID PRIMARY KEY
- `employee_id` UUID (FK to employees)
- `date` DATE
- `available` BOOLEAN
- `reason` TEXT (optional)

**Unique Constraint:** (employee_id, date)

---

### 6. `clock_in_out`
Time tracking for actual work hours.

**Key Fields:**
- `id` UUID PRIMARY KEY
- `employee_id` UUID (FK to employees)
- `shift_id` UUID (FK to shifts, nullable)
- `clock_in_time` TIMESTAMPTZ
- `clock_out_time` TIMESTAMPTZ (nullable - ongoing shift)

**Index:** `idx_clock_in_out_employee_id`

**Realtime:** ✅ Enabled (manager dashboard live updates)

---

### 7. `shift_swap_requests`
Peer-to-peer shift swap workflow.

**Key Fields:**
- `id` UUID PRIMARY KEY
- `shift_id` UUID (FK to shifts)
- `requested_by` UUID (FK to employees)
- `offered_to` UUID (FK to employees)
- `status` VARCHAR(50) (default: 'pending')
- `reason` TEXT

**Status Flow:** pending → approved/rejected

**Realtime:** ✅ Enabled (instant swap approval notifications)

---

## Row Level Security (RLS) Policies

### `profiles`
- ✅ Users can SELECT their own profile
- ✅ Admins can SELECT all profiles
- ✅ Users can UPDATE their own profile

### `employees`
- ✅ All staff roles can SELECT (view employee list)
- ✅ Managers/admins can INSERT (create employees)
- ✅ Managers/admins can UPDATE (edit employees)
- ✅ Admins can DELETE (remove employees)

### `shifts`
- ✅ Staff can SELECT own shifts, managers can SELECT all
- ✅ Managers can INSERT (create shifts)
- ✅ Managers can UPDATE any shift, staff can UPDATE notes on own shifts
- ✅ Managers can DELETE shifts

### `shift_templates`
- ✅ Managers can SELECT/INSERT/UPDATE/DELETE templates

### `availability`
- ✅ Staff can SELECT own availability, managers can SELECT all
- ✅ Staff can INSERT/UPDATE/DELETE own availability

### `clock_in_out`
- ✅ Staff can SELECT own records, managers can SELECT all
- ✅ Staff can INSERT (clock in)
- ✅ Staff can UPDATE own records (clock out), managers can UPDATE any
- ✅ Managers can DELETE (for corrections)

### `shift_swap_requests`
- ✅ Staff can SELECT swap requests involving them, managers can SELECT all
- ✅ Staff can INSERT swap requests for their own shifts
- ✅ Staff can UPDATE swaps they're involved in, managers can UPDATE any
- ✅ Staff can DELETE own pending requests, managers can DELETE any

---

## Triggers & Functions

### `update_profiles_updated_at()`
Automatically updates `profiles.updated_at` on row UPDATE.

### `update_employees_updated_at()`
Automatically updates `employees.updated_at` on row UPDATE.

---

## API Routes to Implement

### Staff CRUD
- `GET /api/staff` - List all employees (paginated)
- `GET /api/staff/[id]` - Get single employee details
- `POST /api/staff` - Create new employee (manager/admin only)
- `PATCH /api/staff/[id]` - Update employee (manager/admin only)
- `DELETE /api/staff/[id]` - Terminate employee (admin only, soft delete via date_terminated)

### Shift Management
- `GET /api/shifts?employee_id=&date_from=&date_to=` - Get shifts (filtered)
- `POST /api/shifts` - Create shift (manager only)
- `PATCH /api/shifts/[id]` - Update shift (manager or shift owner for notes)
- `DELETE /api/shifts/[id]` - Delete shift (manager only)
- `POST /api/shifts/bulk` - Create multiple shifts from template (manager only)

### Availability
- `GET /api/availability?employee_id=&date_from=&date_to=` - Get availability
- `POST /api/availability` - Mark day available/unavailable (staff)
- `PATCH /api/availability/[id]` - Update availability (staff)
- `DELETE /api/availability/[id]` - Remove availability record (staff)

### Clock In/Out
- `GET /api/clock?employee_id=&date_from=&date_to=` - Get clock records
- `POST /api/clock/in` - Clock in (staff)
- `POST /api/clock/out` - Clock out (staff)
- `GET /api/clock/current` - Get ongoing shift for current user

### Shift Swaps
- `GET /api/shift-swaps?employee_id=` - Get swap requests (involving user)
- `POST /api/shift-swaps` - Create swap request (staff)
- `PATCH /api/shift-swaps/[id]/approve` - Approve swap (offered_to employee or manager)
- `PATCH /api/shift-swaps/[id]/reject` - Reject swap (offered_to employee or manager)
- `DELETE /api/shift-swaps/[id]` - Cancel swap request (requested_by employee)

### Shift Templates
- `GET /api/shift-templates` - List templates (manager)
- `POST /api/shift-templates` - Create template (manager)
- `PATCH /api/shift-templates/[id]` - Update template (manager)
- `DELETE /api/shift-templates/[id]` - Delete template (manager)

### Dashboard/Reports
- `GET /api/staff/reports/hours?employee_id=&period=week|month` - Hours worked per employee
- `GET /api/staff/reports/labor-cost?date_from=&date_to=` - Labor cost calculation
- `GET /api/staff/reports/overtime?date_from=&date_to=` - Overtime alerts

---

## TypeScript Types

Generate types from Supabase schema:

```bash
npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
```

**Example Types:**

```typescript
type UserRole = 'admin' | 'manager' | 'kitchen' | 'bar' | 'waiter' | 'dj' | 'owner'
type ShiftType = 'morning' | 'afternoon' | 'night'
type ContractType = 'full_time' | 'part_time' | 'casual' | 'contractor'

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  phone: string | null
  emergency_contact: string | null
  emergency_phone: string | null
  language: string
  active: boolean
  created_at: string
  updated_at: string
}

interface Employee {
  id: string
  profile_id: string
  hourly_rate: number
  contract_type: ContractType
  date_hired: string | null
  date_terminated: string | null
  created_at: string
  updated_at: string
}

interface Shift {
  id: string
  employee_id: string
  date: string
  shift_type: ShiftType
  start_time: string
  end_time: string
  break_duration_minutes: number
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}
```

---

## Calculations

### Hours Worked (Single Shift)
```typescript
function calculateShiftHours(shift: Shift): number {
  const start = new Date(`1970-01-01T${shift.start_time}`)
  const end = new Date(`1970-01-01T${shift.end_time}`)

  // Handle overnight shifts (night shift 23:00-03:00)
  if (end < start) {
    end.setDate(end.getDate() + 1)
  }

  const totalMinutes = (end.getTime() - start.getTime()) / (1000 * 60)
  const workMinutes = totalMinutes - (shift.break_duration_minutes || 0)

  return workMinutes / 60 // Return hours
}
```

### Weekly Hours per Employee
```typescript
async function getWeeklyHours(employeeId: string, weekStart: Date) {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const { data: shifts } = await supabase
    .from('shifts')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('date', weekStart.toISOString())
    .lt('date', weekEnd.toISOString())

  return shifts?.reduce((total, shift) => total + calculateShiftHours(shift), 0) || 0
}
```

### Labor Cost (Period)
```typescript
async function calculateLaborCost(dateFrom: Date, dateTo: Date) {
  const { data: shifts } = await supabase
    .from('shifts')
    .select('*, employee:employees(hourly_rate)')
    .gte('date', dateFrom.toISOString())
    .lte('date', dateTo.toISOString())

  return shifts?.reduce((total, shift) => {
    const hours = calculateShiftHours(shift)
    const rate = shift.employee?.hourly_rate || 0
    return total + (hours * rate)
  }, 0) || 0
}
```

---

## Notification Requirements

### When Schedule Published
**Trigger:** Manager publishes weekly schedule
**Recipients:** All employees with shifts that week
**Channel:** Web Push notification
**Content:** "Your schedule for [Week of Date] is now available. You have [N] shifts scheduled."

### Shift Swap Approved/Rejected
**Trigger:** Swap request status changes
**Recipients:** Both employees involved
**Channel:** Web Push notification
**Content:** "Your shift swap request for [Date] was [approved/rejected]."

### Low Stock Alert (for bar/kitchen staff)
**Trigger:** Product stock < min_stock
**Recipients:** Employees with role 'kitchen' or 'bar'
**Channel:** Web Push notification
**Content:** "[Product Name] is low. Current stock: [N] [units]."

---

## Frontend Components Needed

### Pages
- `/app/staff/page.tsx` - Staff list view
- `/app/staff/[id]/page.tsx` - Employee detail/edit
- `/app/staff/schedule/page.tsx` - Weekly shift scheduler with drag-and-drop
- `/app/staff/availability/page.tsx` - Staff availability calendar
- `/app/staff/clock/page.tsx` - Clock in/out interface
- `/app/staff/swaps/page.tsx` - Shift swap requests

### Components
- `<StaffTable>` - Employee list with filters
- `<StaffForm>` - Create/edit employee form
- `<WeeklyScheduler>` - Drag-and-drop shift grid (7 days × time slots)
- `<ShiftTemplateSelector>` - Quick-apply shift templates
- `<AvailabilityCalendar>` - Mark available/unavailable days
- `<ClockInButton>` - One-tap clock in/out
- `<ShiftSwapCard>` - Swap request card with approve/reject
- `<LaborCostWidget>` - Dashboard KPI card for labor cost

---

## Testing Checklist

### Unit Tests
- [ ] `calculateShiftHours()` function (including overnight shifts)
- [ ] `getWeeklyHours()` aggregation
- [ ] `calculateLaborCost()` with multiple employees

### Integration Tests
- [ ] Create employee via API route
- [ ] Create shift and verify RLS (staff can see own, manager sees all)
- [ ] Clock in/out workflow
- [ ] Shift swap request → approve → verify shift reassignment
- [ ] Availability marking → verify appears in availability table

### E2E Tests
- [ ] Manager login → Create employee → Assign shift
- [ ] Staff login → View own shifts → Clock in → Clock out
- [ ] Staff A requests swap with Staff B → Staff B approves → Shift updates
- [ ] Manager publishes schedule → Staff receives push notification

---

## Migration Status

✅ **001_initial_schema.sql** - Base tables created
✅ **002_staff_rls_policies.sql** - Complete RLS policies added

**Next Steps:**
1. Run migrations on Supabase project
2. Generate TypeScript types
3. Implement API routes (see list above)
4. Build frontend components

---

## Questions for Frontend Agent

1. **Shift Scheduler UI:** Prefer drag-and-drop library (e.g., `@dnd-kit/core`) or build custom?
2. **Calendar View:** Use `react-big-calendar` or `fullcalendar` for availability/schedule views?
3. **Real-time Updates:** Use Supabase realtime hooks or polling for shift updates?
4. **Mobile Clock In:** Should clock-in use geolocation to verify staff is on-site?

---

**Document Version:** 1.0
**Last Updated:** 2026-02-06
**Backend Agent:** Ready for API route implementation
