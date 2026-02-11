# Menu & Kitchen Management — Database Schema Documentation

**Version:** 0.1.0
**Module:** M3 - Menu & Kitchen Management
**Phase:** Foundation (Phase 1)
**Status:** ✅ Complete

---

## OVERVIEW

The Menu & Kitchen Management schema supports:
- Multi-language menu management (EN/NL/ES)
- EU allergen tracking (14 mandatory allergens)
- Daily specials and seasonal menu activation
- Kitchen Display System (KDS) with real-time order tracking
- Food cost and margin calculations
- QR code menu per table

---

## DATABASE TABLES

### 1. `menu_categories`

Predefined menu categories with multi-language support.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name_en` | VARCHAR(100) | Category name in English |
| `name_nl` | VARCHAR(100) | Category name in Dutch |
| `name_es` | VARCHAR(100) | Category name in Spanish |
| `sort_order` | INTEGER | Display order (1-6) |
| `created_at` | TIMESTAMPTZ | Auto-timestamp |
| `updated_at` | TIMESTAMPTZ | Auto-timestamp |

**Seeded Categories:**
1. Breakfast / Ontbijt / Desayuno
2. Lunch / Lunch / Almuerzo
3. Dinner / Diner / Cena
4. Drinks / Dranken / Bebidas
5. Cocktails / Cocktails / Cócteles
6. Desserts / Desserts / Postres

**RLS:** Public read (no authentication required for digital menu)

---

### 2. `menu_items`

Individual menu items with pricing, descriptions, and availability.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `category_id` | UUID | FK to menu_categories |
| `name_en` | VARCHAR(255) | Item name in English |
| `name_nl` | VARCHAR(255) | Item name in Dutch |
| `name_es` | VARCHAR(255) | Item name in Spanish |
| `description_en` | TEXT | Description in English |
| `description_nl` | TEXT | Description in Dutch |
| `description_es` | TEXT | Description in Spanish |
| `price` | DECIMAL(10,2) | Sale price in EUR |
| `cost_of_goods` | DECIMAL(10,2) | Ingredient cost for margin calc |
| `photo_url` | TEXT | URL to dish photo (Supabase Storage) |
| `prep_time_minutes` | INTEGER | Expected preparation time |
| `available` | BOOLEAN | Currently available (true/false) |
| `sort_order` | INTEGER | Display order within category |
| `created_at` | TIMESTAMPTZ | Auto-timestamp |
| `updated_at` | TIMESTAMPTZ | Auto-timestamp |

**Indexes:**
- `idx_menu_items_category_id` on `category_id`

**RLS:** Public read

**View:** `v_menu_items_with_allergens` — Includes allergen array and margin percentage

---

### 3. `menu_allergens`

Junction table linking menu items to EU mandatory allergens.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `menu_item_id` | UUID | FK to menu_items |
| `allergen` | ENUM allergen_type | One of 14 EU allergens |
| `created_at` | TIMESTAMPTZ | Auto-timestamp |

**Constraint:** UNIQUE(menu_item_id, allergen)

**Allergen Types (allergen_type ENUM):**
- celery
- crustaceans
- eggs
- fish
- gluten
- lupin
- milk
- molluscs
- mustard
- nuts
- peanuts
- sesame
- soy
- sulfites

---

### 4. `menu_ingredients`

Ingredient list for each menu item (used for cost calculation).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `menu_item_id` | UUID | FK to menu_items |
| `ingredient_name` | VARCHAR(255) | Ingredient name |
| `quantity` | DECIMAL(10,2) | Amount used |
| `unit` | VARCHAR(50) | Unit (g, ml, pcs, etc.) |
| `created_at` | TIMESTAMPTZ | Auto-timestamp |

**Note:** Link to `products` table for cost tracking (via product name match or separate FK)

---

### 5. `daily_specials`

Override menu items for specific dates.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `menu_item_id` | UUID | FK to menu_items (optional) |
| `date` | DATE | Special date (UNIQUE) |
| `name_en` | VARCHAR(255) | Special item name override |
| `description_en` | TEXT | Special item description override |
| `price` | DECIMAL(10,2) | Special price override |
| `created_at` | TIMESTAMPTZ | Auto-timestamp |

**Use Case:** Daily fish special, seasonal dishes

---

### 6. `menu_activations`

Date range activation for seasonal menu transitions (e.g., tapas → international).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `menu_item_id` | UUID | FK to menu_items |
| `start_date` | DATE | Activation start date |
| `end_date` | DATE | Activation end date |
| `active` | BOOLEAN | Is activation active |
| `created_at` | TIMESTAMPTZ | Auto-timestamp |
| `updated_at` | TIMESTAMPTZ | Auto-timestamp |

**Use Case:** Hide tapas menu after May 31, show international menu starting June 1

---

### 7. `tables`

Restaurant table configuration with QR code support.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `table_number` | VARCHAR(50) | Table identifier (e.g., "T1", "BAR-3") |
| `capacity` | INTEGER | Number of seats |
| `section` | VARCHAR(100) | Area (e.g., "Terrace", "Indoor") |
| `x_position` | DECIMAL(10,2) | X coordinate for floor plan |
| `y_position` | DECIMAL(10,2) | Y coordinate for floor plan |
| `status` | ENUM table_status | available, occupied, reserved, cleaning |
| `qr_code_url` | TEXT | URL to QR code PNG (links to digital menu) |
| `created_at` | TIMESTAMPTZ | Auto-timestamp |
| `updated_at` | TIMESTAMPTZ | Auto-timestamp |

**Constraint:** UNIQUE(table_number)

**QR Code Format:**
```
https://app.cheersmallorca.com/menu/table/{table_id}?lang=en
```

---

### 8. `kitchen_orders`

Orders sent to kitchen for preparation (KDS).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `ticket_number` | VARCHAR(50) | Unique order ticket (e.g., "K001") |
| `table_id` | UUID | FK to tables (nullable for takeout) |
| `waiter_id` | UUID | FK to employees (who placed order) |
| `status` | ENUM order_status | pending, in_progress, ready, served, cancelled |
| `created_at` | TIMESTAMPTZ | Order received time |
| `started_at` | TIMESTAMPTZ | Kitchen started preparing |
| `completed_at` | TIMESTAMPTZ | Order ready time |
| `prep_duration_seconds` | INTEGER | Auto-calculated prep time |
| `updated_at` | TIMESTAMPTZ | Auto-timestamp |

**Indexes:**
- `idx_kitchen_orders_created_at`
- `idx_kitchen_orders_status`
- `idx_kitchen_orders_waiter_id`

**RLS:** Kitchen staff, waiters, managers can read/write

**Realtime:** ✅ Enable via `ALTER PUBLICATION supabase_realtime ADD TABLE kitchen_orders;`

**Trigger:** `update_kitchen_order_prep_duration()` — Auto-calculates `prep_duration_seconds` when status changes to 'ready'

---

### 9. `kitchen_order_items`

Line items within a kitchen order.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `kitchen_order_id` | UUID | FK to kitchen_orders |
| `menu_item_id` | UUID | FK to menu_items |
| `quantity` | INTEGER | Number of items |
| `notes` | TEXT | Special instructions (e.g., "no onions") |
| `status` | ENUM order_status | pending, in_progress, ready, served, cancelled |
| `created_at` | TIMESTAMPTZ | Auto-timestamp |
| `completed_at` | TIMESTAMPTZ | Item ready time |
| `updated_at` | TIMESTAMPTZ | Auto-timestamp |

**RLS:** Same as kitchen_orders

**Realtime:** ✅ Enable via `ALTER PUBLICATION supabase_realtime ADD TABLE kitchen_order_items;`

---

## VIEWS

### `v_active_kitchen_orders`

Real-time view of active kitchen orders for KDS display.

**Returns:**
- Order details (ticket_number, table_number, waiter_name)
- Item details (item names in EN/NL/ES, quantity, notes)
- Timing data (created_at, started_at, expected_prep_time)
- Status for both order and individual items

**Filter:** Only shows orders with status IN ('pending', 'in_progress')

**Use Case:** Display on Kitchen Display System (KDS) screen

---

### `v_menu_items_with_allergens`

Complete menu view with allergen arrays and margin calculations.

**Returns:**
- All menu item fields
- Category names in all languages
- Allergens as array (e.g., `{gluten,milk,eggs}`)
- Calculated margin percentage: `((price - cost_of_goods) / price) * 100`

**Use Case:**
- Digital menu display
- Menu builder UI
- Cost analysis dashboard

---

## ENUMS

### `order_status`
```sql
'pending'      -- Order received, not started
'in_progress'  -- Kitchen is preparing
'ready'        -- Ready for pickup/serving
'served'       -- Delivered to customer
'cancelled'    -- Order cancelled
```

### `table_status`
```sql
'available'    -- Free for seating
'occupied'     -- Currently in use
'reserved'     -- Reserved for upcoming guest
'cleaning'     -- Being cleaned after use
```

### `allergen_type`
```sql
'celery', 'crustaceans', 'eggs', 'fish', 'gluten', 'lupin', 'milk',
'molluscs', 'mustard', 'nuts', 'peanuts', 'sesame', 'soy', 'sulfites'
```

---

## ROW LEVEL SECURITY (RLS)

### Menu Data (Public Access)
- `menu_categories`: Public read
- `menu_items`: Public read
- `menu_allergens`: Implicit public read (accessed via menu_items)
- `menu_ingredients`: Implicit public read (accessed via menu_items)

### Operational Data (Staff Only)
- `kitchen_orders`: Kitchen, waiters, managers (SELECT, INSERT, UPDATE)
- `kitchen_order_items`: Kitchen, waiters, managers (SELECT, INSERT, UPDATE)
- `daily_specials`: Managers only (CRUD)
- `menu_activations`: Managers only (CRUD)

**Important:** RLS is ENABLED on all tables. Policies restrict access by user role (read from `profiles.role`).

---

## REALTIME CONFIGURATION

For Kitchen Display System (KDS) to work, enable Supabase Realtime on:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE kitchen_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE kitchen_order_items;
```

**Note:** These commands require superuser access. Run via Supabase Dashboard SQL Editor or `supabase db push`.

**Frontend:** Subscribe to changes using `@supabase/supabase-js`:

```typescript
// Example: Listen to new kitchen orders
const channel = supabase
  .channel('kitchen-orders')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'kitchen_orders' },
    (payload) => {
      console.log('New order:', payload.new)
    }
  )
  .subscribe()
```

---

## FOOD COST CALCULATION

**Formula:**
```
Margin % = ((price - cost_of_goods) / price) * 100
```

**Example:**
- Burger sells for €12.00
- Ingredients cost €3.60
- Margin = ((12 - 3.6) / 12) * 100 = 70%
- Food cost ratio = 30%

**Target Ratios (per spec):**
- Food cost ratio: <30%
- Beverage cost ratio: <22%

---

## QR CODE IMPLEMENTATION

### 1. Generate QR Code per Table
- Use library: `qrcode` (npm) or `qrcode.react` for React component
- URL format: `https://app.cheersmallorca.com/menu/table/{table_id}?lang=en`
- Store generated PNG in Supabase Storage
- Save URL in `tables.qr_code_url`

### 2. Digital Menu Route
```
/menu/table/[table_id]
```
- Read `table_id` from URL
- Display menu filtered by availability
- Support language switcher (EN/NL/ES)
- Show allergen icons
- Public route (no auth required)

---

## FRONTEND INTEGRATION NOTES

### API Routes Needed

**Menu Management (Admin/Manager):**
- `GET /api/menu/categories` — List all categories
- `GET /api/menu/items` — List all items (with filters)
- `POST /api/menu/items` — Create new menu item
- `PUT /api/menu/items/[id]` — Update menu item
- `DELETE /api/menu/items/[id]` — Delete menu item
- `POST /api/menu/items/[id]/allergens` — Add allergen
- `POST /api/menu/items/[id]/toggle-availability` — Toggle available flag

**Daily Specials:**
- `GET /api/menu/specials?date=2026-06-15` — Get special for date
- `POST /api/menu/specials` — Create daily special
- `PUT /api/menu/specials/[id]` — Update special
- `DELETE /api/menu/specials/[id]` — Delete special

**KDS (Kitchen Staff):**
- `GET /api/kitchen/orders/active` — Get active orders (pending + in_progress)
- `PUT /api/kitchen/orders/[id]/status` — Update order status
- `PUT /api/kitchen/orders/items/[id]/status` — Update item status

**Digital Menu (Public):**
- `GET /api/menu/public?lang=en&table_id=xxx` — Public menu view
- `GET /api/menu/public/[item_id]` — Single item detail

### UI Components Needed

**Menu Builder:**
- Multi-language form inputs (tabs for EN/NL/ES)
- Allergen multi-select with icons
- Ingredient list editor
- Photo upload (Supabase Storage)
- Drag-and-drop category/item reordering

**Kitchen Display System (KDS):**
- Real-time order cards with timer
- Status update buttons (Start → Ready → Served)
- Sound notification on new order
- Filter by status
- Order history view

**Digital Menu:**
- Category tabs
- Item cards with photo, price, allergens
- Language switcher
- Table number display
- "Call Waiter" button (optional)

---

## MIGRATION STATUS

| File | Status | Description |
|------|--------|-------------|
| `001_initial_schema.sql` | ✅ Complete | Core tables and RLS |
| `004_menu_kitchen_enhancements.sql` | ✅ Complete | QR codes, multi-lang categories, KDS enhancements |

**Total:** 9 tables, 3 views, 2 triggers, 14 allergen types

---

## NEXT STEPS FOR FRONTEND AGENT

1. **Create API Routes:** Start with `GET /api/menu/categories` and `GET /api/menu/items`
2. **Menu Builder UI:** Build admin interface for CRUD operations on menu items
3. **Digital Menu Page:** Create public `/menu/table/[table_id]` route
4. **KDS Page:** Build real-time kitchen display with Supabase subscription
5. **QR Code Generator:** Implement QR code generation and storage per table
6. **Allergen Icons:** Add EU allergen icon set to `/public/icons/allergens/`
7. **Tests:** Write integration tests for API routes and E2E tests for menu builder

---

## TESTING CHECKLIST

- [ ] Create menu category
- [ ] Create menu item with allergens
- [ ] Add daily special
- [ ] Activate/deactivate menu item by date range
- [ ] Generate QR code for table
- [ ] Create kitchen order
- [ ] Update order status (pending → in_progress → ready)
- [ ] Subscribe to realtime updates on KDS
- [ ] Calculate food cost margin
- [ ] Public menu loads without authentication

---

**End of Documentation**
