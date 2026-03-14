-- Migration 070: Add sizes JSONB column + new menu categories
-- Date: 2026-03-14

-- Add sizes column for items with multiple size/price variants (beers S/M/L, sangria copa/jarra)
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS sizes JSONB DEFAULT NULL;
COMMENT ON COLUMN menu_items.sizes IS 'Optional size variants with prices. Example: {"S": 3.00, "M": 4.00, "L": 6.00}. If set, frontend shows size picker. price column remains the default/medium price.';

-- New categories
INSERT INTO menu_categories (id, name_en, name_es, name_nl, name_de, sort_order) VALUES
  ('c0000001-0000-0000-0000-000000000014', 'Liqueurs & Spirits', 'Licores', 'Likeuren & Spirits', 'Liköre & Spirituosen', 14),
  ('c0000001-0000-0000-0000-000000000015', 'Longdrinks', 'Combinados', 'Longdrinks', 'Longdrinks', 15),
  ('c0000001-0000-0000-0000-000000000016', 'Table Bottles', 'Botellas de Mesa', 'Flessen Service', 'Flaschenservice', 16),
  ('c0000001-0000-0000-0000-000000000017', 'Towers', 'Torres', 'Torens', 'Türme', 17)
ON CONFLICT (id) DO NOTHING;
