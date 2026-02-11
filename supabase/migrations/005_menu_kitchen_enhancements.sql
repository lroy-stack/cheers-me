-- ============================================================================
-- Menu & Kitchen Module Enhancements
-- Version: 0.1.0
-- Description: Additional columns and seed data for Menu & Kitchen Management
-- ============================================================================

-- ============================================================================
-- TABLES: Add QR code support
-- ============================================================================

ALTER TABLE tables
ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

COMMENT ON COLUMN tables.qr_code_url IS 'URL to generated QR code for table digital menu';

-- ============================================================================
-- MENU CATEGORIES: Add multi-language support
-- ============================================================================

ALTER TABLE menu_categories
ADD COLUMN IF NOT EXISTS name_en VARCHAR(100),
ADD COLUMN IF NOT EXISTS name_nl VARCHAR(100),
ADD COLUMN IF NOT EXISTS name_es VARCHAR(100);

-- Migrate existing name to name_en
UPDATE menu_categories SET name_en = name WHERE name_en IS NULL;

-- Drop old name column (keep name_en as primary)
ALTER TABLE menu_categories DROP COLUMN IF EXISTS name;

COMMENT ON COLUMN menu_categories.name_en IS 'Category name in English';
COMMENT ON COLUMN menu_categories.name_nl IS 'Category name in Dutch';
COMMENT ON COLUMN menu_categories.name_es IS 'Category name in Spanish';

-- ============================================================================
-- KITCHEN ORDERS: Add waiter tracking and timing
-- ============================================================================

ALTER TABLE kitchen_orders
ADD COLUMN IF NOT EXISTS waiter_id UUID REFERENCES employees(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS prep_duration_seconds INTEGER;

COMMENT ON COLUMN kitchen_orders.waiter_id IS 'Employee who placed the order';
COMMENT ON COLUMN kitchen_orders.started_at IS 'When kitchen started preparing the order';
COMMENT ON COLUMN kitchen_orders.prep_duration_seconds IS 'Total prep time from started_at to completed_at';

-- Add index for waiter queries
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_waiter_id ON kitchen_orders(waiter_id);

-- ============================================================================
-- FUNCTION: Calculate prep duration on order completion
-- ============================================================================

CREATE OR REPLACE FUNCTION update_kitchen_order_prep_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'ready' AND NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.prep_duration_seconds = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS kitchen_order_prep_duration ON kitchen_orders;
CREATE TRIGGER kitchen_order_prep_duration
BEFORE UPDATE ON kitchen_orders
FOR EACH ROW
WHEN (NEW.status = 'ready' AND OLD.status != 'ready')
EXECUTE FUNCTION update_kitchen_order_prep_duration();

COMMENT ON FUNCTION update_kitchen_order_prep_duration IS 'Auto-calculates prep time when order marked ready';

-- ============================================================================
-- SEED DATA: Default menu categories
-- ============================================================================

INSERT INTO menu_categories (id, name_en, name_nl, name_es, sort_order) VALUES
  (gen_random_uuid(), 'Breakfast', 'Ontbijt', 'Desayuno', 1),
  (gen_random_uuid(), 'Lunch', 'Lunch', 'Almuerzo', 2),
  (gen_random_uuid(), 'Dinner', 'Diner', 'Cena', 3),
  (gen_random_uuid(), 'Drinks', 'Dranken', 'Bebidas', 4),
  (gen_random_uuid(), 'Cocktails', 'Cocktails', 'Cócteles', 5),
  (gen_random_uuid(), 'Desserts', 'Desserts', 'Postres', 6)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE menu_categories IS 'Predefined menu categories: Breakfast, Lunch, Dinner, Drinks, Cocktails, Desserts';

-- ============================================================================
-- RLS POLICIES: Kitchen orders
-- ============================================================================

ALTER TABLE kitchen_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_order_items ENABLE ROW LEVEL SECURITY;

-- Kitchen staff, waiters, and managers can view all orders
CREATE POLICY "Staff can read kitchen orders"
ON kitchen_orders FOR SELECT
USING (
  get_user_role() IN ('admin', 'manager', 'kitchen', 'bar', 'waiter')
);

-- Kitchen staff and waiters can create orders
CREATE POLICY "Kitchen and waiters can create orders"
ON kitchen_orders FOR INSERT
WITH CHECK (
  get_user_role() IN ('admin', 'manager', 'kitchen', 'waiter')
);

-- Kitchen staff and managers can update orders
CREATE POLICY "Kitchen and managers can update orders"
ON kitchen_orders FOR UPDATE
USING (
  get_user_role() IN ('admin', 'manager', 'kitchen')
);

-- Kitchen order items follow same permissions as parent order
CREATE POLICY "Staff can read kitchen order items"
ON kitchen_order_items FOR SELECT
USING (
  get_user_role() IN ('admin', 'manager', 'kitchen', 'bar', 'waiter')
);

CREATE POLICY "Kitchen and waiters can create order items"
ON kitchen_order_items FOR INSERT
WITH CHECK (
  get_user_role() IN ('admin', 'manager', 'kitchen', 'waiter')
);

CREATE POLICY "Kitchen and managers can update order items"
ON kitchen_order_items FOR UPDATE
USING (
  get_user_role() IN ('admin', 'manager', 'kitchen')
);

-- ============================================================================
-- REALTIME: Enable for KDS
-- ============================================================================

-- Note: These commands must be run by a superuser (run via Supabase dashboard SQL editor or CLI)
-- ALTER PUBLICATION supabase_realtime ADD TABLE kitchen_orders;
-- ALTER PUBLICATION supabase_realtime ADD TABLE kitchen_order_items;

COMMENT ON TABLE kitchen_orders IS 'Orders displayed in Kitchen Display System (KDS). Enable realtime via: ALTER PUBLICATION supabase_realtime ADD TABLE kitchen_orders;';

-- ============================================================================
-- VIEWS: Helpful views for common queries
-- ============================================================================

-- View: Active kitchen orders with menu item details
CREATE OR REPLACE VIEW v_active_kitchen_orders AS
SELECT
  ko.id AS order_id,
  ko.ticket_number,
  ko.table_id,
  t.table_number,
  ko.status AS order_status,
  ko.created_at AS order_created_at,
  ko.started_at,
  ko.completed_at,
  ko.prep_duration_seconds,
  ko.waiter_id,
  p.full_name AS waiter_name,
  koi.id AS item_id,
  koi.menu_item_id,
  mi.name_en AS item_name_en,
  mi.name_nl AS item_name_nl,
  mi.name_es AS item_name_es,
  mi.prep_time_minutes AS expected_prep_time,
  koi.quantity,
  koi.notes AS item_notes,
  koi.status AS item_status
FROM kitchen_orders ko
LEFT JOIN tables t ON ko.table_id = t.id
LEFT JOIN employees e ON ko.waiter_id = e.id
LEFT JOIN profiles p ON e.profile_id = p.id
JOIN kitchen_order_items koi ON ko.id = koi.kitchen_order_id
JOIN menu_items mi ON koi.menu_item_id = mi.id
WHERE ko.status IN ('pending', 'in_progress')
ORDER BY ko.created_at ASC, koi.created_at ASC;

COMMENT ON VIEW v_active_kitchen_orders IS 'Real-time view of active kitchen orders for KDS display';

-- View: Menu items with allergen info
CREATE OR REPLACE VIEW v_menu_items_with_allergens AS
SELECT
  mi.id,
  mi.category_id,
  mc.name_en AS category_name_en,
  mc.name_nl AS category_name_nl,
  mc.name_es AS category_name_es,
  mi.name_en,
  mi.name_nl,
  mi.name_es,
  mi.description_en,
  mi.description_nl,
  mi.description_es,
  mi.price,
  mi.cost_of_goods,
  ROUND(((mi.price - COALESCE(mi.cost_of_goods, 0)) / NULLIF(mi.price, 0)) * 100, 2) AS margin_percentage,
  mi.photo_url,
  mi.prep_time_minutes,
  mi.available,
  mi.sort_order,
  ARRAY_AGG(ma.allergen ORDER BY ma.allergen) FILTER (WHERE ma.allergen IS NOT NULL) AS allergens
FROM menu_items mi
JOIN menu_categories mc ON mi.category_id = mc.id
LEFT JOIN menu_allergens ma ON mi.id = ma.menu_item_id
GROUP BY
  mi.id,
  mi.category_id,
  mc.name_en,
  mc.name_nl,
  mc.name_es,
  mi.name_en,
  mi.name_nl,
  mi.name_es,
  mi.description_en,
  mi.description_nl,
  mi.description_es,
  mi.price,
  mi.cost_of_goods,
  mi.photo_url,
  mi.prep_time_minutes,
  mi.available,
  mi.sort_order,
  mc.sort_order
ORDER BY mc.sort_order, mi.sort_order;

COMMENT ON VIEW v_menu_items_with_allergens IS 'Complete menu view with allergen arrays and margin calculations';

-- ============================================================================
-- COMPLETE
-- ============================================================================
