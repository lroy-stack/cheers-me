# POS & Sales API Routes Documentation

This document provides complete API documentation for the POS & Sales module endpoints.

## Base URL
All routes are prefixed with `/api/sales/`

## Authentication
All routes require authentication. Role-based access is enforced:
- **admin, manager**: Full CRUD access
- **owner**: Read-only access to reports and dashboards
- **staff**: Limited access (e.g., can view own tips)

---

## Daily Sales

### `GET /api/sales/daily`
List daily sales records with optional filtering.

**Access:** admin, manager, owner

**Query Parameters:**
- `start_date` (optional): Filter sales from this date (YYYY-MM-DD)
- `end_date` (optional): Filter sales until this date (YYYY-MM-DD)
- `limit` (optional): Number of records to return (default: 30)

**Response:**
```json
[
  {
    "id": "uuid",
    "date": "2024-04-15",
    "food_revenue": 1250.50,
    "drinks_revenue": 850.00,
    "cocktails_revenue": 650.00,
    "desserts_revenue": 200.00,
    "other_revenue": 100.00,
    "tips": 150.00,
    "total_revenue": 3050.50,
    "ticket_count": 85,
    "created_at": "2024-04-15T20:30:00Z",
    "updated_at": "2024-04-15T20:30:00Z"
  }
]
```

---

### `POST /api/sales/daily`
Create or update daily sales record (upserts by date).

**Access:** admin, manager

**Request Body:**
```json
{
  "date": "2024-04-15",
  "food_revenue": 1250.50,
  "drinks_revenue": 850.00,
  "cocktails_revenue": 650.00,
  "desserts_revenue": 200.00,
  "other_revenue": 100.00,
  "tips": 150.00,
  "ticket_count": 85
}
```

**Response:** Single daily sales object (201 Created)

**Notes:**
- `total_revenue` is calculated automatically
- If a record exists for the date, it will be updated
- All revenue fields default to 0 if not provided

---

### `GET /api/sales/daily/[date]`
Get daily sales record for a specific date.

**Access:** admin, manager, owner

**Parameters:**
- `date`: Date in YYYY-MM-DD format

**Response:** Single daily sales object or 404 if not found

---

### `PATCH /api/sales/daily/[date]`
Update daily sales record for a specific date.

**Access:** admin, manager

**Parameters:**
- `date`: Date in YYYY-MM-DD format

**Request Body:** (all fields optional)
```json
{
  "food_revenue": 1300.00,
  "ticket_count": 90
}
```

**Response:** Updated daily sales object

**Notes:**
- Only provided fields will be updated
- `total_revenue` is recalculated if any revenue field changes

---

### `DELETE /api/sales/daily/[date]`
Delete daily sales record for a specific date.

**Access:** admin only

**Response:** Success message

---

## Sales Items (Top Sellers Tracking)

### `GET /api/sales/items`
List sales items with optional filtering.

**Access:** admin, manager, owner

**Query Parameters:**
- `daily_sales_id` (optional): Filter by daily sales record
- `category` (optional): Filter by category
- `start_date` (optional): Filter from date
- `end_date` (optional): Filter until date
- `limit` (optional): Number of records (default: 100)

**Response:**
```json
[
  {
    "id": "uuid",
    "daily_sales_id": "uuid",
    "menu_item_id": "uuid",
    "item_name": "Club Sandwich",
    "category": "food",
    "quantity": 12,
    "unit_price": 8.50,
    "total_price": 102.00,
    "recorded_at": "2024-04-15T14:30:00Z",
    "created_at": "2024-04-15T14:30:00Z"
  }
]
```

---

### `POST /api/sales/items`
Create sales items (single or batch).

**Access:** admin, manager

**Single Item Request:**
```json
{
  "daily_sales_id": "uuid",
  "menu_item_id": "uuid",
  "item_name": "Club Sandwich",
  "category": "food",
  "quantity": 12,
  "unit_price": 8.50,
  "total_price": 102.00,
  "recorded_at": "2024-04-15T14:30:00Z"
}
```

**Batch Request:**
```json
{
  "items": [
    { /* item 1 */ },
    { /* item 2 */ },
    // ... up to 100 items
  ]
}
```

**Response:** Created item(s) (201 Created)

---

## Shift Tips

### `GET /api/sales/tips`
List shift tips with optional filtering.

**Access:** authenticated (staff see own tips, managers see all)

**Query Parameters:**
- `employee_id` (optional, managers only): Filter by employee
- `shift_id` (optional): Filter by shift
- `start_date` (optional): Filter from date
- `end_date` (optional): Filter until date
- `limit` (optional): Number of records (default: 50)

**Response:**
```json
[
  {
    "id": "uuid",
    "shift_id": "uuid",
    "employee_id": "uuid",
    "amount": 45.50,
    "created_at": "2024-04-15T23:00:00Z",
    "shift": {
      "id": "uuid",
      "date": "2024-04-15",
      "shift_type": "evening",
      "start_time": "17:00:00",
      "end_time": "23:00:00"
    },
    "employee": {
      "id": "uuid",
      "profile": {
        "full_name": "John Doe"
      }
    }
  }
]
```

---

### `POST /api/sales/tips`
Record shift tips (single or batch).

**Access:** admin, manager

**Single Tip Request:**
```json
{
  "shift_id": "uuid",
  "employee_id": "uuid",
  "amount": 45.50
}
```

**Batch Request:**
```json
{
  "tips": [
    { "shift_id": "uuid", "employee_id": "uuid", "amount": 45.50 },
    { "shift_id": "uuid", "employee_id": "uuid", "amount": 38.00 }
  ]
}
```

**Response:** Created tip(s) (201 Created)

**Validation:**
- Verifies shift exists
- Verifies employee is assigned to the shift

---

## Cash Register Close

### `GET /api/sales/register-close`
List cash register closes.

**Access:** admin, manager, owner

**Query Parameters:**
- `start_date` (optional): Filter from date
- `end_date` (optional): Filter until date
- `limit` (optional): Number of records (default: 30)

**Response:**
```json
[
  {
    "id": "uuid",
    "date": "2024-04-15",
    "expected_amount": 3050.50,
    "actual_amount": 3045.00,
    "variance": -5.50,
    "notes": "Missing 5 euros in coins",
    "closed_by": "uuid",
    "created_at": "2024-04-15T23:30:00Z",
    "closed_by_employee": {
      "id": "uuid",
      "profile": {
        "full_name": "Jane Smith"
      }
    }
  }
]
```

---

### `POST /api/sales/register-close`
Create cash register close record.

**Access:** admin, manager

**Request Body:**
```json
{
  "date": "2024-04-15",
  "expected_amount": 3050.50,
  "actual_amount": 3045.00,
  "notes": "Missing 5 euros in coins",
  "closed_by": "uuid"
}
```

**Response:** Created register close (201 Created)

**Notes:**
- `variance` is calculated automatically
- Only one close per date allowed

---

### `GET /api/sales/register-close/[date]`
Get register close for specific date.

**Access:** admin, manager, owner

**Response:** Single register close object or 404

---

### `PATCH /api/sales/register-close/[date]`
Update register close for specific date.

**Access:** admin, manager

**Request Body:** (all fields optional)
```json
{
  "actual_amount": 3050.00,
  "notes": "Corrected count"
}
```

**Response:** Updated register close

**Notes:**
- `variance` is recalculated if amounts change

---

### `DELETE /api/sales/register-close/[date]`
Delete register close for specific date.

**Access:** admin only

---

## CSV Import

### `POST /api/sales/import`
Import sales data from CSV (batch upsert).

**Access:** admin, manager

**Request Body:**
```json
{
  "import_date": "2024-04-15",
  "file_name": "sales_april.csv",
  "data": [
    {
      "date": "2024-04-01",
      "food_revenue": 1200.00,
      "drinks_revenue": 800.00,
      "cocktails_revenue": 600.00,
      "desserts_revenue": 150.00,
      "other_revenue": 50.00,
      "tips": 100.00,
      "ticket_count": 75
    }
    // ... up to 365 records
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Import completed: 30 rows imported, 0 rows failed",
  "rows_imported": 30,
  "rows_failed": 0,
  "total_revenue": 91515.00,
  "errors": [],
  "import_log": {
    "id": "uuid",
    "import_date": "2024-04-15",
    "file_name": "sales_april.csv",
    "rows_imported": 30,
    "rows_failed": 0,
    "total_revenue": 91515.00,
    "imported_by": "uuid",
    "error_log": null,
    "created_at": "2024-04-15T10:00:00Z"
  }
}
```

**Status Codes:**
- 201: All rows imported successfully
- 207: Partial success (some rows failed)

---

### `GET /api/sales/import`
List import logs.

**Access:** admin, manager, owner

**Query Parameters:**
- `limit` (optional): Number of logs (default: 20)

**Response:** Array of import log objects

---

## Dashboard

### `GET /api/sales/dashboard`
Get comprehensive sales dashboard metrics.

**Access:** admin, manager, owner

**Query Parameters:**
- `date` (optional): Target date (default: today, YYYY-MM-DD)

**Response:**
```json
{
  "date": "2024-04-15",
  "today": {
    "id": "uuid",
    "date": "2024-04-15",
    "food_revenue": 1250.50,
    "drinks_revenue": 850.00,
    "cocktails_revenue": 650.00,
    "desserts_revenue": 200.00,
    "other_revenue": 100.00,
    "tips": 150.00,
    "total_revenue": 3050.50,
    "ticket_count": 85
  },
  "week": {
    "trend": [
      { "date": "2024-04-09", "total_revenue": 2800.00, ... },
      { "date": "2024-04-10", "total_revenue": 2950.00, ... }
    ],
    "totals": {
      "total_revenue": 21000.00,
      "food_revenue": 8500.00,
      "drinks_revenue": 6000.00,
      "cocktails_revenue": 4500.00,
      "desserts_revenue": 1500.00,
      "other_revenue": 500.00,
      "tips": 1000.00,
      "ticket_count": 600
    },
    "avg_ticket": 35.00,
    "days_count": 7
  },
  "month": {
    "trend": [ ... ],
    "totals": {
      "total_revenue": 85000.00,
      "ticket_count": 2400
    },
    "days_count": 30
  },
  "comparison": {
    "current_date": "2024-04-15",
    "current_revenue": 3050.50,
    "current_tickets": 85,
    "week_ago_revenue": 2900.00,
    "week_ago_tickets": 80,
    "week_variance_pct": 5.19,
    "month_ago_revenue": 2800.00,
    "month_ago_tickets": 78,
    "month_variance_pct": 8.95,
    "year_ago_revenue": 0,
    "year_ago_tickets": 0,
    "year_variance_pct": 0
  },
  "category_breakdown": {
    "amounts": {
      "food": 1250.50,
      "drinks": 850.00,
      "cocktails": 650.00,
      "desserts": 200.00,
      "other": 100.00
    },
    "percentages": {
      "food": 41.0,
      "drinks": 27.9,
      "cocktails": 21.3,
      "desserts": 6.6,
      "other": 3.3
    }
  },
  "register_close": {
    "date": "2024-04-15",
    "expected_amount": 3050.50,
    "actual_amount": 3045.00,
    "variance": -5.50
  }
}
```

---

## Top Sellers

### `GET /api/sales/top-sellers`
Get top selling items by revenue.

**Access:** admin, manager, owner

**Query Parameters:**
- `period` (optional): "daily", "weekly", "monthly", or "custom" (default: "daily")
- `start_date` (optional): Required for custom period
- `end_date` (optional): Required for custom period
- `limit` (optional): Number of items (default: 10)
- `category` (optional): Filter by category

**Response:**
```json
{
  "period": "weekly",
  "start_date": "2024-04-08",
  "end_date": "2024-04-15",
  "limit": 10,
  "category": "all",
  "top_sellers": [
    {
      "menu_item_id": "uuid",
      "item_name": "Club Sandwich",
      "category": "food",
      "total_quantity": 45,
      "total_revenue": 382.50,
      "days_sold": 7,
      "avg_unit_price": 8.50
    }
  ]
}
```

---

## Sales Comparison

### `GET /api/sales/comparison`
Get sales comparison with historical data (week/month/year ago).

**Access:** admin, manager, owner

**Query Parameters:**
- `date` (optional): Target date (default: today, YYYY-MM-DD)

**Response:**
```json
{
  "date": "2024-04-15",
  "current": {
    "revenue": 3050.50,
    "tickets": 85
  },
  "week_ago": {
    "revenue": 2900.00,
    "tickets": 80,
    "variance_pct": 5.19
  },
  "month_ago": {
    "revenue": 2800.00,
    "tickets": 78,
    "variance_pct": 8.95
  },
  "year_ago": {
    "revenue": 0,
    "tickets": 0,
    "variance_pct": 0
  }
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "details": [ /* validation errors if applicable */ ]
}
```

**Common Status Codes:**
- 200: Success
- 201: Created
- 207: Multi-Status (partial success)
- 400: Bad Request (validation error)
- 401: Unauthorized (not authenticated)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 500: Internal Server Error

---

## Frontend Integration Notes

### Date Format
- All dates use ISO 8601 format: `YYYY-MM-DD`
- All timestamps use ISO 8601 with timezone: `YYYY-MM-DDTHH:mm:ssZ`
- Database stores in UTC, display conversion to `Europe/Madrid` should happen on frontend

### Currency
- All amounts are in EUR
- Stored as `DECIMAL(10, 2)` (max 99,999,999.99)
- Display with 2 decimal places

### Realtime Updates
Consider using Supabase Realtime subscriptions for:
- `daily_sales` table (for live dashboard updates)
- `shift_tips` table (for tip tracking)
- `sales_items` table (for live top sellers)

### Recommended Query Patterns

**Dashboard on Load:**
1. `GET /api/sales/dashboard` (gets all main metrics)
2. `GET /api/sales/top-sellers?period=weekly&limit=5` (for widget)

**Daily Sales Entry:**
1. `POST /api/sales/daily` (upsert daily totals)
2. `POST /api/sales/items` (batch insert item details)

**End of Day:**
1. `POST /api/sales/register-close` (record cash count)
2. `GET /api/sales/comparison?date=YYYY-MM-DD` (show performance)

---

## Database Functions Used

The following PostgreSQL functions are used by these routes:
- `get_sales_comparison(target_date DATE)` - Historical comparison logic
- `get_top_sellers(start_date DATE, end_date DATE, limit_count INTEGER)` - Top sellers query
- `get_ticket_average(start_date DATE, end_date DATE)` - Average ticket calculation

These are defined in migration `008_pos_sales_enhancements.sql`.
