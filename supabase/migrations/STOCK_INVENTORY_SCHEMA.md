# Stock & Inventory Module — Database Schema Documentation

**Module:** M4 - Stock & Inventory
**Status:** ✅ Schema Complete
**Migration Files:** `001_initial_schema.sql`, `006_stock_inventory_enhancements.sql`

---

## Overview

The Stock & Inventory module provides comprehensive inventory management for GrandCafe Cheers, including:
- Product inventory tracking (food, drink, supplies, beer)
- 22 craft beer keg management with liters remaining
- Automatic low-stock alerts
- Stock movements (in/out/adjustment/waste)
- Waste logging with categorized reasons
- Supplier management
- Purchase order generation
- Stock take (physical count vs system)

---

## Tables

### 1. `products`
Primary inventory table for all products.

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category product_category NOT NULL,  -- 'food' | 'drink' | 'supplies' | 'beer'
  unit VARCHAR(50) NOT NULL,           -- 'kg', 'liters', 'units', etc.
  current_stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
  min_stock DECIMAL(10, 2),            -- Alert threshold
  max_stock DECIMAL(10, 2),            -- Overstock indicator
  cost_per_unit DECIMAL(10, 2),
  supplier_id UUID REFERENCES suppliers,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Features:**
- `category` uses enum: `food`, `drink`, `supplies`, `beer`
- Auto-alerts when `current_stock < min_stock`
- Includes 22 craft beers seeded by default

**RLS Policies:**
- SELECT: kitchen, bar, managers
- INSERT/UPDATE: managers only
- DELETE: admins only

---

### 2. `stock_movements`
Immutable log of all stock changes.

```sql
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products,
  movement_type stock_movement_type NOT NULL,  -- 'in' | 'out' | 'adjustment' | 'waste'
  quantity DECIMAL(10, 2) NOT NULL,
  reason TEXT,
  recorded_by UUID REFERENCES employees,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Triggers:**
- Automatically updates `products.current_stock` based on movement type
- Creates/resolves stock alerts via `check_low_stock_alert()`

**RLS Policies:**
- SELECT: kitchen, bar, managers
- INSERT: kitchen, bar, managers
- DELETE: admins only (for error correction)
- **No UPDATE** — movements are immutable

---

### 3. `kegs`
Tracks 22 craft beer kegs with liters remaining.

```sql
CREATE TABLE kegs (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products,
  keg_size_liters DECIMAL(10, 2) NOT NULL DEFAULT 20,  -- 20L, 30L, 50L
  current_liters DECIMAL(10, 2) NOT NULL,
  initial_liters DECIMAL(10, 2) NOT NULL,
  tapped_at TIMESTAMPTZ DEFAULT NOW(),
  emptied_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'active',  -- 'active' | 'empty' | 'removed'
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Key Features:**
- Tracks liters remaining per keg
- Auto-alerts when keg < 20% full
- Auto-marks as `empty` when depleted
- Standard keg sizes: 20L (1/6 barrel), 30L (Cornelius), 50L (standard)

**Triggers:**
- `check_beer_keg_alert()` runs on insert/update
- Auto-updates `updated_at`

**RLS Policies:**
- SELECT: bar, kitchen, managers
- INSERT/UPDATE: bar, managers
- DELETE: managers only

---

### 4. `stock_alerts`
Automatic alerts for inventory issues.

```sql
CREATE TABLE stock_alerts (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products,
  alert_type VARCHAR(50) NOT NULL,  -- 'low_stock' | 'out_of_stock' | 'beer_low' | 'expiring_soon'
  threshold_value DECIMAL(10, 2),
  current_value DECIMAL(10, 2),
  message TEXT NOT NULL,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Alert Types:**
- `low_stock`: Product below `min_stock`
- `out_of_stock`: Product at 0
- `beer_low`: Keg below 20% remaining
- `expiring_soon`: (future feature)

**Auto-generation:**
- Triggered on `products.current_stock` updates
- Triggered on `kegs.current_liters` updates
- Auto-resolves when stock replenished

**RLS Policies:**
- SELECT: kitchen, bar, managers
- INSERT: system functions only
- UPDATE: managers (for manual resolution)

---

### 5. `waste_logs`
Tracks product waste with categorized reasons.

```sql
CREATE TABLE waste_logs (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products,
  quantity DECIMAL(10, 2) NOT NULL,
  reason waste_reason NOT NULL,  -- 'expired' | 'damaged' | 'overproduction' | 'spoiled' | 'customer_return' | 'other'
  notes TEXT,
  recorded_by UUID REFERENCES employees,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Waste Reasons (enum):**
- `expired`: Past expiration date
- `damaged`: Broken/damaged packaging
- `overproduction`: Prepared too much
- `spoiled`: Went bad before use
- `customer_return`: Returned by customer
- `other`: Other reasons (requires notes)

**RLS Policies:**
- SELECT: kitchen, bar, managers
- INSERT: kitchen, bar, managers
- DELETE: managers only

---

### 6. `stock_takes`
Physical inventory counts vs system counts.

```sql
CREATE TABLE stock_takes (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products,
  physical_count DECIMAL(10, 2) NOT NULL,
  system_count DECIMAL(10, 2) NOT NULL,
  variance DECIMAL(10, 2),              -- physical_count - system_count
  recorded_by UUID REFERENCES employees,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Usage:**
- Periodic inventory audits
- Variance report for discrepancy tracking
- Helps identify theft, spoilage, or data entry errors

**RLS Policies:**
- SELECT: kitchen, bar, managers
- INSERT/UPDATE/DELETE: managers only

---

### 7. `purchase_orders`
Supplier orders for restocking.

```sql
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers,
  order_date DATE NOT NULL,
  expected_delivery_date DATE,
  status VARCHAR(50) DEFAULT 'pending',  -- 'pending' | 'confirmed' | 'delivered' | 'cancelled'
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**RLS Policies:**
- All CRUD: managers only
- DELETE: admins only

---

### 8. `purchase_order_items`
Line items for purchase orders.

```sql
CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders,
  product_id UUID NOT NULL REFERENCES products,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(10, 2),
  received_quantity DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Features:**
- `received_quantity` tracks partial deliveries
- Used for auto-generating reorder quantities based on consumption rate

**RLS Policies:**
- All CRUD: managers only
- DELETE: admins only

---

### 9. `suppliers`
Supplier contact information.

```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  payment_terms VARCHAR(255),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**RLS Policies:**
- SELECT: kitchen, bar, managers
- INSERT/UPDATE: managers only
- DELETE: admins only

---

## Enums

### `product_category`
```sql
'food' | 'drink' | 'supplies' | 'beer'
```

### `stock_movement_type`
```sql
'in' | 'out' | 'adjustment' | 'waste'
```

### `waste_reason`
```sql
'expired' | 'damaged' | 'overproduction' | 'spoiled' | 'customer_return' | 'other'
```

---

## Functions

### `check_low_stock_alert(p_product_id UUID)`
**Purpose:** Creates or resolves stock alerts based on current inventory levels.

**Triggers:**
- Runs after `products.current_stock` updates
- Creates `low_stock` alert when `current_stock < min_stock`
- Creates `out_of_stock` alert when `current_stock <= 0`
- Auto-resolves alerts when restocked

**SECURITY:** `SECURITY DEFINER` (bypasses RLS)

---

### `check_beer_keg_alert(p_keg_id UUID)`
**Purpose:** Monitors beer keg levels and creates alerts when below 20%.

**Triggers:**
- Runs after `kegs.current_liters` updates
- Creates `beer_low` alert when keg < 20% full
- Auto-marks keg as `empty` when depleted

**SECURITY:** `SECURITY DEFINER` (bypasses RLS)

---

### `update_product_stock()`
**Purpose:** Automatically updates `products.current_stock` when stock movements are logged.

**Logic:**
- `'in'` → increases stock
- `'out'` → decreases stock
- `'waste'` → decreases stock
- `'adjustment'` → adds adjustment value (can be negative)

**Triggers:** After INSERT on `stock_movements`

---

## Views

### `v_stock_levels`
Complete stock overview with status indicators.

**Columns:**
- Product details (id, name, category, unit)
- Stock levels (current, min, max)
- Stock value (current_stock × cost_per_unit)
- Supplier info
- `stock_status`: `'out_of_stock'` | `'low_stock'` | `'overstock'` | `'ok'`
- `active_alerts`: Count of unresolved alerts

**Order:** Critical items first (out of stock → low stock → ok)

---

### `v_active_kegs`
Real-time view of beer kegs on tap.

**Columns:**
- Beer name
- Keg size and current liters
- Percent remaining
- Days on tap
- `keg_status`: `'empty'` | `'critical'` | `'low'` | `'ok'`

**Order:** Critical kegs first

---

### `v_recent_stock_movements`
Last 30 days of stock movements with details.

**Columns:**
- Product name and category
- Movement type and quantity
- Recorded by (employee name)
- Timestamp

---

### `v_unresolved_alerts`
Active alerts requiring attention.

**Columns:**
- Product name
- Alert type
- Threshold vs current value
- Message
- Hours open

**Order:** Critical alerts first (out_of_stock → beer_low → low_stock)

---

### `v_waste_summary_current_month`
Waste analysis for current month.

**Columns:**
- Category and reason
- Incident count
- Total quantity wasted
- Affected products (array)
- Total value lost

**Order:** Highest value lost first

---

## Realtime Subscriptions

**Recommended Channels:**
```typescript
// Stock movements (for live inventory updates)
supabase
  .channel('stock_movements')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_movements' }, handler)
  .subscribe()

// Stock alerts (for dashboard notifications)
supabase
  .channel('stock_alerts')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stock_alerts' }, handler)
  .subscribe()

// Beer kegs (for bar staff)
supabase
  .channel('kegs')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'kegs' }, handler)
  .subscribe()
```

**Note:** Must enable realtime via Supabase dashboard:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE stock_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE stock_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE kegs;
```

---

## Seed Data

**22 Craft Beers** are automatically seeded:
- Estrella Damm, Moritz, Inedit, Voll-Damm
- La Trappe Blond, Grimbergen, Leffe Blonde, Duvel
- Heineken, Amstel, Paulaner Weissbier, Erdinger
- Guinness, Kilkenny, Corona Extra, Desperados
- Peroni, San Miguel, Mahou Cinco Estrellas, Alhambra Reserva
- Cruzcampo, La Virgen IPA

**Initial values:**
- `category`: `'beer'`
- `current_stock`: `0`
- `min_stock`: `40` (2 kegs)
- `max_stock`: `100` (5 kegs)
- `cost_per_unit`: `2.50` EUR/liter

---

## API Route Requirements

The frontend agent should implement these API routes:

### Products
- `GET /api/stock/products` — List all products
- `POST /api/stock/products` — Create product
- `PATCH /api/stock/products/[id]` — Update product
- `DELETE /api/stock/products/[id]` — Delete product

### Stock Movements
- `GET /api/stock/movements` — List movements (with filters)
- `POST /api/stock/movements` — Log movement (auto-updates stock)

### Kegs
- `GET /api/stock/kegs` — List active kegs
- `POST /api/stock/kegs` — Tap new keg
- `PATCH /api/stock/kegs/[id]` — Update keg (pour beer → decrease liters)

### Alerts
- `GET /api/stock/alerts` — List unresolved alerts
- `PATCH /api/stock/alerts/[id]` — Resolve alert

### Waste
- `POST /api/stock/waste` — Log waste

### Stock Takes
- `POST /api/stock/stock-take` — Record inventory count

### Purchase Orders
- `GET /api/stock/purchase-orders` — List orders
- `POST /api/stock/purchase-orders` — Create order
- `PATCH /api/stock/purchase-orders/[id]` — Update order

### Suppliers
- `GET /api/stock/suppliers` — List suppliers
- `POST /api/stock/suppliers` — Create supplier
- `PATCH /api/stock/suppliers/[id]` — Update supplier

---

## Dashboard KPIs

The Stock & Inventory dashboard should display:

1. **Stock Value**: Total value of inventory (`SUM(current_stock × cost_per_unit)`)
2. **Active Alerts**: Count of unresolved alerts
3. **Low Stock Items**: Count of products below min_stock
4. **Out of Stock Items**: Count of products at 0
5. **Waste %**: `(waste_quantity / total_usage) × 100` for current month
6. **Top Consumed Items**: Products with most `'out'` movements
7. **Beer Keg Status**: Visual display of 22 kegs with levels
8. **Reorder Alerts**: Products needing purchase orders

---

## TypeScript Types (Example)

```typescript
export type ProductCategory = 'food' | 'drink' | 'supplies' | 'beer'
export type StockMovementType = 'in' | 'out' | 'adjustment' | 'waste'
export type WasteReason = 'expired' | 'damaged' | 'overproduction' | 'spoiled' | 'customer_return' | 'other'
export type AlertType = 'low_stock' | 'out_of_stock' | 'beer_low' | 'expiring_soon'
export type KegStatus = 'active' | 'empty' | 'removed'

export interface Product {
  id: string
  name: string
  category: ProductCategory
  unit: string
  current_stock: number
  min_stock: number | null
  max_stock: number | null
  cost_per_unit: number | null
  supplier_id: string | null
  created_at: string
  updated_at: string
}

export interface Keg {
  id: string
  product_id: string
  keg_size_liters: number
  current_liters: number
  initial_liters: number
  tapped_at: string
  emptied_at: string | null
  status: KegStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface StockAlert {
  id: string
  product_id: string
  alert_type: AlertType
  threshold_value: number | null
  current_value: number | null
  message: string
  resolved: boolean
  resolved_at: string | null
  created_at: string
}

export interface StockMovement {
  id: string
  product_id: string
  movement_type: StockMovementType
  quantity: number
  reason: string | null
  recorded_by: string | null
  created_at: string
}

export interface WasteLog {
  id: string
  product_id: string
  quantity: number
  reason: WasteReason
  notes: string | null
  recorded_by: string | null
  created_at: string
}
```

---

## Testing Checklist

- [ ] Products: CRUD operations
- [ ] Stock movements: Auto-update current_stock
- [ ] Stock movements: Trigger low stock alerts
- [ ] Kegs: Track liters remaining
- [ ] Kegs: Auto-alert at 20% remaining
- [ ] Kegs: Auto-mark as empty when depleted
- [ ] Alerts: Auto-creation on stock changes
- [ ] Alerts: Auto-resolution on restock
- [ ] Waste logging: All reason categories
- [ ] Stock take: Variance calculation
- [ ] Purchase orders: Create and update
- [ ] RLS: Verify role-based access (kitchen, bar, manager)
- [ ] Realtime: Subscribe to stock_movements and alerts
- [ ] Views: Query v_stock_levels, v_active_kegs, v_unresolved_alerts

---

## Next Steps for Frontend Agent

1. **Generate TypeScript types** from Supabase schema
2. **Create API routes** as listed above
3. **Build UI pages**:
   - `/stock` — Inventory overview (v_stock_levels)
   - `/stock/movements` — Movement log with filters
   - `/stock/suppliers` — Supplier management
   - `/stock/beers` — 22 kegs display (v_active_kegs)
   - `/stock/alerts` — Alert dashboard (v_unresolved_alerts)
4. **Implement realtime subscriptions** for live updates
5. **Create dashboard KPI cards** with stock metrics
6. **Build notification system** for push alerts on low stock

---

## Schema Complete ✅

All database requirements for M4: Stock & Inventory are now implemented. The backend agent's work is complete for this module.
