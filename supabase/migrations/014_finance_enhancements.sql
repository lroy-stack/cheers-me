-- ============================================================================
-- Finance & Reporting Enhancements
-- Module: M9 - Finance & Reporting
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Transaction types for cash flow tracking
DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM (
    'sale', 'purchase', 'labor', 'overhead', 'tax', 'investment', 'withdrawal'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Payment methods
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM (
    'cash', 'card', 'transfer', 'other'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- CASH FLOW TRACKING
-- ============================================================================

-- Cash flow transactions for detailed tracking
CREATE TABLE IF NOT EXISTS cash_flow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  transaction_type transaction_type NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method payment_method NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  reference_id UUID,
  reference_table VARCHAR(100),
  created_by UUID REFERENCES employees ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_cash_flow_date ON cash_flow_transactions(date);
CREATE INDEX IF NOT EXISTS idx_cash_flow_type ON cash_flow_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_cash_flow_category ON cash_flow_transactions(category);

-- Enable RLS
ALTER TABLE cash_flow_transactions ENABLE ROW LEVEL SECURITY;

-- RLS: Only managers, admins, and owners can see cash flow
CREATE POLICY "Managers and owners can read cash flow"
ON cash_flow_transactions FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'owner')
);

CREATE POLICY "Managers can insert cash flow"
ON cash_flow_transactions FOR INSERT
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

CREATE POLICY "Managers can update cash flow"
ON cash_flow_transactions FOR UPDATE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- ============================================================================
-- TAX TRACKING
-- ============================================================================

-- Tax periods and calculations
CREATE TABLE IF NOT EXISTS tax_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_name VARCHAR(100) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  taxable_revenue DECIMAL(10, 2) DEFAULT 0,
  tax_rate DECIMAL(5, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  deductions DECIMAL(10, 2) DEFAULT 0,
  net_tax_payable DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  exported_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tax_periods ENABLE ROW LEVEL SECURITY;

-- RLS: Only managers, admins, and owners can see tax data
CREATE POLICY "Managers and owners can read tax periods"
ON tax_periods FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'owner')
);

CREATE POLICY "Managers can manage tax periods"
ON tax_periods FOR ALL
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- ============================================================================
-- OVERHEAD EXPENSES
-- ============================================================================

-- Detailed overhead tracking (rent, utilities, licenses, etc.)
CREATE TABLE IF NOT EXISTS overhead_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_frequency VARCHAR(50),
  vendor VARCHAR(255),
  invoice_number VARCHAR(100),
  payment_due_date DATE,
  payment_date DATE,
  payment_method payment_method,
  notes TEXT,
  created_by UUID REFERENCES employees ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for queries
CREATE INDEX IF NOT EXISTS idx_overhead_date ON overhead_expenses(date);
CREATE INDEX IF NOT EXISTS idx_overhead_category ON overhead_expenses(category);

-- Enable RLS
ALTER TABLE overhead_expenses ENABLE ROW LEVEL SECURITY;

-- RLS: Only managers, admins, and owners can see overhead
CREATE POLICY "Managers and owners can read overhead"
ON overhead_expenses FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'owner')
);

CREATE POLICY "Managers can manage overhead"
ON overhead_expenses FOR ALL
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- ============================================================================
-- FINANCIAL TARGETS & BENCHMARKS
-- ============================================================================

-- Target ratios and KPIs for comparison
CREATE TABLE IF NOT EXISTS financial_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_food_cost_ratio DECIMAL(5, 2) DEFAULT 30.00,
  target_beverage_cost_ratio DECIMAL(5, 2) DEFAULT 22.00,
  target_labor_cost_ratio DECIMAL(5, 2) DEFAULT 30.00,
  target_revenue DECIMAL(10, 2),
  target_profit_margin DECIMAL(5, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE financial_targets ENABLE ROW LEVEL SECURITY;

-- RLS: Only managers, admins, and owners can see targets
CREATE POLICY "Managers and owners can read targets"
ON financial_targets FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'owner')
);

CREATE POLICY "Managers can manage targets"
ON financial_targets FOR ALL
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- ============================================================================
-- VIEWS FOR AGGREGATED REPORTING
-- ============================================================================

-- Weekly financial summary view
CREATE OR REPLACE VIEW weekly_financials AS
SELECT
  DATE_TRUNC('week', date)::DATE as week_start,
  DATE_TRUNC('week', date)::DATE + INTERVAL '6 days' as week_end,
  SUM(revenue) as total_revenue,
  SUM(cost_of_goods_sold) as total_cogs,
  SUM(labor_cost) as total_labor,
  SUM(overhead_cost) as total_overhead,
  SUM(profit) as total_profit,
  AVG(food_cost_ratio) as avg_food_cost_ratio,
  AVG(beverage_cost_ratio) as avg_beverage_cost_ratio,
  AVG(labor_cost_ratio) as avg_labor_cost_ratio,
  COUNT(*) as days_with_data
FROM daily_financials
GROUP BY DATE_TRUNC('week', date)
ORDER BY week_start DESC;

-- Monthly financial summary view
CREATE OR REPLACE VIEW monthly_financials AS
SELECT
  DATE_TRUNC('month', date)::DATE as month_start,
  (DATE_TRUNC('month', date) + INTERVAL '1 month - 1 day')::DATE as month_end,
  EXTRACT(YEAR FROM date) as year,
  EXTRACT(MONTH FROM date) as month,
  SUM(revenue) as total_revenue,
  SUM(cost_of_goods_sold) as total_cogs,
  SUM(labor_cost) as total_labor,
  SUM(overhead_cost) as total_overhead,
  SUM(profit) as total_profit,
  AVG(food_cost_ratio) as avg_food_cost_ratio,
  AVG(beverage_cost_ratio) as avg_beverage_cost_ratio,
  AVG(labor_cost_ratio) as avg_labor_cost_ratio,
  CASE
    WHEN SUM(revenue) > 0 THEN (SUM(profit) / SUM(revenue) * 100)
    ELSE 0
  END as profit_margin,
  COUNT(*) as days_with_data
FROM daily_financials
GROUP BY DATE_TRUNC('month', date), EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date)
ORDER BY month_start DESC;

-- Budget vs Actual comparison view
CREATE OR REPLACE VIEW budget_vs_actual AS
SELECT
  b.id as budget_id,
  b.category,
  b.amount as budget_amount,
  b.period_start,
  b.period_end,
  COALESCE(SUM(
    CASE
      WHEN b.category = 'revenue' THEN df.revenue
      WHEN b.category = 'cogs' THEN df.cost_of_goods_sold
      WHEN b.category = 'labor' THEN df.labor_cost
      WHEN b.category = 'overhead' THEN df.overhead_cost
      ELSE 0
    END
  ), 0) as actual_amount,
  b.amount - COALESCE(SUM(
    CASE
      WHEN b.category = 'revenue' THEN df.revenue
      WHEN b.category = 'cogs' THEN df.cost_of_goods_sold
      WHEN b.category = 'labor' THEN df.labor_cost
      WHEN b.category = 'overhead' THEN df.overhead_cost
      ELSE 0
    END
  ), 0) as variance,
  CASE
    WHEN b.amount > 0 THEN
      ((b.amount - COALESCE(SUM(
        CASE
          WHEN b.category = 'revenue' THEN df.revenue
          WHEN b.category = 'cogs' THEN df.cost_of_goods_sold
          WHEN b.category = 'labor' THEN df.labor_cost
          WHEN b.category = 'overhead' THEN df.overhead_cost
          ELSE 0
        END
      ), 0)) / b.amount * 100)
    ELSE 0
  END as variance_percentage
FROM budget b
LEFT JOIN daily_financials df ON df.date BETWEEN b.period_start AND b.period_end
GROUP BY b.id, b.category, b.amount, b.period_start, b.period_end
ORDER BY b.period_start DESC, b.category;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to calculate daily financials from various sources
CREATE OR REPLACE FUNCTION calculate_daily_financials(target_date DATE)
RETURNS VOID AS $$
DECLARE
  v_revenue DECIMAL(10, 2);
  v_cogs DECIMAL(10, 2);
  v_labor DECIMAL(10, 2);
  v_overhead DECIMAL(10, 2);
  v_profit DECIMAL(10, 2);
  v_food_revenue DECIMAL(10, 2);
  v_drink_revenue DECIMAL(10, 2);
  v_food_cost_ratio DECIMAL(5, 2);
  v_beverage_cost_ratio DECIMAL(5, 2);
  v_labor_cost_ratio DECIMAL(5, 2);
BEGIN
  -- Get revenue from daily_sales
  SELECT
    COALESCE(total_revenue, 0),
    COALESCE(food_revenue, 0),
    COALESCE(drinks_revenue + cocktails_revenue, 0)
  INTO v_revenue, v_food_revenue, v_drink_revenue
  FROM daily_sales
  WHERE date = target_date;

  -- Calculate COGS from stock movements (simplified)
  SELECT COALESCE(SUM(sm.quantity * p.cost_per_unit), 0)
  INTO v_cogs
  FROM stock_movements sm
  JOIN products p ON sm.product_id = p.id
  WHERE DATE(sm.created_at AT TIME ZONE 'Europe/Madrid') = target_date
    AND sm.movement_type = 'out';

  -- Calculate labor cost from clock_in_out
  SELECT COALESCE(SUM(
    EXTRACT(EPOCH FROM (
      COALESCE(cio.clock_out_time, NOW()) - cio.clock_in_time
    )) / 3600 * e.hourly_rate
  ), 0)
  INTO v_labor
  FROM clock_in_out cio
  JOIN employees e ON cio.employee_id = e.id
  WHERE DATE(cio.clock_in_time AT TIME ZONE 'Europe/Madrid') = target_date;

  -- Get overhead from overhead_expenses
  SELECT COALESCE(SUM(amount), 0)
  INTO v_overhead
  FROM overhead_expenses
  WHERE date = target_date;

  -- Calculate profit
  v_profit := v_revenue - v_cogs - v_labor - v_overhead;

  -- Calculate ratios
  IF v_food_revenue > 0 THEN
    v_food_cost_ratio := (v_cogs / v_food_revenue * 100);
  ELSE
    v_food_cost_ratio := 0;
  END IF;

  IF v_drink_revenue > 0 THEN
    v_beverage_cost_ratio := (v_cogs / v_drink_revenue * 100);
  ELSE
    v_beverage_cost_ratio := 0;
  END IF;

  IF v_revenue > 0 THEN
    v_labor_cost_ratio := (v_labor / v_revenue * 100);
  ELSE
    v_labor_cost_ratio := 0;
  END IF;

  -- Insert or update daily_financials
  INSERT INTO daily_financials (
    date,
    revenue,
    cost_of_goods_sold,
    labor_cost,
    overhead_cost,
    profit,
    food_cost_ratio,
    beverage_cost_ratio,
    labor_cost_ratio
  ) VALUES (
    target_date,
    v_revenue,
    v_cogs,
    v_labor,
    v_overhead,
    v_profit,
    v_food_cost_ratio,
    v_beverage_cost_ratio,
    v_labor_cost_ratio
  )
  ON CONFLICT (date) DO UPDATE SET
    revenue = EXCLUDED.revenue,
    cost_of_goods_sold = EXCLUDED.cost_of_goods_sold,
    labor_cost = EXCLUDED.labor_cost,
    overhead_cost = EXCLUDED.overhead_cost,
    profit = EXCLUDED.profit,
    food_cost_ratio = EXCLUDED.food_cost_ratio,
    beverage_cost_ratio = EXCLUDED.beverage_cost_ratio,
    labor_cost_ratio = EXCLUDED.labor_cost_ratio,
    updated_at = NOW();

END;
$$ LANGUAGE plpgsql;

-- Function to generate tax export data
CREATE OR REPLACE FUNCTION generate_tax_export(start_date DATE, end_date DATE)
RETURNS TABLE (
  transaction_date DATE,
  category VARCHAR(100),
  description TEXT,
  revenue DECIMAL(10, 2),
  expenses DECIMAL(10, 2),
  tax_amount DECIMAL(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    df.date as transaction_date,
    'Revenue'::VARCHAR(100) as category,
    'Daily Revenue'::TEXT as description,
    df.revenue,
    0::DECIMAL(10, 2) as expenses,
    df.revenue * 0.21 as tax_amount -- Spanish VAT rate example
  FROM daily_financials df
  WHERE df.date BETWEEN start_date AND end_date

  UNION ALL

  SELECT
    oe.date as transaction_date,
    oe.category,
    oe.description,
    0::DECIMAL(10, 2) as revenue,
    oe.amount as expenses,
    oe.amount * 0.21 as tax_amount
  FROM overhead_expenses oe
  WHERE oe.date BETWEEN start_date AND end_date

  ORDER BY transaction_date, category;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp on cash_flow_transactions
CREATE OR REPLACE FUNCTION update_cash_flow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cash_flow_updated_at
BEFORE UPDATE ON cash_flow_transactions
FOR EACH ROW
EXECUTE FUNCTION update_cash_flow_updated_at();

-- Update timestamp on overhead_expenses
CREATE OR REPLACE FUNCTION update_overhead_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER overhead_updated_at
BEFORE UPDATE ON overhead_expenses
FOR EACH ROW
EXECUTE FUNCTION update_overhead_updated_at();

-- Update timestamp on tax_periods
CREATE OR REPLACE FUNCTION update_tax_periods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tax_periods_updated_at
BEFORE UPDATE ON tax_periods
FOR EACH ROW
EXECUTE FUNCTION update_tax_periods_updated_at();

-- Update timestamp on financial_targets
CREATE OR REPLACE FUNCTION update_financial_targets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER financial_targets_updated_at
BEFORE UPDATE ON financial_targets
FOR EACH ROW
EXECUTE FUNCTION update_financial_targets_updated_at();

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert default financial targets for 2024 season
INSERT INTO financial_targets (
  period_start,
  period_end,
  target_food_cost_ratio,
  target_beverage_cost_ratio,
  target_labor_cost_ratio,
  target_profit_margin,
  notes
) VALUES (
  '2024-04-01',
  '2024-11-01',
  30.00,
  22.00,
  30.00,
  25.00,
  'Season 2024 targets (April 1 - November 1)'
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE cash_flow_transactions IS 'Detailed cash flow tracking for all financial transactions';
COMMENT ON TABLE tax_periods IS 'Tax period calculations and export data';
COMMENT ON TABLE overhead_expenses IS 'Overhead expenses: rent, utilities, licenses, insurance, etc.';
COMMENT ON TABLE financial_targets IS 'Target ratios and KPIs for performance comparison';
COMMENT ON VIEW weekly_financials IS 'Weekly aggregated financial data';
COMMENT ON VIEW monthly_financials IS 'Monthly aggregated financial data with profit margin';
COMMENT ON VIEW budget_vs_actual IS 'Budget vs actual comparison with variance';
COMMENT ON FUNCTION calculate_daily_financials IS 'Calculates and updates daily financial metrics from all sources';
COMMENT ON FUNCTION generate_tax_export IS 'Generates tax-ready export data for accountant';
