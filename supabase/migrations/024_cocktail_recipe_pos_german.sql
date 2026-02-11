-- Migration 024: Cocktail Recipes, POS Integrations, German Language Support
-- GrandCafe Cheers Mallorca

-- ============================================================================
-- 1a. GERMAN LANGUAGE SUPPORT
-- ============================================================================

ALTER TABLE menu_categories ADD COLUMN IF NOT EXISTS name_de VARCHAR(100);
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS name_de VARCHAR(255);
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS description_de TEXT;

-- ============================================================================
-- 1b. COCKTAIL RECIPES
-- ============================================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE preparation_method AS ENUM ('shaken','stirred','built','blended','layered','muddled','thrown');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE glass_type AS ENUM ('rocks','highball','coupe','martini','collins','hurricane','wine','champagne_flute','copper_mug','tiki','shot','beer_glass','snifter','irish_coffee');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ice_type AS ENUM ('cubed','crushed','large_cube','sphere','none','frozen_glass');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE difficulty_level AS ENUM ('easy','medium','advanced');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE flavor_profile AS ENUM ('sweet','sour','bitter','spirit_forward','tropical','refreshing','creamy','spicy','herbal','smoky','fruity','coffee');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Recipes table (1:1 with menu_items for cocktails only)
CREATE TABLE IF NOT EXISTS cocktail_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL UNIQUE REFERENCES menu_items(id) ON DELETE CASCADE,
  glass_type glass_type NOT NULL DEFAULT 'rocks',
  preparation_method preparation_method NOT NULL DEFAULT 'built',
  ice_type ice_type NOT NULL DEFAULT 'cubed',
  difficulty_level difficulty_level NOT NULL DEFAULT 'easy',
  base_spirit VARCHAR(100),
  garnish VARCHAR(255),
  flavor_profiles flavor_profile[] NOT NULL DEFAULT '{}',
  is_signature BOOLEAN DEFAULT false,
  video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Preparation steps (multilingual, for staff training)
CREATE TABLE IF NOT EXISTS cocktail_preparation_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES cocktail_recipes(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  instruction_en TEXT NOT NULL,
  instruction_nl TEXT,
  instruction_es TEXT,
  instruction_de TEXT,
  duration_seconds INTEGER,
  tip TEXT,
  UNIQUE(recipe_id, step_number)
);

-- ============================================================================
-- 1c. ENHANCE menu_ingredients
-- ============================================================================

-- Rename ingredient_name to name for consistency
ALTER TABLE menu_ingredients RENAME COLUMN ingredient_name TO name;

-- Add missing columns needed for cost tracking and stock linking
ALTER TABLE menu_ingredients
ADD COLUMN IF NOT EXISTS cost_per_unit DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_garnish BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_optional BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- ============================================================================
-- 1d. POS INTEGRATIONS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE pos_provider AS ENUM ('square','sumup','lightspeed','toast','custom');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pos_sync_status AS ENUM ('active','paused','error','disconnected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS pos_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider pos_provider NOT NULL,
  name VARCHAR(255) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  status pos_sync_status NOT NULL DEFAULT 'disconnected',
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  sync_catalog BOOLEAN DEFAULT true,
  sync_orders BOOLEAN DEFAULT true,
  sync_payments BOOLEAN DEFAULT true,
  sync_inventory BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pos_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES pos_integrations(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'started',
  records_processed INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_details JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS pos_item_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES pos_integrations(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  external_item_id VARCHAR(255) NOT NULL,
  external_item_name VARCHAR(255),
  UNIQUE(integration_id, menu_item_id),
  UNIQUE(integration_id, external_item_id)
);

-- ============================================================================
-- 1e. VIEWS
-- ============================================================================

-- Drop and recreate menu items view to include cocktail and german fields
CREATE OR REPLACE VIEW v_menu_items_full AS
SELECT
  mi.*,
  mc.name_en AS category_name_en,
  mc.name_nl AS category_name_nl,
  mc.name_es AS category_name_es,
  mc.name_de AS category_name_de,
  mc.sort_order AS category_sort_order,
  cr.id AS recipe_id,
  cr.glass_type,
  cr.preparation_method,
  cr.ice_type,
  cr.difficulty_level,
  cr.base_spirit,
  cr.garnish,
  cr.flavor_profiles,
  cr.is_signature,
  cr.video_url AS recipe_video_url,
  COALESCE(
    (SELECT SUM(ing.quantity * ing.cost_per_unit)
     FROM menu_ingredients ing
     WHERE ing.menu_item_id = mi.id),
    0
  ) AS calculated_cost
FROM menu_items mi
JOIN menu_categories mc ON mc.id = mi.category_id
LEFT JOIN cocktail_recipes cr ON cr.menu_item_id = mi.id;

-- Cocktail recipes full view with ingredients and steps
CREATE OR REPLACE VIEW v_cocktail_recipes_full AS
SELECT
  cr.*,
  mi.name_en, mi.name_nl, mi.name_es, mi.name_de,
  mi.description_en, mi.description_nl, mi.description_es, mi.description_de,
  mi.price,
  mi.photo_url,
  mi.prep_time_minutes,
  mc.name_en AS category_name_en,
  COALESCE(
    (SELECT SUM(ing.quantity * ing.cost_per_unit)
     FROM menu_ingredients ing
     WHERE ing.menu_item_id = mi.id),
    0
  ) AS total_cost,
  COALESCE(
    (SELECT json_agg(
      json_build_object(
        'id', ing.id,
        'name', ing.name,
        'quantity', ing.quantity,
        'unit', ing.unit,
        'cost_per_unit', ing.cost_per_unit,
        'product_id', ing.product_id,
        'is_garnish', ing.is_garnish,
        'is_optional', ing.is_optional,
        'sort_order', ing.sort_order
      ) ORDER BY ing.sort_order
    )
    FROM menu_ingredients ing
    WHERE ing.menu_item_id = mi.id),
    '[]'::json
  ) AS ingredients,
  COALESCE(
    (SELECT json_agg(
      json_build_object(
        'step_number', s.step_number,
        'instruction_en', s.instruction_en,
        'instruction_nl', s.instruction_nl,
        'instruction_es', s.instruction_es,
        'instruction_de', s.instruction_de,
        'duration_seconds', s.duration_seconds,
        'tip', s.tip
      ) ORDER BY s.step_number
    )
    FROM cocktail_preparation_steps s
    WHERE s.recipe_id = cr.id),
    '[]'::json
  ) AS steps
FROM cocktail_recipes cr
JOIN menu_items mi ON mi.id = cr.menu_item_id
JOIN menu_categories mc ON mc.id = mi.category_id;

-- ============================================================================
-- 1f. TRIGGERS
-- ============================================================================

-- Auto-update updated_at for cocktail_recipes
CREATE OR REPLACE FUNCTION update_cocktail_recipe_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cocktail_recipe_updated ON cocktail_recipes;
CREATE TRIGGER trg_cocktail_recipe_updated
  BEFORE UPDATE ON cocktail_recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_cocktail_recipe_timestamp();

-- Auto-update updated_at for pos_integrations
DROP TRIGGER IF EXISTS trg_pos_integration_updated ON pos_integrations;
CREATE TRIGGER trg_pos_integration_updated
  BEFORE UPDATE ON pos_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_cocktail_recipe_timestamp();

-- Recalculate menu_item cost_of_goods when ingredients change
CREATE OR REPLACE FUNCTION recalculate_menu_item_cost()
RETURNS TRIGGER AS $$
DECLARE
  v_menu_item_id UUID;
  v_total_cost NUMERIC;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_menu_item_id := OLD.menu_item_id;
  ELSE
    v_menu_item_id := NEW.menu_item_id;
  END IF;

  SELECT COALESCE(SUM(quantity * cost_per_unit), 0)
  INTO v_total_cost
  FROM menu_ingredients
  WHERE menu_item_id = v_menu_item_id;

  UPDATE menu_items
  SET cost_of_goods = v_total_cost,
      updated_at = NOW()
  WHERE id = v_menu_item_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalc_menu_cost ON menu_ingredients;
CREATE TRIGGER trg_recalc_menu_cost
  AFTER INSERT OR UPDATE OR DELETE ON menu_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_menu_item_cost();

-- ============================================================================
-- 1g. RLS POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE cocktail_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cocktail_preparation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_item_mappings ENABLE ROW LEVEL SECURITY;

-- Cocktail recipes: public read, admin/manager/owner write
CREATE POLICY "cocktail_recipes_select" ON cocktail_recipes FOR SELECT USING (true);
CREATE POLICY "cocktail_recipes_all" ON cocktail_recipes FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager', 'owner')
  )
);

-- Cocktail preparation steps: public read, admin/manager/owner write
CREATE POLICY "cocktail_steps_select" ON cocktail_preparation_steps FOR SELECT USING (true);
CREATE POLICY "cocktail_steps_all" ON cocktail_preparation_steps FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager', 'owner')
  )
);

-- POS integrations: admin/manager/owner only
CREATE POLICY "pos_integrations_all" ON pos_integrations FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager', 'owner')
  )
);

CREATE POLICY "pos_sync_log_all" ON pos_sync_log FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager', 'owner')
  )
);

CREATE POLICY "pos_item_mappings_all" ON pos_item_mappings FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager', 'owner')
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cocktail_recipes_menu_item ON cocktail_recipes(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_cocktail_steps_recipe ON cocktail_preparation_steps(recipe_id);
CREATE INDEX IF NOT EXISTS idx_pos_sync_log_integration ON pos_sync_log(integration_id);
CREATE INDEX IF NOT EXISTS idx_pos_item_mappings_integration ON pos_item_mappings(integration_id);
CREATE INDEX IF NOT EXISTS idx_pos_item_mappings_menu_item ON pos_item_mappings(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_ingredients_product ON menu_ingredients(product_id);
