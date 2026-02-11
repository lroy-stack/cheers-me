-- ============================================================================
-- Migration 019: Sales & Expense Tax Compliance
-- Adds IVA tracking, tax declarations (Modelo 303/111/347),
-- digital signatures, AI audit log, and company fiscal data
-- ============================================================================

-- 1. Enhance overhead_expenses for Spanish fiscal compliance
ALTER TABLE overhead_expenses ADD COLUMN IF NOT EXISTS factura_number VARCHAR(50);
ALTER TABLE overhead_expenses ADD COLUMN IF NOT EXISTS supplier_nif VARCHAR(20);
ALTER TABLE overhead_expenses ADD COLUMN IF NOT EXISTS iva_rate DECIMAL(5,2) DEFAULT 21.00;
ALTER TABLE overhead_expenses ADD COLUMN IF NOT EXISTS iva_amount DECIMAL(10,2);
ALTER TABLE overhead_expenses ADD COLUMN IF NOT EXISTS base_imponible DECIMAL(10,2);
ALTER TABLE overhead_expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE overhead_expenses ADD COLUMN IF NOT EXISTS is_deductible BOOLEAN DEFAULT true;
ALTER TABLE overhead_expenses ADD COLUMN IF NOT EXISTS expense_subcategory VARCHAR(50);

-- 2. IVA breakdown per daily sales (food=10%, alcohol=21%)
CREATE TABLE IF NOT EXISTS sales_iva_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  category VARCHAR(50) NOT NULL,
  base_imponible DECIMAL(10,2) NOT NULL,
  iva_rate DECIMAL(5,2) NOT NULL,
  iva_amount DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, category)
);

CREATE INDEX IF NOT EXISTS idx_sales_iva_date ON sales_iva_breakdown(date);

-- 3. Tax declarations tracking (Modelos 303, 111, 347)
CREATE TABLE IF NOT EXISTS tax_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo VARCHAR(10) NOT NULL,
  period_label VARCHAR(50) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  iva_repercutido DECIMAL(12,2),
  iva_soportado DECIMAL(12,2),
  iva_resultado DECIMAL(12,2),
  irpf_retenido DECIMAL(12,2),
  total_operaciones DECIMAL(12,2),
  status VARCHAR(20) DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  notes TEXT,
  generated_by UUID REFERENCES profiles ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Digital signatures
CREATE TABLE IF NOT EXISTS digital_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  document_id UUID NOT NULL,
  signature_url TEXT NOT NULL,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address VARCHAR(45)
);

-- 5. AI audit log
CREATE TABLE IF NOT EXISTS ai_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  tool_name TEXT NOT NULL,
  parameters JSONB NOT NULL,
  result JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Company fiscal data in restaurant_settings
INSERT INTO restaurant_settings (key, value) VALUES
  ('company_fiscal', '{
    "razon_social": "GrandCafe Cheers S.L.",
    "cif": "B-XXXXXXXX",
    "direccion": "Carrer de Cartago 22",
    "codigo_postal": "07600",
    "ciudad": "El Arenal (Platja de Palma)",
    "provincia": "Mallorca",
    "pais": "Espana",
    "telefono": "+34 XXX XXX XXX",
    "email": "info@grandcafecheers.com"
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 7. RLS policies
ALTER TABLE sales_iva_breakdown ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY iva_read ON sales_iva_breakdown FOR SELECT USING (true);
CREATE POLICY iva_write ON sales_iva_breakdown FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','owner')));

CREATE POLICY tax_read ON tax_declarations FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','owner')));
CREATE POLICY tax_write ON tax_declarations FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','owner')));

CREATE POLICY sig_read ON digital_signatures FOR SELECT USING (true);
CREATE POLICY sig_write ON digital_signatures FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY audit_read ON ai_audit_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','owner')));
CREATE POLICY audit_write ON ai_audit_log FOR INSERT WITH CHECK (true);

-- 8. RPC: Calculate daily IVA breakdown from daily_sales
CREATE OR REPLACE FUNCTION calculate_daily_iva(target_date DATE)
RETURNS void AS $$
DECLARE
  ds RECORD;
BEGIN
  SELECT * INTO ds FROM daily_sales WHERE date = target_date;
  IF NOT FOUND THEN RETURN; END IF;

  -- Food (10% IVA reducido)
  INSERT INTO sales_iva_breakdown (date, category, base_imponible, iva_rate, iva_amount, total)
  VALUES (target_date, 'food',
    ROUND(ds.food_revenue / 1.10, 2), 10.00,
    ROUND(ds.food_revenue - ds.food_revenue / 1.10, 2), ds.food_revenue)
  ON CONFLICT (date, category) DO UPDATE SET
    base_imponible = EXCLUDED.base_imponible, iva_amount = EXCLUDED.iva_amount, total = EXCLUDED.total;

  -- Non-alcoholic drinks (10% IVA) — using desserts_revenue as proxy
  INSERT INTO sales_iva_breakdown (date, category, base_imponible, iva_rate, iva_amount, total)
  VALUES (target_date, 'non_alcoholic',
    ROUND(ds.dessert_revenue / 1.10, 2), 10.00,
    ROUND(ds.dessert_revenue - ds.dessert_revenue / 1.10, 2), ds.dessert_revenue)
  ON CONFLICT (date, category) DO UPDATE SET
    base_imponible = EXCLUDED.base_imponible, iva_amount = EXCLUDED.iva_amount, total = EXCLUDED.total;

  -- Alcoholic beverages (21% IVA general)
  INSERT INTO sales_iva_breakdown (date, category, base_imponible, iva_rate, iva_amount, total)
  VALUES (target_date, 'alcoholic',
    ROUND((ds.drink_revenue + ds.cocktail_revenue) / 1.21, 2), 21.00,
    ROUND((ds.drink_revenue + ds.cocktail_revenue) - (ds.drink_revenue + ds.cocktail_revenue) / 1.21, 2),
    ds.drink_revenue + ds.cocktail_revenue)
  ON CONFLICT (date, category) DO UPDATE SET
    base_imponible = EXCLUDED.base_imponible, iva_amount = EXCLUDED.iva_amount, total = EXCLUDED.total;

  -- Other (21% IVA)
  IF ds.other_revenue > 0 THEN
    INSERT INTO sales_iva_breakdown (date, category, base_imponible, iva_rate, iva_amount, total)
    VALUES (target_date, 'other',
      ROUND(ds.other_revenue / 1.21, 2), 21.00,
      ROUND(ds.other_revenue - ds.other_revenue / 1.21, 2), ds.other_revenue)
    ON CONFLICT (date, category) DO UPDATE SET
      base_imponible = EXCLUDED.base_imponible, iva_amount = EXCLUDED.iva_amount, total = EXCLUDED.total;
  END IF;
END;
$$ LANGUAGE plpgsql;
