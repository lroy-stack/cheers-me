# Menu & Kitchen API Routes - Implementation Summary

**Date:** 2026-02-06
**Module:** M3 - Menu & Kitchen Management
**Phase:** Foundation
**Status:** ✅ COMPLETED

## Overview

Implemented comprehensive API route handlers for the Menu & Kitchen Management module. All routes follow Next.js 15 App Router patterns with proper authentication, authorization, validation, and error handling.

---

## Routes Implemented

### 1. Menu Categories

#### `GET /api/menu/categories`
- **Access:** Public
- **Description:** List all menu categories ordered by sort_order
- **Returns:** Array of menu categories

#### `POST /api/menu/categories`
- **Access:** Admin, Manager
- **Description:** Create a new menu category
- **Body:**
  ```json
  {
    "name_en": "Breakfast",
    "name_nl": "Ontbijt",
    "name_es": "Desayuno",
    "sort_order": 1
  }
  ```

#### `GET /api/menu/categories/[id]`
- **Access:** Public
- **Description:** Get a single menu category
- **Returns:** Menu category object

#### `PUT /api/menu/categories/[id]`
- **Access:** Admin, Manager
- **Description:** Update a menu category
- **Body:** Any subset of category fields

#### `DELETE /api/menu/categories/[id]`
- **Access:** Admin, Manager
- **Description:** Delete a menu category
- **Notes:** Will fail if category has menu items (FK constraint)

---

### 2. Menu Items

#### `GET /api/menu/items`
- **Access:** Public (available items only unless authenticated)
- **Query Params:**
  - `category_id` - Filter by category UUID
  - `available=true` - Show only available items
  - `include_allergens=true` - Include allergens array
- **Returns:** Array of menu items with category relation

#### `POST /api/menu/items`
- **Access:** Admin, Manager
- **Description:** Create a new menu item
- **Body:**
  ```json
  {
    "category_id": "uuid",
    "name_en": "Club Sandwich",
    "name_nl": "Club Sandwich",
    "name_es": "Sándwich Club",
    "description_en": "Triple-decker with chicken, bacon, lettuce, tomato",
    "price": 12.50,
    "cost_of_goods": 4.20,
    "photo_url": "https://...",
    "prep_time_minutes": 15,
    "available": true,
    "sort_order": 10,
    "allergens": ["gluten", "eggs"]
  }
  ```
- **Notes:** Allergens are automatically inserted into `menu_allergens` table

#### `GET /api/menu/items/[id]`
- **Access:** Public
- **Description:** Get a single menu item with allergens
- **Returns:** Menu item with category relation and allergens array

#### `PUT /api/menu/items/[id]`
- **Access:** Admin, Manager
- **Description:** Update a menu item
- **Body:** Any subset of item fields (including allergens)
- **Notes:** Allergens are replaced (delete old, insert new)

#### `DELETE /api/menu/items/[id]`
- **Access:** Admin, Manager
- **Description:** Delete a menu item
- **Notes:** Allergens cascade delete automatically

---

### 3. Daily Specials

#### `GET /api/menu/daily-specials`
- **Access:** Public
- **Query Params:**
  - `date=YYYY-MM-DD` - Filter by date (defaults to today)
- **Returns:** Array of daily specials with optional menu_item relation

#### `POST /api/menu/daily-specials`
- **Access:** Admin, Manager
- **Description:** Create a daily special
- **Body:**
  ```json
  {
    "date": "2026-02-15",
    "menu_item_id": "uuid",  // OR custom fields below
    "name_en": "Chef's Special Paella",
    "description_en": "Seafood paella with saffron rice",
    "price": 18.00
  }
  ```
- **Notes:** Either `menu_item_id` OR custom name/price must be provided

#### `DELETE /api/menu/daily-specials?date=YYYY-MM-DD`
- **Access:** Admin, Manager
- **Description:** Delete a daily special by date
- **Query Params:** `date` (required)

---

### 4. Kitchen Orders (KDS)

#### `GET /api/kitchen/orders`
- **Access:** Admin, Manager, Kitchen, Waiter
- **Query Params:**
  - `status=pending|in_progress|ready|served|cancelled`
  - `table_id=uuid` - Filter by table
  - `active=true` - Show only pending/in_progress orders
- **Returns:** Array of orders with table, waiter, and items relations

#### `POST /api/kitchen/orders`
- **Access:** Admin, Manager, Kitchen, Waiter
- **Description:** Create a new kitchen order
- **Body:**
  ```json
  {
    "table_id": "uuid",
    "waiter_id": "uuid",
    "items": [
      {
        "menu_item_id": "uuid",
        "quantity": 2,
        "notes": "No onions"
      }
    ]
  }
  ```
- **Notes:** Auto-generates ticket number format: `KO-YYYYMMDD-NNNN`

#### `GET /api/kitchen/orders/[id]`
- **Access:** Admin, Manager, Kitchen, Waiter
- **Description:** Get a single kitchen order with items
- **Returns:** Order with full relations

#### `PUT /api/kitchen/orders/[id]`
- **Access:** Admin, Manager, Kitchen
- **Description:** Update kitchen order status
- **Body:**
  ```json
  {
    "status": "in_progress"  // or "ready", "served", "cancelled"
  }
  ```
- **Notes:**
  - Auto-sets `started_at` when status → in_progress
  - Auto-sets `completed_at` when status → ready/served
  - Updates all order items to match status

#### `DELETE /api/kitchen/orders/[id]`
- **Access:** Admin, Manager, Kitchen
- **Description:** Cancel a kitchen order
- **Notes:** Soft delete (sets status to 'cancelled')

---

### 5. Tables

#### `GET /api/tables`
- **Access:** Admin, Manager, Waiter, Kitchen, Bar
- **Query Params:**
  - `status=available|occupied|reserved|cleaning`
  - `section=string` - Filter by section
- **Returns:** Array of tables ordered by table_number

#### `POST /api/tables`
- **Access:** Admin, Manager
- **Description:** Create a new table
- **Body:**
  ```json
  {
    "table_number": "A1",
    "capacity": 4,
    "section": "Terrace",
    "x_position": 100.5,
    "y_position": 200.0,
    "status": "available"
  }
  ```

#### `PUT /api/tables` (Bulk Update)
- **Access:** Admin, Manager
- **Description:** Bulk update tables (for floor plan editor)
- **Body:** Array of table updates
  ```json
  [
    { "id": "uuid", "x_position": 150, "y_position": 220 },
    { "id": "uuid", "status": "occupied" }
  ]
  ```

#### `GET /api/tables/[id]`
- **Access:** Admin, Manager, Waiter, Kitchen, Bar
- **Description:** Get a single table
- **Returns:** Table object

#### `PUT /api/tables/[id]`
- **Access:** Admin, Manager
- **Description:** Update a single table
- **Body:** Any subset of table fields
- **Validation:** Ensures unique table_number

#### `DELETE /api/tables/[id]`
- **Access:** Admin, Manager
- **Description:** Delete a table
- **Validation:** Blocks deletion if table has active reservations or orders

---

### 6. QR Code Generator

#### `POST /api/tables/qr-code`
- **Access:** Admin, Manager
- **Description:** Generate QR code URL for a table's digital menu
- **Body:**
  ```json
  {
    "table_id": "uuid",
    "base_url": "https://app.cheersmallorca.com"  // optional
  }
  ```
- **Returns:**
  ```json
  {
    "success": true,
    "table_id": "uuid",
    "table_number": "A1",
    "qr_code_url": "https://quickchart.io/qr?text=...",
    "menu_url": "https://app.cheersmallorca.com/menu?table=A1"
  }
  ```

#### `GET /api/tables/qr-code`
- **Access:** Admin, Manager
- **Description:** Bulk generate QR codes for all tables
- **Returns:**
  ```json
  {
    "success": true,
    "total": 20,
    "generated": 15,
    "errors": 0,
    "results": [...]
  }
  ```

---

## Technical Implementation

### Authentication & Authorization

All routes use the `requireRole()` helper from `@/lib/utils/auth.ts`:

```typescript
const authResult = await requireRole(['admin', 'manager'])

if ('error' in authResult) {
  return NextResponse.json(
    { error: authResult.error },
    { status: authResult.status }
  )
}
```

**Role Permissions:**
- **Public:** Menu categories, menu items (available only), daily specials (read)
- **Kitchen/Waiter:** Kitchen orders (read/create), tables (read)
- **Manager/Admin:** Full CRUD on all menu, kitchen, and table resources

### Validation

All routes use **Zod** schemas for request body validation:

```typescript
const validation = createMenuItemSchema.safeParse(body)
if (!validation.success) {
  return NextResponse.json(
    {
      error: 'Validation failed',
      details: validation.error.errors,
    },
    { status: 400 }
  )
}
```

### Error Handling

- `400` - Bad request (validation errors, business rule violations)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (authenticated but insufficient role)
- `404` - Not found (resource doesn't exist)
- `500` - Internal server error (database/unexpected errors)

### Database Patterns

1. **Supabase Server Client:**
   ```typescript
   const supabase = await createClient()
   ```

2. **Relations via `.select()`:**
   ```typescript
   .select(`
     *,
     category:menu_categories(id, name_en, name_nl, name_es)
   `)
   ```

3. **Cascade Operations:**
   - Menu allergens handled manually (delete old, insert new)
   - Kitchen order items update with parent status
   - Table QR codes stored in `tables.qr_code_url`

4. **Auto-generated Fields:**
   - Kitchen order ticket numbers: `KO-YYYYMMDD-NNNN`
   - Timestamps for order tracking (`started_at`, `completed_at`)

---

## Database Views Used

### `v_active_kitchen_orders`
Real-time view for KDS display showing:
- Order details with ticket number
- Table information
- Waiter name
- Individual items with menu details
- Prep times and status

### `v_menu_items_with_allergens`
Complete menu view with:
- Multi-language category names
- Menu items with all translations
- Allergens as array
- Margin percentage calculation

---

## QR Code Implementation

Uses **quickchart.io** free API to generate QR codes:

```
https://quickchart.io/qr?text={menuUrl}&size=300&margin=2
```

- No API key required
- Generates link to `/menu?table={table_number}`
- Stored in `tables.qr_code_url`
- Can bulk-generate for all tables

---

## Realtime Support

For Kitchen Display System (KDS), enable realtime via Supabase dashboard:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE kitchen_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE kitchen_order_items;
```

Frontend can then subscribe to changes:

```typescript
supabase
  .channel('kitchen_orders')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_orders' }, payload => {
    // Update UI
  })
  .subscribe()
```

---

## Testing Notes

### Example Requests

**Create Menu Item:**
```bash
curl -X POST http://localhost:3000/api/menu/items \
  -H "Content-Type: application/json" \
  -H "Cookie: ..." \
  -d '{
    "category_id": "uuid",
    "name_en": "Burger",
    "price": 10.50,
    "allergens": ["gluten", "eggs"]
  }'
```

**Create Kitchen Order:**
```bash
curl -X POST http://localhost:3000/api/kitchen/orders \
  -H "Content-Type: application/json" \
  -d '{
    "table_id": "uuid",
    "items": [
      {"menu_item_id": "uuid", "quantity": 2}
    ]
  }'
```

**Update Order Status:**
```bash
curl -X PUT http://localhost:3000/api/kitchen/orders/{id} \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'
```

### Integration Tests

Recommended test coverage:
- ✅ Create menu item with allergens → verify allergens table
- ✅ Update menu item allergens → verify old deleted, new inserted
- ✅ Create kitchen order → verify ticket number format
- ✅ Update order to "ready" → verify completed_at set
- ✅ Generate QR code → verify URL format
- ✅ Delete table with active orders → verify blocked

---

## Frontend Integration Points

### Menu Builder
- `GET /api/menu/categories` - List categories
- `GET /api/menu/items?category_id=X` - List items by category
- `POST /api/menu/items` - Create item with photo upload (use Supabase Storage)
- `PUT /api/menu/items/[id]` - Update availability, price, allergens

### Digital Menu
- `GET /api/menu/categories` - Load categories
- `GET /api/menu/items?available=true&include_allergens=true` - Display menu
- `GET /api/menu/daily-specials?date=today` - Show daily special

### Kitchen Display System (KDS)
- `GET /api/kitchen/orders?active=true` - Load active orders
- Realtime subscription to `kitchen_orders` table
- `PUT /api/kitchen/orders/[id]` - Update status (pending → in_progress → ready)

### Table Management
- `GET /api/tables` - Floor plan display
- `PUT /api/tables` - Bulk update positions (drag-and-drop)
- `GET /api/tables/qr-code` - Generate all QR codes for printing

---

## Next Steps for Frontend Agent

1. **Menu Builder UI:**
   - Category list with drag-to-reorder
   - Menu item CRUD forms with image upload
   - Allergen multi-select checkboxes (14 EU allergens)
   - Price and margin calculator

2. **Digital Menu UI:**
   - Public route at `/menu?table=X`
   - Category tabs/sections
   - Item cards with photo, price, allergens icons
   - Multi-language toggle (EN/NL/ES)

3. **Kitchen Display System:**
   - Realtime order cards sorted by created_at
   - Status badges (pending/in_progress/ready)
   - Timer showing elapsed time since order created
   - Tap to change status
   - Audio alert on new order

4. **Table Management:**
   - Interactive floor plan editor
   - Drag tables to position
   - Status indicators (available/occupied/reserved)
   - QR code download/print button

---

## Files Created

```
src/app/api/menu/
├── categories/
│   ├── route.ts              # GET, POST
│   └── [id]/route.ts         # GET, PUT, DELETE
├── items/
│   ├── route.ts              # GET, POST
│   └── [id]/route.ts         # GET, PUT, DELETE
└── daily-specials/
    └── route.ts              # GET, POST, DELETE

src/app/api/kitchen/
└── orders/
    ├── route.ts              # GET, POST
    └── [id]/route.ts         # GET, PUT, DELETE

src/app/api/tables/
├── route.ts                  # GET, POST, PUT (bulk)
├── [id]/route.ts             # GET, PUT, DELETE
└── qr-code/route.ts          # POST, GET (bulk)
```

**Total:** 10 route files implementing 28 API endpoints

---

## Completion Checklist

- ✅ Menu categories CRUD
- ✅ Menu items CRUD with allergen support
- ✅ Daily specials management
- ✅ Kitchen orders creation and status updates
- ✅ Table management with floor plan support
- ✅ QR code generation for digital menu
- ✅ Role-based access control
- ✅ Request validation with Zod
- ✅ Proper error handling
- ✅ Multi-language support (EN/NL/ES)
- ✅ Ticket number auto-generation
- ✅ Timestamp auto-tracking
- ✅ Realtime-ready structure

---

**Status:** All Menu & Kitchen API routes implemented and ready for frontend integration.

**Recommendations:**
1. Add integration tests for critical flows
2. Set up Supabase realtime for KDS
3. Configure Supabase Storage bucket for menu item photos
4. Generate TypeScript types: `pnpm run db:types`
