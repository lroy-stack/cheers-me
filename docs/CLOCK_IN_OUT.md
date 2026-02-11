# Clock In/Out Feature Documentation

## Overview

The Clock In/Out feature allows all staff members to track their working hours by clocking in when they start their shift and clocking out when they finish. The system records timestamps and calculates total hours worked.

## User Access

**Available to:** All authenticated staff members (all roles)

**Route:** `/clock`

## Features

### 1. Clock In/Out Card

- **Real-time clock display** showing current time updated every second
- **Clock In button** when not currently on shift
- **Clock Out button** when currently clocked in
- **Active shift timer** showing duration in HH:MM:SS format
- **Status badge** indicating active/inactive status

### 2. Clock History

- **Recent records table** showing last 10 clock entries
- **Columns:**
  - Date (day of week + formatted date)
  - Clock In time (HH:MM format)
  - Clock Out time (HH:MM format, or "—" if still active)
  - Duration (calculated hours and minutes)
  - Status badge (Active/Completed)
- **Total hours** calculated and displayed at the top right

### 3. Info Section

Provides step-by-step instructions on how to use the time clock system.

## Components

### ClockInOutCard
**Location:** `src/components/staff/clock-in-out-card.tsx`

**Props:**
- `employeeId` (string): The employee ID to clock in/out for
- `onClockChange?` (function): Optional callback when clock status changes

**Features:**
- Fetches current clock status on mount
- Updates every second to show live duration
- Handles clock in/out API calls
- Shows loading states during actions
- Displays toast notifications for success/errors

### ClockHistory
**Location:** `src/components/staff/clock-history.tsx`

**Props:**
- `employeeId?` (string): Filter records by employee ID (optional)
- `limit?` (number): Max number of records to show (default: 10)
- `showEmployeeColumn?` (boolean): Show employee name column (for managers)

**Features:**
- Fetches clock records from API
- Calculates duration for each record
- Calculates total hours worked
- Responsive table layout
- Loading skeleton states

### ClockPageClient
**Location:** `src/app/clock/clock-page-client.tsx`

**Props:**
- `employeeId` (string): The employee ID for the current user

**Features:**
- Manages state for both ClockInOutCard and ClockHistory
- Refreshes history when clock status changes (key-based re-render)
- Client-side component for interactivity

## API Endpoints

### GET `/api/staff/clock`

Fetch clock records for the current user or all users (if manager).

**Query Parameters:**
- `employee_id` (optional): Filter by employee
- `start_date` (optional): Filter records after this date
- `end_date` (optional): Filter records before this date

**Response:**
```json
[
  {
    "id": "uuid",
    "employee_id": "uuid",
    "shift_id": "uuid",
    "clock_in_time": "2024-02-06T10:30:00Z",
    "clock_out_time": "2024-02-06T18:45:00Z",
    "created_at": "2024-02-06T10:30:00Z",
    "updated_at": "2024-02-06T18:45:00Z",
    "employee": {
      "id": "uuid",
      "profile": {
        "id": "uuid",
        "full_name": "John Doe",
        "role": "waiter"
      }
    },
    "shift": {
      "id": "uuid",
      "date": "2024-02-06",
      "shift_type": "morning",
      "start_time": "10:30",
      "end_time": "18:00"
    }
  }
]
```

### POST `/api/staff/clock?action=in`

Clock in for the current user.

**Request Body:**
```json
{
  "shift_id": "uuid" // optional
}
```

**Response:**
```json
{
  "id": "uuid",
  "employee_id": "uuid",
  "shift_id": null,
  "clock_in_time": "2024-02-06T10:30:00Z",
  "clock_out_time": null,
  "created_at": "2024-02-06T10:30:00Z",
  "updated_at": "2024-02-06T10:30:00Z"
}
```

**Error Cases:**
- 404: Employee record not found
- 400: Already clocked in

### POST `/api/staff/clock?action=out`

Clock out for the current user.

**Request Body:**
```json
{
  "clock_record_id": "uuid"
}
```

**Response:**
```json
{
  "id": "uuid",
  "employee_id": "uuid",
  "shift_id": null,
  "clock_in_time": "2024-02-06T10:30:00Z",
  "clock_out_time": "2024-02-06T18:45:00Z",
  "created_at": "2024-02-06T10:30:00Z",
  "updated_at": "2024-02-06T18:45:00Z"
}
```

**Error Cases:**
- 404: Clock record not found or already clocked out
- 400: Invalid clock_record_id

## Database Schema

### clock_in_out table

```sql
CREATE TABLE clock_in_out (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees ON DELETE CASCADE,
  shift_id UUID REFERENCES shifts ON DELETE SET NULL,
  clock_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
  clock_out_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Types

**Location:** `src/types/index.ts`

```typescript
export interface ClockInOut {
  id: string
  employee_id: string
  shift_id: string | null
  clock_in_time: string
  clock_out_time: string | null
  created_at: string
  updated_at: string
}

export interface ClockInOutWithDetails extends ClockInOut {
  employee: {
    id: string
    profile: {
      id: string
      full_name: string | null
      role: UserRole
    }
  }
  shift: {
    id: string
    date: string
    shift_type: ShiftType
    start_time: string
    end_time: string
  } | null
}

export interface ClockInRequest {
  shift_id?: string
}

export interface ClockOutRequest {
  clock_record_id: string
}
```

## User Flow

1. **Staff member arrives at work**
   - Navigates to `/clock`
   - Sees current time and "Clock In" button
   - Clicks "Clock In"
   - System records current timestamp
   - Card updates to show active status and running timer

2. **During shift**
   - Timer continuously updates showing HH:MM:SS duration
   - Staff can refresh page and timer will recalculate correctly
   - "Clock Out" button is available

3. **Staff member finishes shift**
   - Clicks "Clock Out"
   - System records clock out timestamp
   - Duration is calculated and saved
   - History table updates automatically
   - Card resets to "Clock In" state

4. **Viewing history**
   - Staff can see their last 10 clock records
   - Total hours worked is displayed
   - Each record shows date, times, and duration

## Future Enhancements

1. **Shift Association**: Automatically link clock records to scheduled shifts
2. **Break Tracking**: Add break start/end buttons for unpaid breaks
3. **Geolocation**: Verify staff is on-site when clocking in
4. **Push Notifications**: Remind staff to clock in/out
5. **Weekly Summary**: Show hours worked per day for the current week
6. **Export**: Allow staff to export their clock history as PDF/CSV
7. **Manager Override**: Allow managers to edit clock records if needed
8. **Overtime Alerts**: Warn when approaching overtime hours

## Testing

### Manual Testing Checklist

- [ ] Clock in successfully
- [ ] Cannot clock in twice (shows error)
- [ ] Timer updates every second
- [ ] Timer shows correct duration after page refresh
- [ ] Clock out successfully
- [ ] History updates after clock out
- [ ] Total hours calculated correctly
- [ ] Mobile responsive layout works
- [ ] Toast notifications appear
- [ ] Loading states show during actions
- [ ] Employee without employee record sees error message

### E2E Test Scenarios

1. Complete shift workflow (clock in → wait → clock out → verify history)
2. Multiple shifts in one day
3. Clock in and close browser → reopen and verify timer
4. Concurrent users clocking in/out

## Troubleshooting

### "Employee Record Not Found"
- User account exists but no employee record created
- Admin/manager needs to create employee entry in Staff Management

### "Already Clocked In"
- User has active clock record (no clock_out_time)
- Either clock out first, or admin can update database to close previous record

### Timer not updating
- JavaScript error in console
- Check browser console for errors
- Verify browser supports Date and setInterval

### History not refreshing after clock out
- Network error
- Check API response in browser Network tab
- Verify onClockChange callback is working
