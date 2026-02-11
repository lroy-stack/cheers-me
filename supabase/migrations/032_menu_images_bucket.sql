-- Migration: Menu images bucket + QR tracking
-- Creates storage bucket for menu item images and adds QR version tracking

-- 1. Create menu-images bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS: managers/admins can upload menu images
CREATE POLICY "Managers upload menu images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'menu-images'
  AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')
  )
);

-- 3. RLS: managers/admins can update/delete menu images
CREATE POLICY "Managers manage menu images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'menu-images'
  AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "Managers delete menu images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'menu-images'
  AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')
  )
);

-- 4. RLS: public read for menu images
CREATE POLICY "Public read menu images"
ON storage.objects FOR SELECT
USING (bucket_id = 'menu-images');

-- 5. Add QR version tracking column
ALTER TABLE tables ADD COLUMN IF NOT EXISTS qr_generated_at TIMESTAMPTZ;

-- 6. Recreate v_menu_items_with_allergens with German + cocktail fields
-- Must DROP + CREATE because column set changes (can't use CREATE OR REPLACE)
DROP VIEW IF EXISTS v_menu_items_with_allergens;
CREATE VIEW v_menu_items_with_allergens AS
SELECT
  mi.id,
  mi.category_id,
  mc.name_en AS category_name_en,
  mc.name_nl AS category_name_nl,
  mc.name_es AS category_name_es,
  mc.name_de AS category_name_de,
  mi.name_en,
  mi.name_nl,
  mi.name_es,
  mi.name_de,
  mi.description_en,
  mi.description_nl,
  mi.description_es,
  mi.description_de,
  mi.price,
  mi.cost_of_goods,
  ROUND(((mi.price - COALESCE(mi.cost_of_goods, 0)) / NULLIF(mi.price, 0)) * 100, 2) AS margin_percentage,
  mi.photo_url,
  mi.prep_time_minutes,
  mi.available,
  mi.sort_order,
  mi.created_at,
  mi.updated_at,
  ARRAY_AGG(ma.allergen ORDER BY ma.allergen) FILTER (WHERE ma.allergen IS NOT NULL) AS allergens,
  -- Cocktail recipe fields (LEFT JOIN)
  cr.glass_type,
  cr.preparation_method,
  cr.difficulty_level,
  cr.base_spirit,
  cr.garnish,
  cr.flavor_profiles,
  cr.is_signature
FROM menu_items mi
JOIN menu_categories mc ON mi.category_id = mc.id
LEFT JOIN menu_allergens ma ON mi.id = ma.menu_item_id
LEFT JOIN cocktail_recipes cr ON cr.menu_item_id = mi.id
GROUP BY
  mi.id,
  mi.category_id,
  mc.name_en,
  mc.name_nl,
  mc.name_es,
  mc.name_de,
  mi.name_en,
  mi.name_nl,
  mi.name_es,
  mi.name_de,
  mi.description_en,
  mi.description_nl,
  mi.description_es,
  mi.description_de,
  mi.price,
  mi.cost_of_goods,
  mi.photo_url,
  mi.prep_time_minutes,
  mi.available,
  mi.sort_order,
  mi.created_at,
  mi.updated_at,
  cr.glass_type,
  cr.preparation_method,
  cr.difficulty_level,
  cr.base_spirit,
  cr.garnish,
  cr.flavor_profiles,
  cr.is_signature,
  mc.sort_order
ORDER BY mc.sort_order, mi.sort_order;
