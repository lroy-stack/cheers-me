# Staff Management API Routes

## Overview

Complete API route handlers for the Staff Management module (M2). All routes use Supabase server client, enforce authentication via `requireAuth()` or `requireRole()`, validate request bodies with Zod schemas, and respect Row Level Security policies.

**Base Path:** `/api/staff`

---

## Endpoints

### 1. Employees

#### `GET /api/staff/employees`
List all employees (managers/admins only).

**Auth:** `requireRole(['admin', 'manager'])`

**Query Params:**
- `active` (optional): `'true'` to filter active employees only (no `date_terminated`)

**Response:**
```json
[
  {
    "id": "uuid",
    "profile_id": "uuid",
    "hourly_rate": 15.50,
    "contract_type": "full_time",
    "date_hired": "2024-04-01",
    "date_terminated": null,
    "created_at": "...",
    "updated_at": "...",
    "profile": {
      "id": "uuid",
      "email": "staff@example.com",
      "full_name": "John Doe",
      "role": "waiter",
      "phone": "+123456789",
      "emergency_contact": "Jane Doe",
      "emergency_phone": "+987654321",
      "active": true
    }
  }
]
```

---

#### `POST /api/staff/employees`
Create a new employee record (managers/admins only).

**Auth:** `requireRole(['admin', 'manager'])`

**Request Body:**
```json
{
  "profile_id": "uuid",
  "hourly_rate": 15.50,
  "contract_type": "full_time|part_time|casual|contractor",
  "date_hired": "2024-04-01" // optional, defaults to today
}
```

**Validation:**
- Profile must exist
- Profile must not already have an employee record
- `hourly_rate` must be >= 0

**Response:** `201 Created` with employee object (same as GET)

---

#### `GET /api/staff/employees/[id]`
Get a specific employee by ID (managers/admins only).

**Auth:** `requireRole(['admin', 'manager'])`

**Response:** Employee object (same structure as GET /employees)

**Errors:**
- `404` if employee not found

---

#### `PATCH /api/staff/employees/[id]`
Update an employee record (managers/admins only).

**Auth:** `requireRole(['admin', 'manager'])`

**Request Body (all fields optional):**
```json
{
  "hourly_rate": 16.00,
  "contract_type": "part_time",
  "date_hired": "2024-04-01",
  "date_terminated": "2024-11-01" // null to reactivate
}
```

**Response:** Updated employee object

---

#### `DELETE /api/staff/employees/[id]`
Delete an employee record (admins only).

**Auth:** `requireRole(['admin'])`

**Warning:** This is a hard delete. Consider soft delete via `date_terminated` instead.

**Response:** `{ "success": true }`

---

### 2. Shifts

#### `GET /api/staff/shifts`
List shifts. Managers see all, staff see only their own (via RLS).

**Auth:** `requireAuth()`

**Query Params:**
- `employee_id` (optional): Filter by employee UUID
- `start_date` (optional): YYYY-MM-DD (inclusive)
- `end_date` (optional): YYYY-MM-DD (inclusive)
- `status` (optional): e.g., "scheduled", "completed", "cancelled"

**Response:**
```json
[
  {
    "id": "uuid",
    "employee_id": "uuid",
    "date": "2024-02-10",
    "shift_type": "morning",
    "start_time": "10:30:00",
    "end_time": "17:00:00",
    "break_duration_minutes": 30,
    "status": "scheduled",
    "notes": "Covering for sick colleague",
    "created_at": "...",
    "updated_at": "...",
    "employee": {
      "id": "uuid",
      "profile": {
        "id": "uuid",
        "full_name": "John Doe",
        "role": "waiter"
      }
    }
  }
]
```

---

#### `POST /api/staff/shifts`
Create a new shift (managers/admins only).

**Auth:** `requireRole(['admin', 'manager'])`

**Request Body:**
```json
{
  "employee_id": "uuid",
  "date": "2024-02-10",
  "shift_type": "morning|afternoon|night",
  "start_time": "10:30",
  "end_time": "17:00",
  "break_duration_minutes": 30,
  "notes": "Optional notes"
}
```

**Validation:**
- Checks for shift conflicts (basic overlap detection)
- Times must be in HH:MM or HH:MM:SS format

**Response:** `201 Created` with shift object

---

#### `GET /api/staff/shifts/[id]`
Get a specific shift by ID.

**Auth:** `requireAuth()`

**Response:** Shift object (same structure as GET /shifts)

---

#### `PATCH /api/staff/shifts/[id]`
Update a shift.
- Managers can update any field on any shift
- Staff can only update `notes` on their own shifts (enforced by RLS + validation)

**Auth:** `requireAuth()`

**Request Body (all fields optional):**
```json
{
  "date": "2024-02-11",
  "shift_type": "afternoon",
  "start_time": "17:00",
  "end_time": "23:00",
  "break_duration_minutes": 30,
  "status": "scheduled",
  "notes": "Updated notes"
}
```

**Response:** Updated shift object

---

#### `DELETE /api/staff/shifts/[id]`
Delete a shift (managers/admins only).

**Auth:** `requireRole(['admin', 'manager'])`

**Response:** `{ "success": true }`

---

### 3. Shift Templates

#### `GET /api/staff/templates`
List all shift templates (managers/admins only).

**Auth:** `requireRole(['admin', 'manager'])`

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Morning Shift",
    "shift_type": "morning",
    "start_time": "10:30:00",
    "end_time": "17:00:00",
    "break_duration_minutes": 30,
    "created_at": "...",
    "updated_at": "..."
  }
]
```

---

#### `POST /api/staff/templates`
Create a new shift template (managers/admins only).

**Auth:** `requireRole(['admin', 'manager'])`

**Request Body:**
```json
{
  "name": "Morning Shift",
  "shift_type": "morning",
  "start_time": "10:30",
  "end_time": "17:00",
  "break_duration_minutes": 30
}
```

**Response:** `201 Created` with template object

---

### 4. Availability

#### `GET /api/staff/availability`
List availability records. Managers see all, staff see only their own (via RLS).

**Auth:** `requireAuth()`

**Query Params:**
- `employee_id` (optional): Filter by employee UUID
- `start_date` (optional): YYYY-MM-DD
- `end_date` (optional): YYYY-MM-DD

**Response:**
```json
[
  {
    "id": "uuid",
    "employee_id": "uuid",
    "date": "2024-02-10",
    "available": false,
    "reason": "Personal day",
    "created_at": "...",
    "updated_at": "...",
    "employee": {
      "id": "uuid",
      "profile": {
        "id": "uuid",
        "full_name": "John Doe",
        "role": "waiter"
      }
    }
  }
]
```

---

#### `POST /api/staff/availability`
Create or update availability record (upsert).
Staff can mark their own availability.

**Auth:** `requireAuth()`

**Request Body:**
```json
{
  "employee_id": "uuid",
  "date": "2024-02-10",
  "available": false,
  "reason": "Personal day"
}
```

**Validation:**
- Staff can only set their own availability (unless manager/admin)
- Upserts on conflict of `employee_id` + `date`

**Response:** `201 Created` with availability object

---

### 5. Clock In/Out

#### `GET /api/staff/clock`
Get clock records for the current user or all (if manager).

**Auth:** `requireAuth()`

**Query Params:**
- `employee_id` (optional): Filter by employee UUID
- `start_date` (optional): YYYY-MM-DD
- `end_date` (optional): YYYY-MM-DD

**Response:**
```json
[
  {
    "id": "uuid",
    "employee_id": "uuid",
    "shift_id": "uuid",
    "clock_in_time": "2024-02-10T10:28:00Z",
    "clock_out_time": "2024-02-10T17:05:00Z",
    "created_at": "...",
    "updated_at": "...",
    "employee": { ... },
    "shift": { ... }
  }
]
```

---

#### `POST /api/staff/clock?action=in`
Clock in (create new clock record).

**Auth:** `requireAuth()`

**Request Body (optional):**
```json
{
  "shift_id": "uuid" // optional
}
```

**Validation:**
- Cannot clock in if already clocked in (no `clock_out_time` exists)

**Response:** `201 Created` with clock record

---

#### `POST /api/staff/clock?action=out`
Clock out (update existing clock record with `clock_out_time`).

**Auth:** `requireAuth()`

**Request Body:**
```json
{
  "clock_record_id": "uuid"
}
```

**Validation:**
- Record must belong to current employee
- Record must not already have `clock_out_time`

**Response:** Updated clock record

---

### 6. Shift Swap Requests

#### `GET /api/staff/swap-requests`
List swap requests. Managers see all, staff see only requests involving them (via RLS).

**Auth:** `requireAuth()`

**Query Params:**
- `status` (optional): `'pending'`, `'accepted'`, `'rejected'`, `'cancelled'`

**Response:**
```json
[
  {
    "id": "uuid",
    "shift_id": "uuid",
    "requested_by": "uuid",
    "offered_to": "uuid",
    "status": "pending",
    "reason": "Family emergency",
    "created_at": "...",
    "updated_at": "...",
    "shift": { ... },
    "requester": {
      "id": "uuid",
      "profile": {
        "id": "uuid",
        "full_name": "John Doe",
        "role": "waiter"
      }
    },
    "offered_employee": {
      "id": "uuid",
      "profile": {
        "id": "uuid",
        "full_name": "Jane Smith",
        "role": "waiter"
      }
    }
  }
]
```

---

#### `POST /api/staff/swap-requests`
Create a new shift swap request. Staff can request to swap their own shifts.

**Auth:** `requireAuth()`

**Request Body:**
```json
{
  "shift_id": "uuid",
  "offered_to": "uuid",
  "reason": "Family emergency"
}
```

**Validation:**
- Shift must belong to the requesting employee
- Cannot offer to yourself

**Response:** `201 Created` with swap request object

---

#### `PATCH /api/staff/swap-requests?id=xxx`
Update swap request status.
- Staff can accept/reject requests offered to them
- Managers can update any request

**Auth:** `requireAuth()`

**Request Body:**
```json
{
  "status": "pending|accepted|rejected|cancelled"
}
```

**Side Effect:**
- If `status` is `'accepted'`, the shift's `employee_id` is updated to the `offered_to` employee

**Response:** Updated swap request object

---

### 7. Dashboard

#### `GET /api/staff/dashboard`
Get staff management dashboard metrics:
- Hours per employee
- Overtime alerts
- Labor cost

**Auth:** `requireRole(['admin', 'manager'])`

**Query Params:**
- `period` (optional): `'week'` | `'month'` (default: `'week'`)
- `start_date` (optional): YYYY-MM-DD (overrides period)
- `end_date` (optional): YYYY-MM-DD (overrides period)

**Response:**
```json
{
  "period": {
    "start_date": "2024-02-03",
    "end_date": "2024-02-10",
    "type": "week"
  },
  "employees": [
    {
      "employee_id": "uuid",
      "employee_name": "John Doe",
      "total_hours": 42.5,
      "regular_hours": 40,
      "overtime_hours": 2.5,
      "labor_cost": 687.50
    }
  ],
  "totals": {
    "total_hours": 120.5,
    "total_labor_cost": 1850.25,
    "total_overtime_hours": 5.5
  },
  "overtime_alerts": [
    {
      "employee_id": "uuid",
      "employee_name": "John Doe",
      "overtime_hours": 2.5
    }
  ]
}
```

**Calculation Logic:**
- Hours calculated from `clock_in_out` records
- Overtime threshold: 40 hours/week
- Overtime multiplier: 1.5x hourly rate
- Only includes completed clock records (with `clock_out_time`)

---

## Common Response Codes

- `200 OK` - Successful GET/PATCH/DELETE
- `201 Created` - Successful POST
- `400 Bad Request` - Validation failed or invalid request
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Database or server error

---

## Error Response Format

```json
{
  "error": "Error message",
  "details": [ /* Zod validation errors if applicable */ ]
}
```

---

## Authentication & Authorization

All routes require authentication via Supabase Auth. Role-based access control is enforced using:

- `requireAuth()` - Any authenticated user
- `requireRole(['admin', 'manager'])` - Specific roles only

Row Level Security (RLS) policies provide additional data filtering at the database level.

---

## Next Steps for Frontend Agent

1. **Employee List Page** (`/staff`):
   - Fetch employees: `GET /api/staff/employees?active=true`
   - Create employee: `POST /api/staff/employees`
   - Update employee: `PATCH /api/staff/employees/[id]`

2. **Weekly Scheduler** (`/staff/schedule`):
   - Fetch shifts: `GET /api/staff/shifts?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
   - Create shift: `POST /api/staff/shifts`
   - Drag-and-drop: `PATCH /api/staff/shifts/[id]` to update date/time/employee

3. **Availability Management**:
   - Staff marks availability: `POST /api/staff/availability`
   - Manager views all: `GET /api/staff/availability?start_date=...&end_date=...`

4. **Clock In/Out**:
   - Clock in: `POST /api/staff/clock?action=in`
   - Clock out: `POST /api/staff/clock?action=out`
   - View records: `GET /api/staff/clock?employee_id=xxx`

5. **Shift Swap Requests**:
   - List requests: `GET /api/staff/swap-requests`
   - Create request: `POST /api/staff/swap-requests`
   - Accept/reject: `PATCH /api/staff/swap-requests?id=xxx`

6. **Dashboard**:
   - Fetch metrics: `GET /api/staff/dashboard?period=week`
   - Display KPI cards, overtime alerts, labor cost chart

---

## Database Tables Used

- `employees` - Employee records with hourly rate, contract type
- `shifts` - Scheduled shifts
- `shift_templates` - Predefined shift templates
- `availability` - Staff availability calendar
- `clock_in_out` - Clock in/out timestamps
- `shift_swap_requests` - Shift swap requests
- `profiles` - User profiles (joined for name, role, contact)

---

## Notes

- All timestamps stored in UTC, converted to `Europe/Madrid` timezone on frontend
- Shift overlap detection is basic; consider more sophisticated logic for production
- Overtime calculation assumes 40-hour workweek; adjust for local labor laws
- Soft delete employees via `date_terminated` rather than hard delete
- Realtime updates enabled for `shifts`, `shift_swap_requests`, and `clock_in_out` tables
