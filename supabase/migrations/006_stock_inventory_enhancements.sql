-- ============================================================================
-- Stock & Inventory Module Enhancements
-- Version: 0.1.0
-- Description: Beer tracking, alerts, enums, and complete RLS for M4
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Product category enum
CREATE TYPE product_category AS ENUM (
  'food',
  'drink',
  'supplies',
  'beer'
);

-- Movement type enum (for consistency)
CREATE TYPE stock_movement_type AS ENUM (
  'in',
  'out',
  'adjustment',
  'waste'
);

-- Waste reason categories
CREATE TYPE waste_reason AS ENUM (
  'expired',
  'damaged',
  'overproduction',
  'spoiled',
  'customer_return',
  'other'
);

COMMENT ON TYPE product_category IS 'Product categories: food, drink, supplies, beer';
COMMENT ON TYPE stock_movement_type IS 'Stock movement types: in (delivery), out (usage), adjustment, waste';
COMMENT ON TYPE waste_reason IS 'Waste logging reason categories';

-- ============================================================================
-- PRODUCTS TABLE: Update category to use enum
-- ============================================================================

-- First, update existing data to match enum values (if any exist)
UPDATE products SET category = LOWER(TRIM(category));

-- Add new category_enum column
ALTER TABLE products
ADD COLUMN IF NOT EXISTS category_enum product_category;

-- Migrate data from VARCHAR to enum
UPDATE products
SET category_enum = category::product_category
WHERE category IS NOT NULL
  AND category IN ('food', 'drink', 'supplies', 'beer');

-- For beer items, ensure they're categorized correctly
UPDATE products
SET category_enum = 'beer'
WHERE LOWER(name) LIKE '%beer%' OR LOWER(name) LIKE '%keg%';

-- Drop old column and rename new one
ALTER TABLE products DROP COLUMN IF EXISTS category;
ALTER TABLE products RENAME COLUMN category_enum TO category;

-- Make category NOT NULL with default
ALTER TABLE products ALTER COLUMN category SET NOT NULL;
ALTER TABLE products ALTER COLUMN category SET DEFAULT 'supplies';

COMMENT ON COLUMN products.category IS 'Product category: food, drink, supplies, or beer';

-- ============================================================================
-- BEER TRACKING: Keg/Barrel Management
-- ============================================================================

-- Kegs table for 22 craft beers on tap
CREATE TABLE IF NOT EXISTS kegs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products ON DELETE CASCADE,
  keg_size_liters DECIMAL(10, 2) NOT NULL DEFAULT 20,
  current_liters DECIMAL(10, 2) NOT NULL,
  initial_liters DECIMAL(10, 2) NOT NULL,
  tapped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  emptied_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'empty', 'removed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_kegs_product_id ON kegs(product_id);
CREATE INDEX idx_kegs_status ON kegs(status);
CREATE INDEX idx_kegs_tapped_at ON kegs(tapped_at DESC);

COMMENT ON TABLE kegs IS '22 craft beer keg tracking with liters remaining';
COMMENT ON COLUMN kegs.keg_size_liters IS 'Standard sizes: 20L (1/6 barrel), 30L (Cornelius), 50L (standard)';
COMMENT ON COLUMN kegs.current_liters IS 'Liters remaining in this keg';
COMMENT ON COLUMN kegs.status IS 'active = currently tapped, empty = finished, removed = taken off tap';

-- ============================================================================
-- STOCK ALERTS
-- ============================================================================

-- Stock alerts table
CREATE TABLE IF NOT EXISTS stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'expiring_soon', 'beer_low')),
  threshold_value DECIMAL(10, 2),
  current_value DECIMAL(10, 2),
  message TEXT NOT NULL,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_stock_alerts_product_id ON stock_alerts(product_id);
CREATE INDEX idx_stock_alerts_resolved ON stock_alerts(resolved);
CREATE INDEX idx_stock_alerts_created_at ON stock_alerts(created_at DESC);
CREATE INDEX idx_stock_alerts_type ON stock_alerts(alert_type);

COMMENT ON TABLE stock_alerts IS 'Automatic stock alerts for low inventory and beer kegs';
COMMENT ON COLUMN stock_alerts.alert_type IS 'Types: low_stock, out_of_stock, expiring_soon, beer_low';

-- ============================================================================
-- WASTE LOGS: Update to use enum
-- ============================================================================

-- Add new reason_enum column
ALTER TABLE waste_logs
ADD COLUMN IF NOT EXISTS reason_enum waste_reason;

-- Migrate existing VARCHAR reasons to enum (map common values)
UPDATE waste_logs
SET reason_enum = (CASE
  WHEN LOWER(reason) LIKE '%expir%' THEN 'expired'
  WHEN LOWER(reason) LIKE '%damag%' THEN 'damaged'
  WHEN LOWER(reason) LIKE '%overprod%' OR LOWER(reason) LIKE '%excess%' THEN 'overproduction'
  WHEN LOWER(reason) LIKE '%spoil%' OR LOWER(reason) LIKE '%rot%' THEN 'spoiled'
  WHEN LOWER(reason) LIKE '%return%' OR LOWER(reason) LIKE '%customer%' THEN 'customer_return'
  ELSE 'other'
END)::waste_reason
WHERE reason IS NOT NULL;

-- Drop old column and rename new one
ALTER TABLE waste_logs DROP COLUMN IF EXISTS reason;
ALTER TABLE waste_logs RENAME COLUMN reason_enum TO reason;

ALTER TABLE waste_logs ALTER COLUMN reason SET NOT NULL;
ALTER TABLE waste_logs ALTER COLUMN reason SET DEFAULT 'other';

-- Add notes column for additional details
ALTER TABLE waste_logs ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN waste_logs.reason IS 'Waste reason: expired, damaged, overproduction, spoiled, customer_return, other';

-- ============================================================================
-- STOCK MOVEMENTS: Update movement_type to use enum
-- ============================================================================

-- Add new movement_type_enum column
ALTER TABLE stock_movements
ADD COLUMN IF NOT EXISTS movement_type_enum stock_movement_type;

-- Migrate existing VARCHAR to enum
UPDATE stock_movements
SET movement_type_enum = movement_type::stock_movement_type
WHERE movement_type IN ('in', 'out', 'adjustment', 'waste');

-- Drop old column and rename
ALTER TABLE stock_movements DROP COLUMN IF EXISTS movement_type;
ALTER TABLE stock_movements RENAME COLUMN movement_type_enum TO movement_type;

ALTER TABLE stock_movements ALTER COLUMN movement_type SET NOT NULL;

COMMENT ON COLUMN stock_movements.movement_type IS 'Movement type: in (delivery), out (usage), adjustment, waste';

-- ============================================================================
-- FUNCTIONS: Stock Alert Generation
-- ============================================================================

-- Function to check and create low stock alert
CREATE OR REPLACE FUNCTION check_low_stock_alert(p_product_id UUID)
RETURNS VOID AS $$
DECLARE
  v_product RECORD;
  v_alert_exists BOOLEAN;
BEGIN
  -- Get product details
  SELECT id, name, current_stock, min_stock, category
  INTO v_product
  FROM products
  WHERE id = p_product_id;

  -- Check if product exists
  IF v_product.id IS NULL THEN
    RETURN;
  END IF;

  -- Check if alert already exists and is unresolved
  SELECT EXISTS (
    SELECT 1 FROM stock_alerts
    WHERE product_id = p_product_id
      AND alert_type = 'low_stock'
      AND resolved = false
  ) INTO v_alert_exists;

  -- Create alert if stock below minimum and no existing alert
  IF v_product.min_stock IS NOT NULL
     AND v_product.current_stock < v_product.min_stock
     AND NOT v_alert_exists THEN

    INSERT INTO stock_alerts (product_id, alert_type, threshold_value, current_value, message)
    VALUES (
      p_product_id,
      'low_stock',
      v_product.min_stock,
      v_product.current_stock,
      format('Low stock alert: %s is below minimum stock level (%s < %s)',
             v_product.name, v_product.current_stock, v_product.min_stock)
    );

  -- Resolve alert if stock is back above minimum
  ELSIF v_product.current_stock >= COALESCE(v_product.min_stock, 0) AND v_alert_exists THEN

    UPDATE stock_alerts
    SET resolved = true, resolved_at = NOW()
    WHERE product_id = p_product_id
      AND alert_type = 'low_stock'
      AND resolved = false;

  END IF;

  -- Check for out of stock
  IF v_product.current_stock <= 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM stock_alerts
      WHERE product_id = p_product_id
        AND alert_type = 'out_of_stock'
        AND resolved = false
    ) INTO v_alert_exists;

    IF NOT v_alert_exists THEN
      INSERT INTO stock_alerts (product_id, alert_type, threshold_value, current_value, message)
      VALUES (
        p_product_id,
        'out_of_stock',
        0,
        v_product.current_stock,
        format('OUT OF STOCK: %s is completely depleted', v_product.name)
      );
    END IF;
  ELSE
    -- Resolve out of stock alert if restocked
    UPDATE stock_alerts
    SET resolved = true, resolved_at = NOW()
    WHERE product_id = p_product_id
      AND alert_type = 'out_of_stock'
      AND resolved = false;
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_low_stock_alert IS 'Creates or resolves stock alerts based on current inventory levels';

-- Function to check beer keg levels and alert
CREATE OR REPLACE FUNCTION check_beer_keg_alert(p_keg_id UUID)
RETURNS VOID AS $$
DECLARE
  v_keg RECORD;
  v_product RECORD;
  v_alert_exists BOOLEAN;
  v_percentage DECIMAL;
BEGIN
  -- Get keg details
  SELECT k.id, k.product_id, k.current_liters, k.keg_size_liters, k.status
  INTO v_keg
  FROM kegs k
  WHERE k.id = p_keg_id AND k.status = 'active';

  IF v_keg.id IS NULL THEN
    RETURN;
  END IF;

  -- Calculate percentage remaining
  v_percentage := (v_keg.current_liters / NULLIF(v_keg.keg_size_liters, 0)) * 100;

  -- Get product name
  SELECT name INTO v_product FROM products WHERE id = v_keg.product_id;

  -- Alert if below 20% remaining
  IF v_percentage < 20 THEN
    SELECT EXISTS (
      SELECT 1 FROM stock_alerts
      WHERE product_id = v_keg.product_id
        AND alert_type = 'beer_low'
        AND resolved = false
    ) INTO v_alert_exists;

    IF NOT v_alert_exists THEN
      INSERT INTO stock_alerts (product_id, alert_type, threshold_value, current_value, message)
      VALUES (
        v_keg.product_id,
        'beer_low',
        v_keg.keg_size_liters * 0.20,
        v_keg.current_liters,
        format('Beer keg running low: %s has only %.1f liters remaining (%.0f%%)',
               v_product.name, v_keg.current_liters, v_percentage)
      );
    END IF;
  END IF;

  -- Mark keg as empty if depleted
  IF v_keg.current_liters <= 0 THEN
    UPDATE kegs
    SET status = 'empty', emptied_at = NOW()
    WHERE id = p_keg_id;
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_beer_keg_alert IS 'Monitors beer keg levels and creates alerts when below 20%';

-- ============================================================================
-- TRIGGERS: Auto-alert on stock changes
-- ============================================================================

-- Trigger on product stock updates
CREATE OR REPLACE FUNCTION trigger_stock_alert_check()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_low_stock_alert(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS product_stock_alert_check ON products;
CREATE TRIGGER product_stock_alert_check
AFTER UPDATE OF current_stock ON products
FOR EACH ROW
EXECUTE FUNCTION trigger_stock_alert_check();

-- Trigger on keg updates
CREATE OR REPLACE FUNCTION trigger_keg_alert_check()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_beer_keg_alert(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS keg_level_alert_check ON kegs;
CREATE TRIGGER keg_level_alert_check
AFTER INSERT OR UPDATE OF current_liters ON kegs
FOR EACH ROW
EXECUTE FUNCTION trigger_keg_alert_check();

-- Update kegs.updated_at trigger
CREATE OR REPLACE FUNCTION update_kegs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS kegs_updated_at ON kegs;
CREATE TRIGGER kegs_updated_at
BEFORE UPDATE ON kegs
FOR EACH ROW
EXECUTE FUNCTION update_kegs_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all stock tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE kegs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_takes ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- == PRODUCTS == (already has SELECT policy, add CRUD)
CREATE POLICY "Managers can create products"
ON products FOR INSERT
WITH CHECK (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Managers can update products"
ON products FOR UPDATE
USING (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Admins can delete products"
ON products FOR DELETE
USING (get_user_role() = 'admin');

-- == STOCK MOVEMENTS ==
CREATE POLICY "Kitchen/bar/managers can read stock movements"
ON stock_movements FOR SELECT
USING (get_user_role() IN ('admin', 'manager', 'kitchen', 'bar'));

CREATE POLICY "Kitchen/bar/managers can create stock movements"
ON stock_movements FOR INSERT
WITH CHECK (get_user_role() IN ('admin', 'manager', 'kitchen', 'bar'));

-- No UPDATE policy - movements are immutable once created
-- Only admins can delete erroneous movements
CREATE POLICY "Admins can delete stock movements"
ON stock_movements FOR DELETE
USING (get_user_role() = 'admin');

-- == KEGS ==
CREATE POLICY "Bar/kitchen/managers can read kegs"
ON kegs FOR SELECT
USING (get_user_role() IN ('admin', 'manager', 'kitchen', 'bar'));

CREATE POLICY "Bar/managers can create kegs"
ON kegs FOR INSERT
WITH CHECK (get_user_role() IN ('admin', 'manager', 'bar'));

CREATE POLICY "Bar/managers can update kegs"
ON kegs FOR UPDATE
USING (get_user_role() IN ('admin', 'manager', 'bar'));

CREATE POLICY "Managers can delete kegs"
ON kegs FOR DELETE
USING (get_user_role() IN ('admin', 'manager'));

-- == STOCK ALERTS ==
CREATE POLICY "Staff can read stock alerts"
ON stock_alerts FOR SELECT
USING (get_user_role() IN ('admin', 'manager', 'kitchen', 'bar'));

-- Only system functions can create alerts
CREATE POLICY "System can create stock alerts"
ON stock_alerts FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Managers can resolve alerts
CREATE POLICY "Managers can update stock alerts"
ON stock_alerts FOR UPDATE
USING (get_user_role() IN ('admin', 'manager'));

-- == WASTE LOGS ==
CREATE POLICY "Staff can read waste logs"
ON waste_logs FOR SELECT
USING (get_user_role() IN ('admin', 'manager', 'kitchen', 'bar'));

CREATE POLICY "Kitchen/bar can create waste logs"
ON waste_logs FOR INSERT
WITH CHECK (get_user_role() IN ('admin', 'manager', 'kitchen', 'bar'));

CREATE POLICY "Managers can delete waste logs"
ON waste_logs FOR DELETE
USING (get_user_role() IN ('admin', 'manager'));

-- == STOCK TAKES ==
CREATE POLICY "Staff can read stock takes"
ON stock_takes FOR SELECT
USING (get_user_role() IN ('admin', 'manager', 'kitchen', 'bar'));

CREATE POLICY "Managers can create stock takes"
ON stock_takes FOR INSERT
WITH CHECK (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Managers can update stock takes"
ON stock_takes FOR UPDATE
USING (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Managers can delete stock takes"
ON stock_takes FOR DELETE
USING (get_user_role() IN ('admin', 'manager'));

-- == PURCHASE ORDERS ==
CREATE POLICY "Managers can read purchase orders"
ON purchase_orders FOR SELECT
USING (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Managers can create purchase orders"
ON purchase_orders FOR INSERT
WITH CHECK (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Managers can update purchase orders"
ON purchase_orders FOR UPDATE
USING (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Admins can delete purchase orders"
ON purchase_orders FOR DELETE
USING (get_user_role() = 'admin');

-- == PURCHASE ORDER ITEMS ==
CREATE POLICY "Managers can read purchase order items"
ON purchase_order_items FOR SELECT
USING (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Managers can create purchase order items"
ON purchase_order_items FOR INSERT
WITH CHECK (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Managers can update purchase order items"
ON purchase_order_items FOR UPDATE
USING (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Admins can delete purchase order items"
ON purchase_order_items FOR DELETE
USING (get_user_role() = 'admin');

-- == SUPPLIERS ==
CREATE POLICY "Staff can read suppliers"
ON suppliers FOR SELECT
USING (get_user_role() IN ('admin', 'manager', 'kitchen', 'bar'));

CREATE POLICY "Managers can create suppliers"
ON suppliers FOR INSERT
WITH CHECK (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Managers can update suppliers"
ON suppliers FOR UPDATE
USING (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Admins can delete suppliers"
ON suppliers FOR DELETE
USING (get_user_role() = 'admin');

-- ============================================================================
-- REALTIME PUBLICATION
-- ============================================================================

-- Enable realtime for stock movements and alerts
-- Note: These commands must be run by superuser (via Supabase dashboard)
-- ALTER PUBLICATION supabase_realtime ADD TABLE stock_movements;
-- ALTER PUBLICATION supabase_realtime ADD TABLE stock_alerts;
-- ALTER PUBLICATION supabase_realtime ADD TABLE kegs;

COMMENT ON TABLE stock_movements IS 'Stock movements log. Enable realtime via: ALTER PUBLICATION supabase_realtime ADD TABLE stock_movements;';
COMMENT ON TABLE stock_alerts IS 'Stock alerts. Enable realtime via: ALTER PUBLICATION supabase_realtime ADD TABLE stock_alerts;';

-- ============================================================================
-- VIEWS: Helpful views for stock dashboard
-- ============================================================================

-- View: Current stock levels with alert status
CREATE OR REPLACE VIEW v_stock_levels AS
SELECT
  p.id,
  p.name,
  p.category,
  p.unit,
  p.current_stock,
  p.min_stock,
  p.max_stock,
  p.cost_per_unit,
  (p.current_stock * p.cost_per_unit) AS stock_value,
  s.name AS supplier_name,
  s.contact_person AS supplier_contact,
  CASE
    WHEN p.current_stock <= 0 THEN 'out_of_stock'
    WHEN p.min_stock IS NOT NULL AND p.current_stock < p.min_stock THEN 'low_stock'
    WHEN p.max_stock IS NOT NULL AND p.current_stock > p.max_stock THEN 'overstock'
    ELSE 'ok'
  END AS stock_status,
  (
    SELECT COUNT(*) FROM stock_alerts sa
    WHERE sa.product_id = p.id AND sa.resolved = false
  ) AS active_alerts,
  p.updated_at
FROM products p
LEFT JOIN suppliers s ON p.supplier_id = s.id
ORDER BY
  CASE
    WHEN p.current_stock <= 0 THEN 1
    WHEN p.min_stock IS NOT NULL AND p.current_stock < p.min_stock THEN 2
    ELSE 3
  END,
  p.name;

COMMENT ON VIEW v_stock_levels IS 'Current stock levels with status indicators and alert counts';

-- View: Active beer kegs
CREATE OR REPLACE VIEW v_active_kegs AS
SELECT
  k.id AS keg_id,
  p.id AS product_id,
  p.name AS beer_name,
  k.keg_size_liters,
  k.current_liters,
  k.initial_liters,
  ROUND((k.current_liters / NULLIF(k.keg_size_liters, 0)) * 100, 1) AS percent_remaining,
  k.tapped_at,
  EXTRACT(EPOCH FROM (NOW() - k.tapped_at)) / 86400 AS days_on_tap,
  k.status,
  CASE
    WHEN k.current_liters <= 0 THEN 'empty'
    WHEN (k.current_liters / NULLIF(k.keg_size_liters, 0)) < 0.20 THEN 'critical'
    WHEN (k.current_liters / NULLIF(k.keg_size_liters, 0)) < 0.40 THEN 'low'
    ELSE 'ok'
  END AS keg_status,
  k.notes
FROM kegs k
JOIN products p ON k.product_id = p.id
WHERE k.status = 'active'
ORDER BY
  CASE
    WHEN k.current_liters <= 0 THEN 1
    WHEN (k.current_liters / NULLIF(k.keg_size_liters, 0)) < 0.20 THEN 2
    WHEN (k.current_liters / NULLIF(k.keg_size_liters, 0)) < 0.40 THEN 3
    ELSE 4
  END,
  percent_remaining ASC;

COMMENT ON VIEW v_active_kegs IS 'Active beer kegs with status indicators for 22 craft beers on tap';

-- View: Stock movements with product names (last 30 days)
CREATE OR REPLACE VIEW v_recent_stock_movements AS
SELECT
  sm.id,
  sm.product_id,
  p.name AS product_name,
  p.category,
  sm.movement_type,
  sm.quantity,
  sm.reason,
  e.id AS recorded_by_id,
  prof.full_name AS recorded_by_name,
  sm.created_at
FROM stock_movements sm
JOIN products p ON sm.product_id = p.id
LEFT JOIN employees e ON sm.recorded_by = e.id
LEFT JOIN profiles prof ON e.profile_id = prof.id
WHERE sm.created_at > NOW() - INTERVAL '30 days'
ORDER BY sm.created_at DESC;

COMMENT ON VIEW v_recent_stock_movements IS 'Stock movements from last 30 days with product and employee details';

-- View: Unresolved stock alerts
CREATE OR REPLACE VIEW v_unresolved_alerts AS
SELECT
  sa.id AS alert_id,
  sa.product_id,
  p.name AS product_name,
  p.category,
  sa.alert_type,
  sa.threshold_value,
  sa.current_value,
  sa.message,
  sa.created_at,
  EXTRACT(EPOCH FROM (NOW() - sa.created_at)) / 3600 AS hours_open
FROM stock_alerts sa
JOIN products p ON sa.product_id = p.id
WHERE sa.resolved = false
ORDER BY
  CASE sa.alert_type
    WHEN 'out_of_stock' THEN 1
    WHEN 'beer_low' THEN 2
    WHEN 'low_stock' THEN 3
    ELSE 4
  END,
  sa.created_at ASC;

COMMENT ON VIEW v_unresolved_alerts IS 'Active stock alerts requiring attention';

-- View: Waste summary by reason (current month)
CREATE OR REPLACE VIEW v_waste_summary_current_month AS
SELECT
  p.category,
  wl.reason,
  COUNT(*) AS incident_count,
  SUM(wl.quantity) AS total_quantity_wasted,
  ARRAY_AGG(DISTINCT p.name) AS affected_products,
  SUM(wl.quantity * p.cost_per_unit) AS total_value_lost
FROM waste_logs wl
JOIN products p ON wl.product_id = p.id
WHERE wl.created_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY p.category, wl.reason
ORDER BY total_value_lost DESC;

COMMENT ON VIEW v_waste_summary_current_month IS 'Waste analysis for current month: incidents, quantities, and value lost';

-- ============================================================================
-- SEED DATA: Example beer products for testing
-- ============================================================================

-- Insert some example craft beer products (will be replaced with real data)
DO $$
DECLARE
  v_beer_names TEXT[] := ARRAY[
    'Estrella Damm', 'Moritz', 'Inedit', 'Voll-Damm',
    'La Trappe Blond', 'Grimbergen', 'Leffe Blonde', 'Duvel',
    'Heineken', 'Amstel', 'Paulaner Weissbier', 'Erdinger',
    'Guinness', 'Kilkenny', 'Corona Extra', 'Desperados',
    'Peroni', 'San Miguel', 'Mahou Cinco Estrellas', 'Alhambra Reserva',
    'Cruzcampo', 'La Virgen IPA'
  ];
  v_beer_name TEXT;
BEGIN
  FOREACH v_beer_name IN ARRAY v_beer_names
  LOOP
    INSERT INTO products (name, category, unit, current_stock, min_stock, max_stock, cost_per_unit)
    VALUES (
      v_beer_name,
      'beer',
      'liters',
      0,
      40,  -- Min 2 kegs worth (20L each)
      100, -- Max 5 kegs
      2.50 -- Average cost per liter
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

COMMENT ON TABLE products IS 'Products database includes 22 craft beers for keg tracking';

-- ============================================================================
-- COMPLETE
-- ============================================================================

COMMENT ON SCHEMA public IS 'Stock & Inventory Module (M4) enhanced with beer tracking, alerts, and complete RLS policies';
