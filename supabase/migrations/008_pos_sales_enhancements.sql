-- ============================================================================
-- GrandCafe Cheers — POS & Sales Enhancements (M5)
-- Migration: 008
-- Description: Additional tables and enhancements for POS & Sales module
-- ============================================================================

-- ============================================================================
-- SALES ITEMS (for top sellers tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sales_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_sales_id UUID NOT NULL REFERENCES daily_sales ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items ON DELETE SET NULL,
  item_name VARCHAR(255) NOT NULL, -- Denormalized for historical tracking
  category VARCHAR(100) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sales_items_daily_sales_id ON sales_items(daily_sales_id);
CREATE INDEX idx_sales_items_menu_item_id ON sales_items(menu_item_id);
CREATE INDEX idx_sales_items_category ON sales_items(category);
CREATE INDEX idx_sales_items_recorded_at ON sales_items(recorded_at);

COMMENT ON TABLE sales_items IS 'Individual item sales for tracking top sellers and detailed analytics';
COMMENT ON COLUMN sales_items.item_name IS 'Denormalized name - preserves historical data if menu item deleted';

-- ============================================================================
-- SHIFT SALES (for shift-level revenue breakdown)
-- ============================================================================

CREATE TABLE IF NOT EXISTS shift_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES shifts ON DELETE CASCADE,
  date DATE NOT NULL,
  shift_type shift_type NOT NULL,
  food_revenue DECIMAL(10, 2) DEFAULT 0,
  drinks_revenue DECIMAL(10, 2) DEFAULT 0,
  cocktails_revenue DECIMAL(10, 2) DEFAULT 0,
  desserts_revenue DECIMAL(10, 2) DEFAULT 0,
  other_revenue DECIMAL(10, 2) DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  ticket_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shift_id)
);

CREATE INDEX idx_shift_sales_date ON shift_sales(date);
CREATE INDEX idx_shift_sales_shift_type ON shift_sales(shift_type);

COMMENT ON TABLE shift_sales IS 'Revenue breakdown by shift for granular performance tracking';

-- Trigger to auto-calculate shift_sales.total_revenue
CREATE OR REPLACE FUNCTION update_shift_sales_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_revenue = COALESCE(NEW.food_revenue, 0) + COALESCE(NEW.drinks_revenue, 0) +
                      COALESCE(NEW.cocktails_revenue, 0) + COALESCE(NEW.desserts_revenue, 0) +
                      COALESCE(NEW.other_revenue, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shift_sales_total
BEFORE INSERT OR UPDATE ON shift_sales
FOR EACH ROW
EXECUTE FUNCTION update_shift_sales_total();

-- ============================================================================
-- SALES IMPORT LOG (audit trail for CSV imports)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sales_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_date DATE NOT NULL,
  file_name VARCHAR(255),
  rows_imported INTEGER DEFAULT 0,
  rows_failed INTEGER DEFAULT 0,
  total_revenue DECIMAL(10, 2),
  imported_by UUID REFERENCES employees ON DELETE SET NULL,
  error_log TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sales_import_logs_import_date ON sales_import_logs(import_date);
CREATE INDEX idx_sales_import_logs_imported_by ON sales_import_logs(imported_by);

COMMENT ON TABLE sales_import_logs IS 'Audit trail for sales data CSV imports from external POS';

-- ============================================================================
-- TICKET AVERAGE CALCULATION VIEW
-- ============================================================================

CREATE OR REPLACE VIEW daily_sales_metrics AS
SELECT
  ds.id,
  ds.date,
  ds.food_revenue,
  ds.drinks_revenue,
  ds.cocktails_revenue,
  ds.desserts_revenue,
  ds.other_revenue,
  ds.tips,
  ds.total_revenue,
  ds.ticket_count,
  CASE
    WHEN ds.ticket_count > 0 THEN ROUND(ds.total_revenue / ds.ticket_count, 2)
    ELSE 0
  END AS ticket_average,
  -- Day of week for analysis
  EXTRACT(DOW FROM ds.date) AS day_of_week,
  TO_CHAR(ds.date, 'Day') AS day_name,
  -- Week comparisons
  LAG(ds.total_revenue, 7) OVER (ORDER BY ds.date) AS same_day_last_week_revenue,
  LAG(ds.ticket_count, 7) OVER (ORDER BY ds.date) AS same_day_last_week_tickets,
  -- Month comparisons (approximate - 30 days)
  LAG(ds.total_revenue, 30) OVER (ORDER BY ds.date) AS same_day_last_month_revenue,
  LAG(ds.ticket_count, 30) OVER (ORDER BY ds.date) AS same_day_last_month_tickets,
  -- Year comparisons (approximate - 365 days)
  LAG(ds.total_revenue, 365) OVER (ORDER BY ds.date) AS same_day_last_year_revenue,
  LAG(ds.ticket_count, 365) OVER (ORDER BY ds.date) AS same_day_last_year_tickets,
  ds.created_at,
  ds.updated_at
FROM daily_sales ds;

COMMENT ON VIEW daily_sales_metrics IS 'Enhanced sales metrics with ticket averages and historical comparisons';

-- ============================================================================
-- TOP SELLERS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW top_sellers_daily AS
SELECT
  si.recorded_at::DATE AS sale_date,
  si.menu_item_id,
  si.item_name,
  si.category,
  SUM(si.quantity) AS total_quantity,
  SUM(si.total_price) AS total_revenue,
  COUNT(DISTINCT si.daily_sales_id) AS days_sold,
  ROUND(AVG(si.unit_price), 2) AS avg_unit_price
FROM sales_items si
GROUP BY si.recorded_at::DATE, si.menu_item_id, si.item_name, si.category
ORDER BY total_revenue DESC;

COMMENT ON VIEW top_sellers_daily IS 'Daily top sellers by revenue and quantity';

CREATE OR REPLACE VIEW top_sellers_weekly AS
SELECT
  DATE_TRUNC('week', si.recorded_at)::DATE AS week_start,
  si.menu_item_id,
  si.item_name,
  si.category,
  SUM(si.quantity) AS total_quantity,
  SUM(si.total_price) AS total_revenue,
  COUNT(DISTINCT si.recorded_at::DATE) AS days_sold,
  ROUND(AVG(si.unit_price), 2) AS avg_unit_price
FROM sales_items si
GROUP BY DATE_TRUNC('week', si.recorded_at)::DATE, si.menu_item_id, si.item_name, si.category
ORDER BY week_start DESC, total_revenue DESC;

COMMENT ON VIEW top_sellers_weekly IS 'Weekly top sellers aggregated by week';

CREATE OR REPLACE VIEW top_sellers_monthly AS
SELECT
  DATE_TRUNC('month', si.recorded_at)::DATE AS month_start,
  si.menu_item_id,
  si.item_name,
  si.category,
  SUM(si.quantity) AS total_quantity,
  SUM(si.total_price) AS total_revenue,
  COUNT(DISTINCT si.recorded_at::DATE) AS days_sold,
  ROUND(AVG(si.unit_price), 2) AS avg_unit_price
FROM sales_items si
GROUP BY DATE_TRUNC('month', si.recorded_at)::DATE, si.menu_item_id, si.item_name, si.category
ORDER BY month_start DESC, total_revenue DESC;

COMMENT ON VIEW top_sellers_monthly IS 'Monthly top sellers aggregated by month';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE sales_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_import_logs ENABLE ROW LEVEL SECURITY;

-- Sales items: Managers and owner can read
CREATE POLICY "Managers can read sales items"
ON sales_items FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'owner')
);

CREATE POLICY "Managers can insert sales items"
ON sales_items FOR INSERT
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Shift sales: Staff can read own shift sales, managers can read all
CREATE POLICY "Staff can read own shift sales"
ON shift_sales FOR SELECT
USING (
  shift_id IN (SELECT id FROM shifts WHERE employee_id = (SELECT id FROM employees WHERE profile_id = auth.uid())) OR
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'owner')
);

CREATE POLICY "Managers can insert shift sales"
ON shift_sales FOR INSERT
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

CREATE POLICY "Managers can update shift sales"
ON shift_sales FOR UPDATE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Sales import logs: Managers and owner can read
CREATE POLICY "Managers can read import logs"
ON sales_import_logs FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'owner')
);

CREATE POLICY "Managers can insert import logs"
ON sales_import_logs FOR INSERT
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get sales comparison for a specific date
CREATE OR REPLACE FUNCTION get_sales_comparison(target_date DATE)
RETURNS TABLE (
  report_date DATE,
  current_revenue DECIMAL(10, 2),
  current_tickets INTEGER,
  week_ago_revenue DECIMAL(10, 2),
  week_ago_tickets INTEGER,
  week_variance_pct DECIMAL(5, 2),
  month_ago_revenue DECIMAL(10, 2),
  month_ago_tickets INTEGER,
  month_variance_pct DECIMAL(5, 2),
  year_ago_revenue DECIMAL(10, 2),
  year_ago_tickets INTEGER,
  year_variance_pct DECIMAL(5, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    target_date AS report_date,
    COALESCE(current_data.total_revenue, 0) AS current_revenue,
    COALESCE(current_data.ticket_count, 0) AS current_tickets,
    COALESCE(week_ago.total_revenue, 0) AS week_ago_revenue,
    COALESCE(week_ago.ticket_count, 0) AS week_ago_tickets,
    CASE
      WHEN week_ago.total_revenue > 0 THEN
        ROUND(((current_data.total_revenue - week_ago.total_revenue) / week_ago.total_revenue * 100), 2)
      ELSE 0
    END AS week_variance_pct,
    COALESCE(month_ago.total_revenue, 0) AS month_ago_revenue,
    COALESCE(month_ago.ticket_count, 0) AS month_ago_tickets,
    CASE
      WHEN month_ago.total_revenue > 0 THEN
        ROUND(((current_data.total_revenue - month_ago.total_revenue) / month_ago.total_revenue * 100), 2)
      ELSE 0
    END AS month_variance_pct,
    COALESCE(year_ago.total_revenue, 0) AS year_ago_revenue,
    COALESCE(year_ago.ticket_count, 0) AS year_ago_tickets,
    CASE
      WHEN year_ago.total_revenue > 0 THEN
        ROUND(((current_data.total_revenue - year_ago.total_revenue) / year_ago.total_revenue * 100), 2)
      ELSE 0
    END AS year_variance_pct
  FROM
    (SELECT total_revenue, ticket_count FROM daily_sales WHERE date = target_date) AS current_data,
    (SELECT total_revenue, ticket_count FROM daily_sales WHERE date = target_date - INTERVAL '7 days') AS week_ago,
    (SELECT total_revenue, ticket_count FROM daily_sales WHERE date = target_date - INTERVAL '30 days') AS month_ago,
    (SELECT total_revenue, ticket_count FROM daily_sales WHERE date = target_date - INTERVAL '365 days') AS year_ago;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_sales_comparison IS 'Get sales data with week/month/year comparisons for a specific date';

-- Function to get top sellers for date range
CREATE OR REPLACE FUNCTION get_top_sellers(
  start_date DATE,
  end_date DATE,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  menu_item_id UUID,
  item_name VARCHAR(255),
  category VARCHAR(100),
  total_quantity BIGINT,
  total_revenue NUMERIC,
  avg_unit_price NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    si.menu_item_id,
    si.item_name,
    si.category,
    SUM(si.quantity)::BIGINT AS total_quantity,
    SUM(si.total_price)::NUMERIC AS total_revenue,
    ROUND(AVG(si.unit_price), 2)::NUMERIC AS avg_unit_price
  FROM sales_items si
  WHERE si.recorded_at::DATE BETWEEN start_date AND end_date
  GROUP BY si.menu_item_id, si.item_name, si.category
  ORDER BY SUM(si.total_price) DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_top_sellers IS 'Get top selling items by revenue for a date range';

-- Function to calculate ticket average for date range
CREATE OR REPLACE FUNCTION get_ticket_average(
  start_date DATE,
  end_date DATE
)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
  total_rev DECIMAL(10, 2);
  total_tickets INTEGER;
BEGIN
  SELECT
    COALESCE(SUM(total_revenue), 0),
    COALESCE(SUM(ticket_count), 0)
  INTO total_rev, total_tickets
  FROM daily_sales
  WHERE date BETWEEN start_date AND end_date;

  IF total_tickets > 0 THEN
    RETURN ROUND(total_rev / total_tickets, 2);
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_ticket_average IS 'Calculate average ticket value for a date range';

-- ============================================================================
-- SAMPLE DATA NOTES
-- ============================================================================

-- To populate sales_items from existing menu orders, run:
-- INSERT INTO sales_items (daily_sales_id, menu_item_id, item_name, category, quantity, unit_price, total_price, recorded_at)
-- SELECT ds.id, mi.id, mi.name_en, mc.name, 1, mi.price, mi.price, ds.created_at
-- FROM daily_sales ds
-- CROSS JOIN menu_items mi
-- JOIN menu_categories mc ON mi.category_id = mc.id
-- WHERE ds.date >= '2024-04-01' AND RANDOM() < 0.3; -- Sample 30% for demo
