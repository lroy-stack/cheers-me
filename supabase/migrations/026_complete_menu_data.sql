-- Migration 026: Complete Menu Data — Bugfixes + Data Completion
-- Fixes: beer product units, serving_type column, menu items for drinks,
-- menu_ingredients for cocktails, menu_allergens for food, updated Makro costs

BEGIN;

-- ============================================================================
-- 1. ADD serving_type COLUMN TO products
-- ============================================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS serving_type VARCHAR(20)
  CHECK (serving_type IN ('draft', 'bottle', 'can'));
COMMENT ON COLUMN products.serving_type IS 'For beers: draft (keg), bottle, or can. NULL for non-beer products.';

-- ============================================================================
-- 2. FIX BEER PRODUCTS: unit + serving_type (22 real UUIDs from DB)
-- ============================================================================

-- 8 DRAFT beers (kegs)
UPDATE products SET serving_type = 'draft', unit = 'keg'
WHERE category = 'beer' AND name IN (
  'Heineken', 'Amstel', 'Estrella Damm', 'Mahou Cinco Estrellas',
  'Cruzcampo', 'San Miguel', 'Guinness', 'Paulaner Weissbier'
);

-- 14 BOTTLE beers
UPDATE products SET serving_type = 'bottle', unit = 'bottle'
WHERE category = 'beer' AND serving_type IS NULL;

-- Fix stock: draft beers should have reasonable keg stock (number of kegs)
-- bottle beers should have bottle count
UPDATE products SET current_stock = 2, min_stock = 1, max_stock = 4
WHERE category = 'beer' AND serving_type = 'draft';

UPDATE products SET current_stock = 24, min_stock = 6, max_stock = 48
WHERE category = 'beer' AND serving_type = 'bottle';

-- ============================================================================
-- 3. MENU ITEMS: Beers (from existing products, using INSERT...SELECT)
-- ============================================================================

INSERT INTO menu_items (id, category_id, name_en, name_nl, name_es, name_de, description_en, description_nl, description_es, description_de, price, available, sort_order)
SELECT
  gen_random_uuid(),
  'c0000001-0000-0000-0000-000000000010',
  p.name, p.name, p.name, p.name,
  CASE
    WHEN p.serving_type = 'draft' THEN 'Fresh draft ' || p.name
    ELSE p.name || ' bottle'
  END,
  CASE
    WHEN p.serving_type = 'draft' THEN 'Vers getapt ' || p.name
    ELSE p.name || ' flesje'
  END,
  CASE
    WHEN p.serving_type = 'draft' THEN p.name || ' de barril'
    ELSE p.name || ' botella'
  END,
  CASE
    WHEN p.serving_type = 'draft' THEN 'Frisch gezapftes ' || p.name
    ELSE p.name || ' Flasche'
  END,
  CASE
    WHEN p.serving_type = 'draft' THEN 4.50
    ELSE 3.50
  END,
  true,
  ROW_NUMBER() OVER (ORDER BY
    CASE WHEN p.serving_type = 'draft' THEN 0 ELSE 1 END,
    p.name
  )
FROM products p
WHERE p.category = 'beer'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. MENU ITEMS: Wines & Champagne (10 items)
-- ============================================================================

INSERT INTO menu_items (id, category_id, name_en, name_nl, name_es, name_de, description_en, description_nl, description_es, description_de, price, available, sort_order) VALUES
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000011', 'House Red Wine (Glass)', 'Huiswijn Rood (Glas)', 'Vino Tinto de la Casa (Copa)', 'Hauswein Rot (Glas)', 'Selected house red wine', 'Geselecteerde huiswijn rood', 'Vino tinto seleccionado de la casa', 'Ausgewählter Hausrotwein', 5.00, true, 1),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000011', 'House White Wine (Glass)', 'Huiswijn Wit (Glas)', 'Vino Blanco de la Casa (Copa)', 'Hauswein Weiß (Glas)', 'Selected house white wine', 'Geselecteerde huiswijn wit', 'Vino blanco seleccionado de la casa', 'Ausgewählter Hausweißwein', 5.00, true, 2),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000011', 'House Rosé Wine (Glass)', 'Huiswijn Rosé (Glas)', 'Vino Rosado de la Casa (Copa)', 'Hauswein Rosé (Glas)', 'Selected house rosé wine', 'Geselecteerde huiswijn rosé', 'Vino rosado seleccionado de la casa', 'Ausgewählter Hausroséwein', 5.00, true, 3),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000011', 'Bottle Red Wine', 'Fles Rode Wijn', 'Botella de Vino Tinto', 'Flasche Rotwein', 'House red wine, full bottle', 'Huiswijn rood, hele fles', 'Vino tinto de la casa, botella entera', 'Hausrotwein, ganze Flasche', 18.00, true, 4),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000011', 'Bottle White Wine', 'Fles Witte Wijn', 'Botella de Vino Blanco', 'Flasche Weißwein', 'House white wine, full bottle', 'Huiswijn wit, hele fles', 'Vino blanco de la casa, botella entera', 'Hausweißwein, ganze Flasche', 18.00, true, 5),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000011', 'Bottle Rosé Wine', 'Fles Rosé Wijn', 'Botella de Vino Rosado', 'Flasche Roséwein', 'House rosé wine, full bottle', 'Huiswijn rosé, hele fles', 'Vino rosado de la casa, botella entera', 'Hausroséwein, ganze Flasche', 18.00, true, 6),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000011', 'Cava (Glass)', 'Cava (Glas)', 'Cava (Copa)', 'Cava (Glas)', 'Spanish sparkling wine', 'Spaanse mousserende wijn', 'Cava espumoso español', 'Spanischer Sekt', 5.50, true, 7),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000011', 'Champagne (Glass)', 'Champagne (Glas)', 'Champán (Copa)', 'Champagner (Glas)', 'Premium champagne by the glass', 'Premium champagne per glas', 'Champán premium por copa', 'Premium Champagner im Glas', 9.50, true, 8),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000011', 'Bottle Champagne', 'Fles Champagne', 'Botella de Champán', 'Flasche Champagner', 'Full bottle of champagne', 'Hele fles champagne', 'Botella entera de champán', 'Ganze Flasche Champagner', 45.00, true, 9),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000011', 'Sangria (Jug)', 'Sangria (Kan)', 'Sangría (Jarra)', 'Sangria (Krug)', 'Homemade sangria with seasonal fruits', 'Huisgemaakte sangria met seizoensfruit', 'Sangría casera con frutas de temporada', 'Hausgemachte Sangria mit Saisonfrüchten', 14.00, true, 10);

-- ============================================================================
-- 5. MENU ITEMS: Soft Drinks (10 items)
-- ============================================================================

INSERT INTO menu_items (id, category_id, name_en, name_nl, name_es, name_de, description_en, description_nl, description_es, description_de, price, available, sort_order) VALUES
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000012', 'Coca Cola', 'Coca Cola', 'Coca Cola', 'Coca Cola', 'Classic Coca Cola 33cl', 'Klassieke Coca Cola 33cl', 'Coca Cola clásica 33cl', 'Klassische Coca Cola 33cl', 3.00, true, 1),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000012', 'Coca Cola Zero', 'Coca Cola Zero', 'Coca Cola Zero', 'Coca Cola Zero', 'Sugar-free Coca Cola 33cl', 'Suikervrije Coca Cola 33cl', 'Coca Cola sin azúcar 33cl', 'Zuckerfreie Coca Cola 33cl', 3.00, true, 2),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000012', 'Fanta Orange', 'Fanta Orange', 'Fanta Naranja', 'Fanta Orange', 'Orange soda 33cl', 'Sinaasappel frisdrank 33cl', 'Refresco de naranja 33cl', 'Orangenlimonade 33cl', 3.00, true, 3),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000012', 'Sprite / 7Up', 'Sprite / 7Up', 'Sprite / 7Up', 'Sprite / 7Up', 'Lemon-lime soda 33cl', 'Citroen-limoen frisdrank 33cl', 'Refresco de limón 33cl', 'Zitronen-Limonade 33cl', 3.00, true, 4),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000012', 'Tonic Water', 'Tonic Water', 'Tónica', 'Tonic Water', 'Premium tonic water', 'Premium tonic water', 'Tónica premium', 'Premium Tonic Water', 3.00, true, 5),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000012', 'Red Bull', 'Red Bull', 'Red Bull', 'Red Bull', 'Energy drink 25cl', 'Energiedrank 25cl', 'Bebida energética 25cl', 'Energiegetränk 25cl', 4.00, true, 6),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000012', 'Water (Still)', 'Water (Plat)', 'Agua (Sin Gas)', 'Wasser (Still)', 'Still mineral water 50cl', 'Plat mineraalwater 50cl', 'Agua mineral sin gas 50cl', 'Stilles Mineralwasser 50cl', 2.50, true, 7),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000012', 'Water (Sparkling)', 'Water (Bruisend)', 'Agua con Gas', 'Wasser (Sprudel)', 'Sparkling mineral water 50cl', 'Bruisend mineraalwater 50cl', 'Agua mineral con gas 50cl', 'Sprudel Mineralwasser 50cl', 2.50, true, 8),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000012', 'Fresh Orange Juice', 'Vers Sinaasappelsap', 'Zumo de Naranja Natural', 'Frischer Orangensaft', 'Freshly squeezed orange juice', 'Vers geperst sinaasappelsap', 'Zumo de naranja recién exprimido', 'Frisch gepresster Orangensaft', 4.50, true, 9),
  (gen_random_uuid(), 'c0000001-0000-0000-0000-000000000012', 'Coffee / Tea', 'Koffie / Thee', 'Café / Té', 'Kaffee / Tee', 'Espresso, cappuccino, or selection of teas', 'Espresso, cappuccino, of selectie thee', 'Espresso, capuchino o selección de tés', 'Espresso, Cappuccino oder Teeauswahl', 2.50, true, 10);

-- ============================================================================
-- 6. MENU INGREDIENTS: Cocktails linked to spirit products
-- Spirit product IDs are fixed: a0000001-0000-0000-0000-000000000001..040
-- Cocktail menu_item IDs are fixed: d0000001-...-001..041, d0000002-...-001..004, d0000003-...-001..005
-- ============================================================================

-- Helper: short aliases for readability
-- a001=White Rum, a002=Vodka, a003=Gin, a004=Tequila, a005=Bourbon
-- a006=Dark Rum, a007=Cachaça, a008=Scotch, a009=Cognac, a010=Brandy
-- a011=Irish Whiskey, a012=Amaretto, a013=Pisco, a014=Aperol, a015=Limoncello
-- a016=Grand Marnier, a017=Triple Sec, a018=Campari, a019=Elderflower Liqueur
-- a020=Simple Syrup, a021=Prosecco, a022=Ginger Beer, a023=Coconut Cream
-- a024=Lime Juice, a025=Lemon Juice, a026=Orange Juice, a027=Cranberry Juice
-- a028=Grapefruit Juice, a029=Passion Fruit Puree, a030=Strawberry Puree
-- a031=Kahlua, a032=Baileys, a033=Angostura Bitters, a034=Grenadine
-- a035=Blue Curacao, a036=Peach Schnapps, a037=Midori, a038=Malibu
-- a039=Sweet Vermouth, a040=Dry Vermouth

-- 1. Mojito (d0000001-...-001)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'White Rum', 5, 'cl', 0.60, false, false, 1),
  ('d0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000024', 'Lime Juice', 3, 'cl', 0.08, false, false, 2),
  ('d0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000020', 'Simple Syrup', 2, 'cl', 0.03, false, false, 3),
  ('d0000001-0000-0000-0000-000000000001', NULL, 'Fresh Mint', 8, 'leaves', 0.10, true, false, 4),
  ('d0000001-0000-0000-0000-000000000001', NULL, 'Soda Water', 0, 'top', 0.05, false, false, 5);

-- 2. Caipirinha (d0000001-...-002)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000007', 'Cachaça', 6, 'cl', 0.78, false, false, 1),
  ('d0000001-0000-0000-0000-000000000002', NULL, 'Lime', 1, 'whole', 0.15, false, false, 2),
  ('d0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000020', 'Sugar', 2, 'tsp', 0.03, false, false, 3);

-- 3. Piña Colada (d0000001-...-003)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001', 'White Rum', 5, 'cl', 0.60, false, false, 1),
  ('d0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000023', 'Coconut Cream', 4, 'cl', 0.16, false, false, 2),
  ('d0000001-0000-0000-0000-000000000003', NULL, 'Pineapple Juice', 9, 'cl', 0.15, false, false, 3);

-- 4. Margarita (d0000001-...-004)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000004', 'Tequila', 5, 'cl', 0.75, false, false, 1),
  ('d0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000017', 'Triple Sec', 3, 'cl', 0.24, false, false, 2),
  ('d0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000024', 'Lime Juice', 2, 'cl', 0.05, false, false, 3);

-- 5. Cosmopolitan (d0000001-...-005)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000002', 'Vodka', 4, 'cl', 0.44, false, false, 1),
  ('d0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000017', 'Triple Sec', 2, 'cl', 0.16, false, false, 2),
  ('d0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000027', 'Cranberry Juice', 4, 'cl', 0.10, false, false, 3),
  ('d0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000024', 'Lime Juice', 1, 'cl', 0.03, false, false, 4);

-- 6. Daiquiri (d0000001-...-006)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000001', 'White Rum', 5, 'cl', 0.60, false, false, 1),
  ('d0000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000024', 'Lime Juice', 3, 'cl', 0.08, false, false, 2),
  ('d0000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000020', 'Simple Syrup', 2, 'cl', 0.03, false, false, 3);

-- 7. Moscow Mule (d0000001-...-007)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000002', 'Vodka', 5, 'cl', 0.55, false, false, 1),
  ('d0000001-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000022', 'Ginger Beer', 12, 'cl', 0.18, false, false, 2),
  ('d0000001-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000024', 'Lime Juice', 2, 'cl', 0.05, false, false, 3);

-- 8. Dark & Stormy (d0000001-...-008)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000006', 'Dark Rum', 5, 'cl', 0.70, false, false, 1),
  ('d0000001-0000-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000022', 'Ginger Beer', 12, 'cl', 0.18, false, false, 2),
  ('d0000001-0000-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000024', 'Lime Juice', 1, 'cl', 0.03, false, false, 3);

-- 9. Long Island Iced Tea (d0000001-...-009)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000002', 'Vodka', 1.5, 'cl', 0.17, false, false, 1),
  ('d0000001-0000-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000003', 'Gin', 1.5, 'cl', 0.21, false, false, 2),
  ('d0000001-0000-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000001', 'White Rum', 1.5, 'cl', 0.18, false, false, 3),
  ('d0000001-0000-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000004', 'Tequila', 1.5, 'cl', 0.23, false, false, 4),
  ('d0000001-0000-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000017', 'Triple Sec', 1.5, 'cl', 0.12, false, false, 5),
  ('d0000001-0000-0000-0000-000000000009', NULL, 'Cola', 0, 'top', 0.05, false, false, 6),
  ('d0000001-0000-0000-0000-000000000009', 'a0000001-0000-0000-0000-000000000025', 'Lemon Juice', 2, 'cl', 0.05, false, false, 7);

-- 10. Mai Tai (d0000001-...-010)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000001', 'White Rum', 3, 'cl', 0.36, false, false, 1),
  ('d0000001-0000-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000006', 'Dark Rum', 3, 'cl', 0.42, false, false, 2),
  ('d0000001-0000-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000017', 'Triple Sec', 2, 'cl', 0.16, false, false, 3),
  ('d0000001-0000-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000024', 'Lime Juice', 2, 'cl', 0.05, false, false, 4),
  ('d0000001-0000-0000-0000-000000000010', NULL, 'Orgeat Syrup', 1, 'cl', 0.10, false, false, 5);

-- 11. Gin & Tonic (d0000001-...-011)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000011', 'a0000001-0000-0000-0000-000000000003', 'Gin', 5, 'cl', 0.70, false, false, 1),
  ('d0000001-0000-0000-0000-000000000011', NULL, 'Tonic Water', 20, 'cl', 0.20, false, false, 2);

-- 12. Negroni (d0000001-...-012)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000012', 'a0000001-0000-0000-0000-000000000003', 'Gin', 3, 'cl', 0.42, false, false, 1),
  ('d0000001-0000-0000-0000-000000000012', 'a0000001-0000-0000-0000-000000000018', 'Campari', 3, 'cl', 0.42, false, false, 2),
  ('d0000001-0000-0000-0000-000000000012', 'a0000001-0000-0000-0000-000000000039', 'Sweet Vermouth', 3, 'cl', 0.24, false, false, 3);

-- 13. Old Fashioned (d0000001-...-013)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000013', 'a0000001-0000-0000-0000-000000000005', 'Bourbon', 6, 'cl', 1.08, false, false, 1),
  ('d0000001-0000-0000-0000-000000000013', 'a0000001-0000-0000-0000-000000000033', 'Angostura Bitters', 0.2, 'cl', 0.16, false, false, 2),
  ('d0000001-0000-0000-0000-000000000013', 'a0000001-0000-0000-0000-000000000020', 'Sugar', 1, 'cube', 0.02, false, false, 3);

-- 14. Whiskey Sour (d0000001-...-014) — contains egg white!
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000014', 'a0000001-0000-0000-0000-000000000005', 'Bourbon', 5, 'cl', 0.90, false, false, 1),
  ('d0000001-0000-0000-0000-000000000014', 'a0000001-0000-0000-0000-000000000025', 'Lemon Juice', 3, 'cl', 0.08, false, false, 2),
  ('d0000001-0000-0000-0000-000000000014', 'a0000001-0000-0000-0000-000000000020', 'Simple Syrup', 2, 'cl', 0.03, false, false, 3),
  ('d0000001-0000-0000-0000-000000000014', NULL, 'Egg White', 1, 'pc', 0.15, false, true, 4);

-- 15. Manhattan (d0000001-...-015)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000015', 'a0000001-0000-0000-0000-000000000005', 'Bourbon', 5, 'cl', 0.90, false, false, 1),
  ('d0000001-0000-0000-0000-000000000015', 'a0000001-0000-0000-0000-000000000039', 'Sweet Vermouth', 3, 'cl', 0.24, false, false, 2),
  ('d0000001-0000-0000-0000-000000000015', 'a0000001-0000-0000-0000-000000000033', 'Angostura Bitters', 0.2, 'cl', 0.16, false, false, 3);

-- 16. Martini (d0000001-...-016)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000016', 'a0000001-0000-0000-0000-000000000003', 'Gin', 6, 'cl', 0.84, false, false, 1),
  ('d0000001-0000-0000-0000-000000000016', 'a0000001-0000-0000-0000-000000000040', 'Dry Vermouth', 1, 'cl', 0.08, false, false, 2);

-- 17. Tom Collins (d0000001-...-017)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000017', 'a0000001-0000-0000-0000-000000000003', 'Gin', 5, 'cl', 0.70, false, false, 1),
  ('d0000001-0000-0000-0000-000000000017', 'a0000001-0000-0000-0000-000000000025', 'Lemon Juice', 3, 'cl', 0.08, false, false, 2),
  ('d0000001-0000-0000-0000-000000000017', 'a0000001-0000-0000-0000-000000000020', 'Simple Syrup', 2, 'cl', 0.03, false, false, 3),
  ('d0000001-0000-0000-0000-000000000017', NULL, 'Soda Water', 0, 'top', 0.05, false, false, 4);

-- 18. Paloma (d0000001-...-018)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000018', 'a0000001-0000-0000-0000-000000000004', 'Tequila', 5, 'cl', 0.75, false, false, 1),
  ('d0000001-0000-0000-0000-000000000018', 'a0000001-0000-0000-0000-000000000028', 'Grapefruit Juice', 8, 'cl', 0.20, false, false, 2),
  ('d0000001-0000-0000-0000-000000000018', 'a0000001-0000-0000-0000-000000000024', 'Lime Juice', 2, 'cl', 0.05, false, false, 3),
  ('d0000001-0000-0000-0000-000000000018', NULL, 'Soda Water', 0, 'top', 0.05, false, false, 4);

-- 19. Tequila Sunrise (d0000001-...-019)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000019', 'a0000001-0000-0000-0000-000000000004', 'Tequila', 5, 'cl', 0.75, false, false, 1),
  ('d0000001-0000-0000-0000-000000000019', 'a0000001-0000-0000-0000-000000000026', 'Orange Juice', 12, 'cl', 0.24, false, false, 2),
  ('d0000001-0000-0000-0000-000000000019', 'a0000001-0000-0000-0000-000000000034', 'Grenadine', 1, 'cl', 0.04, false, false, 3);

-- 20. Cuba Libre (d0000001-...-020)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000020', 'a0000001-0000-0000-0000-000000000001', 'White Rum', 5, 'cl', 0.60, false, false, 1),
  ('d0000001-0000-0000-0000-000000000020', NULL, 'Cola', 0, 'top', 0.10, false, false, 2),
  ('d0000001-0000-0000-0000-000000000020', 'a0000001-0000-0000-0000-000000000024', 'Lime Juice', 1, 'cl', 0.03, false, false, 3);

-- 21. Amaretto Sour (d0000001-...-021)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000021', 'a0000001-0000-0000-0000-000000000012', 'Amaretto', 5, 'cl', 0.60, false, false, 1),
  ('d0000001-0000-0000-0000-000000000021', 'a0000001-0000-0000-0000-000000000025', 'Lemon Juice', 3, 'cl', 0.08, false, false, 2),
  ('d0000001-0000-0000-0000-000000000021', 'a0000001-0000-0000-0000-000000000020', 'Simple Syrup', 1, 'cl', 0.02, false, false, 3);

-- 22. Pisco Sour (d0000001-...-022) — contains egg white!
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000022', 'a0000001-0000-0000-0000-000000000013', 'Pisco', 5, 'cl', 0.80, false, false, 1),
  ('d0000001-0000-0000-0000-000000000022', 'a0000001-0000-0000-0000-000000000024', 'Lime Juice', 3, 'cl', 0.08, false, false, 2),
  ('d0000001-0000-0000-0000-000000000022', 'a0000001-0000-0000-0000-000000000020', 'Simple Syrup', 2, 'cl', 0.03, false, false, 3),
  ('d0000001-0000-0000-0000-000000000022', NULL, 'Egg White', 1, 'pc', 0.15, false, true, 4),
  ('d0000001-0000-0000-0000-000000000022', 'a0000001-0000-0000-0000-000000000033', 'Angostura Bitters', 0.1, 'cl', 0.08, true, false, 5);

-- 23. Sex on the Beach (d0000001-...-023)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000023', 'a0000001-0000-0000-0000-000000000002', 'Vodka', 4, 'cl', 0.44, false, false, 1),
  ('d0000001-0000-0000-0000-000000000023', 'a0000001-0000-0000-0000-000000000036', 'Peach Schnapps', 2, 'cl', 0.18, false, false, 2),
  ('d0000001-0000-0000-0000-000000000023', 'a0000001-0000-0000-0000-000000000026', 'Orange Juice', 6, 'cl', 0.12, false, false, 3),
  ('d0000001-0000-0000-0000-000000000023', 'a0000001-0000-0000-0000-000000000027', 'Cranberry Juice', 6, 'cl', 0.15, false, false, 4);

-- 24. Blue Lagoon (d0000001-...-024)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000024', 'a0000001-0000-0000-0000-000000000002', 'Vodka', 4, 'cl', 0.44, false, false, 1),
  ('d0000001-0000-0000-0000-000000000024', 'a0000001-0000-0000-0000-000000000035', 'Blue Curaçao', 2, 'cl', 0.16, false, false, 2),
  ('d0000001-0000-0000-0000-000000000024', NULL, 'Lemonade', 0, 'top', 0.10, false, false, 3);

-- 25. Midori Sour (d0000001-...-025)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000025', 'a0000001-0000-0000-0000-000000000037', 'Midori', 4, 'cl', 0.56, false, false, 1),
  ('d0000001-0000-0000-0000-000000000025', 'a0000001-0000-0000-0000-000000000025', 'Lemon Juice', 3, 'cl', 0.08, false, false, 2),
  ('d0000001-0000-0000-0000-000000000025', 'a0000001-0000-0000-0000-000000000020', 'Simple Syrup', 1, 'cl', 0.02, false, false, 3);

-- 26. Bramble (d0000001-...-026)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000026', 'a0000001-0000-0000-0000-000000000003', 'Gin', 5, 'cl', 0.70, false, false, 1),
  ('d0000001-0000-0000-0000-000000000026', 'a0000001-0000-0000-0000-000000000025', 'Lemon Juice', 3, 'cl', 0.08, false, false, 2),
  ('d0000001-0000-0000-0000-000000000026', 'a0000001-0000-0000-0000-000000000020', 'Simple Syrup', 1, 'cl', 0.02, false, false, 3),
  ('d0000001-0000-0000-0000-000000000026', NULL, 'Crème de Mûre', 2, 'cl', 0.20, false, false, 4);

-- 27. Gimlet (d0000001-...-027)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000027', 'a0000001-0000-0000-0000-000000000003', 'Gin', 6, 'cl', 0.84, false, false, 1),
  ('d0000001-0000-0000-0000-000000000027', 'a0000001-0000-0000-0000-000000000024', 'Lime Juice', 2, 'cl', 0.05, false, false, 2),
  ('d0000001-0000-0000-0000-000000000027', 'a0000001-0000-0000-0000-000000000020', 'Simple Syrup', 1, 'cl', 0.02, false, false, 3);

-- 28. Sidecar (d0000001-...-028)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000028', 'a0000001-0000-0000-0000-000000000009', 'Cognac', 5, 'cl', 1.40, false, false, 1),
  ('d0000001-0000-0000-0000-000000000028', 'a0000001-0000-0000-0000-000000000017', 'Triple Sec', 2, 'cl', 0.16, false, false, 2),
  ('d0000001-0000-0000-0000-000000000028', 'a0000001-0000-0000-0000-000000000025', 'Lemon Juice', 2, 'cl', 0.05, false, false, 3);

-- 29. Rum Punch (d0000001-...-029)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000029', 'a0000001-0000-0000-0000-000000000006', 'Dark Rum', 5, 'cl', 0.70, false, false, 1),
  ('d0000001-0000-0000-0000-000000000029', 'a0000001-0000-0000-0000-000000000026', 'Orange Juice', 6, 'cl', 0.12, false, false, 2),
  ('d0000001-0000-0000-0000-000000000029', NULL, 'Pineapple Juice', 6, 'cl', 0.10, false, false, 3),
  ('d0000001-0000-0000-0000-000000000029', 'a0000001-0000-0000-0000-000000000034', 'Grenadine', 1, 'cl', 0.04, false, false, 4),
  ('d0000001-0000-0000-0000-000000000029', 'a0000001-0000-0000-0000-000000000024', 'Lime Juice', 2, 'cl', 0.05, false, false, 5);

-- 30. Hurricane (d0000001-...-030)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000030', 'a0000001-0000-0000-0000-000000000006', 'Dark Rum', 5, 'cl', 0.70, false, false, 1),
  ('d0000001-0000-0000-0000-000000000030', 'a0000001-0000-0000-0000-000000000029', 'Passion Fruit Puree', 4, 'cl', 0.20, false, false, 2),
  ('d0000001-0000-0000-0000-000000000030', 'a0000001-0000-0000-0000-000000000026', 'Orange Juice', 4, 'cl', 0.08, false, false, 3),
  ('d0000001-0000-0000-0000-000000000030', 'a0000001-0000-0000-0000-000000000024', 'Lime Juice', 1, 'cl', 0.03, false, false, 4),
  ('d0000001-0000-0000-0000-000000000030', 'a0000001-0000-0000-0000-000000000034', 'Grenadine', 1, 'cl', 0.04, false, false, 5);

-- 31. Zombie (d0000001-...-031)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000031', 'a0000001-0000-0000-0000-000000000001', 'White Rum', 3, 'cl', 0.36, false, false, 1),
  ('d0000001-0000-0000-0000-000000000031', 'a0000001-0000-0000-0000-000000000006', 'Dark Rum', 3, 'cl', 0.42, false, false, 2),
  ('d0000001-0000-0000-0000-000000000031', 'a0000001-0000-0000-0000-000000000024', 'Lime Juice', 2, 'cl', 0.05, false, false, 3),
  ('d0000001-0000-0000-0000-000000000031', 'a0000001-0000-0000-0000-000000000029', 'Passion Fruit Puree', 3, 'cl', 0.15, false, false, 4),
  ('d0000001-0000-0000-0000-000000000031', 'a0000001-0000-0000-0000-000000000034', 'Grenadine', 1, 'cl', 0.04, false, false, 5);

-- 32. Malibu Sunset (d0000001-...-032)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000032', 'a0000001-0000-0000-0000-000000000038', 'Malibu', 5, 'cl', 0.60, false, false, 1),
  ('d0000001-0000-0000-0000-000000000032', 'a0000001-0000-0000-0000-000000000026', 'Orange Juice', 6, 'cl', 0.12, false, false, 2),
  ('d0000001-0000-0000-0000-000000000032', NULL, 'Pineapple Juice', 6, 'cl', 0.10, false, false, 3),
  ('d0000001-0000-0000-0000-000000000032', 'a0000001-0000-0000-0000-000000000034', 'Grenadine', 1, 'cl', 0.04, false, false, 4);

-- 33. Gin Fizz (d0000001-...-033)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000033', 'a0000001-0000-0000-0000-000000000003', 'Gin', 5, 'cl', 0.70, false, false, 1),
  ('d0000001-0000-0000-0000-000000000033', 'a0000001-0000-0000-0000-000000000025', 'Lemon Juice', 3, 'cl', 0.08, false, false, 2),
  ('d0000001-0000-0000-0000-000000000033', 'a0000001-0000-0000-0000-000000000020', 'Simple Syrup', 2, 'cl', 0.03, false, false, 3),
  ('d0000001-0000-0000-0000-000000000033', NULL, 'Soda Water', 0, 'top', 0.05, false, false, 4);

-- 34. Vodka Martini (d0000001-...-034)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000034', 'a0000001-0000-0000-0000-000000000002', 'Vodka', 6, 'cl', 0.66, false, false, 1),
  ('d0000001-0000-0000-0000-000000000034', 'a0000001-0000-0000-0000-000000000040', 'Dry Vermouth', 1, 'cl', 0.08, false, false, 2);

-- 35. Strawberry Daiquiri (d0000001-...-035)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000035', 'a0000001-0000-0000-0000-000000000001', 'White Rum', 5, 'cl', 0.60, false, false, 1),
  ('d0000001-0000-0000-0000-000000000035', 'a0000001-0000-0000-0000-000000000030', 'Strawberry Puree', 4, 'cl', 0.18, false, false, 2),
  ('d0000001-0000-0000-0000-000000000035', 'a0000001-0000-0000-0000-000000000024', 'Lime Juice', 2, 'cl', 0.05, false, false, 3),
  ('d0000001-0000-0000-0000-000000000035', 'a0000001-0000-0000-0000-000000000020', 'Simple Syrup', 1, 'cl', 0.02, false, false, 4);

-- 36. Passion Fruit Martini (d0000001-...-036)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000036', 'a0000001-0000-0000-0000-000000000002', 'Vodka', 5, 'cl', 0.55, false, false, 1),
  ('d0000001-0000-0000-0000-000000000036', 'a0000001-0000-0000-0000-000000000029', 'Passion Fruit Puree', 4, 'cl', 0.20, false, false, 2),
  ('d0000001-0000-0000-0000-000000000036', NULL, 'Vanilla Syrup', 1, 'cl', 0.05, false, false, 3),
  ('d0000001-0000-0000-0000-000000000036', 'a0000001-0000-0000-0000-000000000021', 'Prosecco', 3, 'cl', 0.18, false, false, 4);

-- 37. French 75 (d0000001-...-037)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000037', 'a0000001-0000-0000-0000-000000000003', 'Gin', 4, 'cl', 0.56, false, false, 1),
  ('d0000001-0000-0000-0000-000000000037', 'a0000001-0000-0000-0000-000000000025', 'Lemon Juice', 2, 'cl', 0.05, false, false, 2),
  ('d0000001-0000-0000-0000-000000000037', 'a0000001-0000-0000-0000-000000000020', 'Simple Syrup', 1, 'cl', 0.02, false, false, 3),
  ('d0000001-0000-0000-0000-000000000037', 'a0000001-0000-0000-0000-000000000021', 'Champagne', 6, 'cl', 0.36, false, false, 4);

-- 38. Boulevardier (d0000001-...-038)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000038', 'a0000001-0000-0000-0000-000000000005', 'Bourbon', 4, 'cl', 0.72, false, false, 1),
  ('d0000001-0000-0000-0000-000000000038', 'a0000001-0000-0000-0000-000000000018', 'Campari', 3, 'cl', 0.42, false, false, 2),
  ('d0000001-0000-0000-0000-000000000038', 'a0000001-0000-0000-0000-000000000039', 'Sweet Vermouth', 3, 'cl', 0.24, false, false, 3);

-- 39. Last Word (d0000001-...-039)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000039', 'a0000001-0000-0000-0000-000000000003', 'Gin', 2, 'cl', 0.28, false, false, 1),
  ('d0000001-0000-0000-0000-000000000039', NULL, 'Green Chartreuse', 2, 'cl', 0.40, false, false, 2),
  ('d0000001-0000-0000-0000-000000000039', NULL, 'Maraschino Liqueur', 2, 'cl', 0.25, false, false, 3),
  ('d0000001-0000-0000-0000-000000000039', 'a0000001-0000-0000-0000-000000000024', 'Lime Juice', 2, 'cl', 0.05, false, false, 4);

-- 40. Jungle Bird (d0000001-...-040)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000040', 'a0000001-0000-0000-0000-000000000006', 'Dark Rum', 4, 'cl', 0.56, false, false, 1),
  ('d0000001-0000-0000-0000-000000000040', 'a0000001-0000-0000-0000-000000000018', 'Campari', 2, 'cl', 0.28, false, false, 2),
  ('d0000001-0000-0000-0000-000000000040', NULL, 'Pineapple Juice', 6, 'cl', 0.10, false, false, 3),
  ('d0000001-0000-0000-0000-000000000040', 'a0000001-0000-0000-0000-000000000024', 'Lime Juice', 1, 'cl', 0.03, false, false, 4),
  ('d0000001-0000-0000-0000-000000000040', 'a0000001-0000-0000-0000-000000000020', 'Simple Syrup', 1, 'cl', 0.02, false, false, 5);

-- 41. Cheers to You! Signature (d0000001-...-041)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000041', 'a0000001-0000-0000-0000-000000000001', 'White Rum', 5, 'cl', 0.60, false, false, 1),
  ('d0000001-0000-0000-0000-000000000041', 'a0000001-0000-0000-0000-000000000029', 'Passion Fruit Puree', 3, 'cl', 0.15, false, false, 2),
  ('d0000001-0000-0000-0000-000000000041', 'a0000001-0000-0000-0000-000000000023', 'Coconut Cream', 2.5, 'cl', 0.10, false, false, 3),
  ('d0000001-0000-0000-0000-000000000041', 'a0000001-0000-0000-0000-000000000024', 'Lime Juice', 2, 'cl', 0.05, false, false, 4),
  ('d0000001-0000-0000-0000-000000000041', 'a0000001-0000-0000-0000-000000000021', 'Prosecco', 3, 'cl', 0.18, false, false, 5);

-- Coffee Cocktails
-- 42. Espresso Martini (d0000002-...-001)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000002-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 'Vodka', 5, 'cl', 0.55, false, false, 1),
  ('d0000002-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000031', 'Kahlua', 2.5, 'cl', 0.35, false, false, 2),
  ('d0000002-0000-0000-0000-000000000001', NULL, 'Fresh Espresso', 3, 'cl', 0.15, false, false, 3);

-- 43. Irish Coffee (d0000002-...-002)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000002-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000011', 'Irish Whiskey', 4, 'cl', 0.80, false, false, 1),
  ('d0000002-0000-0000-0000-000000000002', NULL, 'Hot Coffee', 12, 'cl', 0.10, false, false, 2),
  ('d0000002-0000-0000-0000-000000000002', NULL, 'Whipped Cream', 0, 'top', 0.10, true, false, 3),
  ('d0000002-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000020', 'Sugar', 1, 'tsp', 0.02, false, false, 4);

-- 44. Baileys Coffee (d0000002-...-003)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000002-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000032', 'Baileys', 4, 'cl', 0.56, false, false, 1),
  ('d0000002-0000-0000-0000-000000000003', NULL, 'Hot Coffee', 12, 'cl', 0.10, false, false, 2),
  ('d0000002-0000-0000-0000-000000000003', NULL, 'Whipped Cream', 0, 'top', 0.10, true, false, 3);

-- 45. Amaretto Coffee (d0000002-...-004)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000002-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000012', 'Amaretto', 4, 'cl', 0.48, false, false, 1),
  ('d0000002-0000-0000-0000-000000000004', NULL, 'Hot Coffee', 12, 'cl', 0.10, false, false, 2),
  ('d0000002-0000-0000-0000-000000000004', NULL, 'Whipped Cream', 0, 'top', 0.10, true, false, 3);

-- Spritz & Sangria
-- 46. Aperol Spritz (d0000003-...-001)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000003-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000014', 'Aperol', 6, 'cl', 0.66, false, false, 1),
  ('d0000003-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000021', 'Prosecco', 9, 'cl', 0.54, false, false, 2),
  ('d0000003-0000-0000-0000-000000000001', NULL, 'Soda Water', 0, 'splash', 0.03, false, false, 3);

-- 47. Limoncello Spritz (d0000003-...-002)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000003-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000015', 'Limoncello', 6, 'cl', 0.60, false, false, 1),
  ('d0000003-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000021', 'Prosecco', 9, 'cl', 0.54, false, false, 2),
  ('d0000003-0000-0000-0000-000000000002', NULL, 'Soda Water', 0, 'splash', 0.03, false, false, 3);

-- 48. Hugo Spritz (d0000003-...-003)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000003-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000019', 'Elderflower Liqueur', 4, 'cl', 0.64, false, false, 1),
  ('d0000003-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000021', 'Prosecco', 9, 'cl', 0.54, false, false, 2),
  ('d0000003-0000-0000-0000-000000000003', NULL, 'Soda Water', 0, 'splash', 0.03, false, false, 3),
  ('d0000003-0000-0000-0000-000000000003', NULL, 'Fresh Mint', 3, 'leaves', 0.05, true, false, 4);

-- 49. Red Sangria (d0000003-...-004)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000003-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000010', 'Brandy', 4, 'cl', 0.64, false, false, 1),
  ('d0000003-0000-0000-0000-000000000004', NULL, 'Red Wine', 15, 'cl', 0.50, false, false, 2),
  ('d0000003-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000026', 'Orange Juice', 4, 'cl', 0.08, false, false, 3),
  ('d0000003-0000-0000-0000-000000000004', NULL, 'Seasonal Fruits', 0, 'mix', 0.30, true, false, 4);

-- 50. White Sangria (d0000003-...-005)
INSERT INTO menu_ingredients (menu_item_id, product_id, name, quantity, unit, cost_per_unit, is_garnish, is_optional, sort_order) VALUES
  ('d0000003-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000019', 'Elderflower Liqueur', 3, 'cl', 0.48, false, false, 1),
  ('d0000003-0000-0000-0000-000000000005', NULL, 'White Wine', 15, 'cl', 0.50, false, false, 2),
  ('d0000003-0000-0000-0000-000000000005', NULL, 'Peach Slices', 0, 'mix', 0.20, true, false, 3),
  ('d0000003-0000-0000-0000-000000000005', NULL, 'Citrus', 0, 'mix', 0.15, true, false, 4);

-- ============================================================================
-- 7. MENU ALLERGENS: Food items + cocktails with egg white
-- EU 14 allergens: celery, crustaceans, eggs, fish, gluten, lupin, milk,
--                  molluscs, mustard, nuts, peanuts, sesame, soy, sulfites
-- ============================================================================

-- Breakfast & Lunch
-- f0000001-...-001: 3 Fried Eggs on White Bread
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'eggs'),
  ('f0000001-0000-0000-0000-000000000001', 'gluten');

-- f0000001-...-002: Scrambled Eggs Sandwich
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000001-0000-0000-0000-000000000002', 'eggs'),
  ('f0000001-0000-0000-0000-000000000002', 'gluten'),
  ('f0000001-0000-0000-0000-000000000002', 'milk');

-- f0000001-...-003: Tuna Sandwich
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000001-0000-0000-0000-000000000003', 'fish'),
  ('f0000001-0000-0000-0000-000000000003', 'gluten'),
  ('f0000001-0000-0000-0000-000000000003', 'eggs');

-- f0000001-...-004: Carpaccio Sandwich
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000001-0000-0000-0000-000000000004', 'gluten'),
  ('f0000001-0000-0000-0000-000000000004', 'milk');

-- f0000001-...-005: Serrano Ham Sandwich
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000001-0000-0000-0000-000000000005', 'gluten');

-- f0000001-...-006: Hot Cheese Salami Sandwich
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000001-0000-0000-0000-000000000006', 'gluten'),
  ('f0000001-0000-0000-0000-000000000006', 'milk');

-- f0000001-...-007: Goat Cheese Sandwich
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000001-0000-0000-0000-000000000007', 'gluten'),
  ('f0000001-0000-0000-0000-000000000007', 'milk');

-- f0000001-...-008: Avocado Toast with Poached Eggs
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000001-0000-0000-0000-000000000008', 'gluten'),
  ('f0000001-0000-0000-0000-000000000008', 'eggs');

-- f0000001-...-009: 2 Croquettes on Bread
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000001-0000-0000-0000-000000000009', 'gluten'),
  ('f0000001-0000-0000-0000-000000000009', 'milk'),
  ('f0000001-0000-0000-0000-000000000009', 'eggs');

-- f0000001-...-010: Chicken Club Sandwich
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000001-0000-0000-0000-000000000010', 'gluten'),
  ('f0000001-0000-0000-0000-000000000010', 'eggs');

-- f0000001-...-011: Salmon Club Sandwich
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000001-0000-0000-0000-000000000011', 'fish'),
  ('f0000001-0000-0000-0000-000000000011', 'gluten'),
  ('f0000001-0000-0000-0000-000000000011', 'milk');

-- f0000001-...-012: Chicken Satay Sandwich
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000001-0000-0000-0000-000000000012', 'gluten'),
  ('f0000001-0000-0000-0000-000000000012', 'peanuts'),
  ('f0000001-0000-0000-0000-000000000012', 'soy');

-- f0000001-...-013: Soup of the Day
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000001-0000-0000-0000-000000000013', 'gluten'),
  ('f0000001-0000-0000-0000-000000000013', 'celery');

-- Burgers & Schnitzel
-- f0000002-...-001: Crispy Chicken Burger
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000002-0000-0000-0000-000000000001', 'gluten'),
  ('f0000002-0000-0000-0000-000000000001', 'eggs');

-- f0000002-...-002: Crispy Chicken Cheese Burger
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000002-0000-0000-0000-000000000002', 'gluten'),
  ('f0000002-0000-0000-0000-000000000002', 'eggs'),
  ('f0000002-0000-0000-0000-000000000002', 'milk');

-- f0000002-...-003: Wiener Schnitzel
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000002-0000-0000-0000-000000000003', 'gluten'),
  ('f0000002-0000-0000-0000-000000000003', 'eggs'),
  ('f0000002-0000-0000-0000-000000000003', 'milk');

-- Pasta
-- f0000003-...-001: Spaghetti Bolognese
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000003-0000-0000-0000-000000000001', 'gluten'),
  ('f0000003-0000-0000-0000-000000000001', 'celery');

-- f0000003-...-002: Spaghetti Carbonara
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000003-0000-0000-0000-000000000002', 'gluten'),
  ('f0000003-0000-0000-0000-000000000002', 'eggs'),
  ('f0000003-0000-0000-0000-000000000002', 'milk');

-- f0000003-...-003: Salmon Pasta
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000003-0000-0000-0000-000000000003', 'gluten'),
  ('f0000003-0000-0000-0000-000000000003', 'fish'),
  ('f0000003-0000-0000-0000-000000000003', 'milk');

-- f0000003-...-004: Vegetarian Pasta
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000003-0000-0000-0000-000000000004', 'gluten'),
  ('f0000003-0000-0000-0000-000000000004', 'milk'),
  ('f0000003-0000-0000-0000-000000000004', 'nuts');

-- Salads
-- f0000004-...-001: Goat Cheese Salad
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000004-0000-0000-0000-000000000001', 'milk'),
  ('f0000004-0000-0000-0000-000000000001', 'nuts');

-- f0000004-...-002: Caesar Salad
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000004-0000-0000-0000-000000000002', 'gluten'),
  ('f0000004-0000-0000-0000-000000000002', 'eggs'),
  ('f0000004-0000-0000-0000-000000000002', 'fish'),
  ('f0000004-0000-0000-0000-000000000002', 'milk');

-- f0000004-...-003: Greek Salad
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000004-0000-0000-0000-000000000003', 'milk');

-- f0000004-...-004: Carpaccio & Truffle Salad
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000004-0000-0000-0000-000000000004', 'milk');

-- Desserts
-- f0000005-...-001: Brownie (chocolate, flour, eggs, butter)
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000005-0000-0000-0000-000000000001', 'gluten'),
  ('f0000005-0000-0000-0000-000000000001', 'eggs'),
  ('f0000005-0000-0000-0000-000000000001', 'milk');

-- f0000005-...-002: Lotus Cheesecake
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000005-0000-0000-0000-000000000002', 'gluten'),
  ('f0000005-0000-0000-0000-000000000002', 'eggs'),
  ('f0000005-0000-0000-0000-000000000002', 'milk'),
  ('f0000005-0000-0000-0000-000000000002', 'soy');

-- f0000005-...-003: New York Cheesecake
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000005-0000-0000-0000-000000000003', 'gluten'),
  ('f0000005-0000-0000-0000-000000000003', 'eggs'),
  ('f0000005-0000-0000-0000-000000000003', 'milk');

-- f0000005-...-004: Apple Crumble
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000005-0000-0000-0000-000000000004', 'gluten'),
  ('f0000005-0000-0000-0000-000000000004', 'milk');

-- f0000005-...-005: Carrot Cake
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000005-0000-0000-0000-000000000005', 'gluten'),
  ('f0000005-0000-0000-0000-000000000005', 'eggs'),
  ('f0000005-0000-0000-0000-000000000005', 'milk'),
  ('f0000005-0000-0000-0000-000000000005', 'nuts');

-- f0000005-...-006: Dame Blanche (ice cream + chocolate sauce)
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000005-0000-0000-0000-000000000006', 'milk');

-- f0000005-...-007: Strawberry Coupe (ice cream + cream)
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000005-0000-0000-0000-000000000007', 'milk');

-- Sauces & Sides
-- f0000006-...-001: Pepper Sauce
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('f0000006-0000-0000-0000-000000000001', 'milk');

-- Cocktails with egg white (EU allergen requirement)
-- Whiskey Sour
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('d0000001-0000-0000-0000-000000000014', 'eggs');
-- Pisco Sour
INSERT INTO menu_allergens (menu_item_id, allergen) VALUES
  ('d0000001-0000-0000-0000-000000000022', 'eggs');

-- All cocktails/wines contain sulfites (EU requirement for alcoholic beverages)
-- Wines & Champagne category
INSERT INTO menu_allergens (menu_item_id, allergen)
SELECT mi.id, 'sulfites'::allergen_type
FROM menu_items mi
WHERE mi.category_id = 'c0000001-0000-0000-0000-000000000011'
ON CONFLICT (menu_item_id, allergen) DO NOTHING;

-- ============================================================================
-- 8. UPDATE SPIRIT PRODUCT COSTS (Makro Mallorca realistic prices)
-- ============================================================================

UPDATE products SET cost_per_unit = 11.49 WHERE id = 'a0000001-0000-0000-0000-000000000001'; -- White Rum 1L
UPDATE products SET cost_per_unit = 10.99 WHERE id = 'a0000001-0000-0000-0000-000000000002'; -- Vodka 1L
UPDATE products SET cost_per_unit = 15.99 WHERE id = 'a0000001-0000-0000-0000-000000000003'; -- Gin 1L
UPDATE products SET cost_per_unit = 16.49 WHERE id = 'a0000001-0000-0000-0000-000000000004'; -- Tequila 1L
UPDATE products SET cost_per_unit = 19.99 WHERE id = 'a0000001-0000-0000-0000-000000000005'; -- Bourbon 1L
UPDATE products SET cost_per_unit = 13.49 WHERE id = 'a0000001-0000-0000-0000-000000000006'; -- Dark Rum 1L
UPDATE products SET cost_per_unit = 14.99 WHERE id = 'a0000001-0000-0000-0000-000000000007'; -- Cachaça 1L
UPDATE products SET cost_per_unit = 24.99 WHERE id = 'a0000001-0000-0000-0000-000000000008'; -- Scotch Whisky 1L
UPDATE products SET cost_per_unit = 29.99 WHERE id = 'a0000001-0000-0000-0000-000000000009'; -- Cognac 70cl
UPDATE products SET cost_per_unit = 14.49 WHERE id = 'a0000001-0000-0000-0000-000000000010'; -- Brandy 1L
UPDATE products SET cost_per_unit = 21.99 WHERE id = 'a0000001-0000-0000-0000-000000000011'; -- Irish Whiskey 70cl
UPDATE products SET cost_per_unit = 11.99 WHERE id = 'a0000001-0000-0000-0000-000000000012'; -- Amaretto 70cl
UPDATE products SET cost_per_unit = 17.99 WHERE id = 'a0000001-0000-0000-0000-000000000013'; -- Pisco 70cl
UPDATE products SET cost_per_unit = 12.49 WHERE id = 'a0000001-0000-0000-0000-000000000014'; -- Aperol 1L
UPDATE products SET cost_per_unit = 11.49 WHERE id = 'a0000001-0000-0000-0000-000000000015'; -- Limoncello 70cl
UPDATE products SET cost_per_unit = 23.99 WHERE id = 'a0000001-0000-0000-0000-000000000016'; -- Grand Marnier 70cl
UPDATE products SET cost_per_unit = 7.49  WHERE id = 'a0000001-0000-0000-0000-000000000017'; -- Triple Sec 1L
UPDATE products SET cost_per_unit = 15.49 WHERE id = 'a0000001-0000-0000-0000-000000000018'; -- Campari 1L
UPDATE products SET cost_per_unit = 17.99 WHERE id = 'a0000001-0000-0000-0000-000000000019'; -- Elderflower Liqueur 70cl
UPDATE products SET cost_per_unit = 2.49  WHERE id = 'a0000001-0000-0000-0000-000000000020'; -- Simple Syrup 1L
UPDATE products SET cost_per_unit = 5.99  WHERE id = 'a0000001-0000-0000-0000-000000000021'; -- Prosecco 75cl
UPDATE products SET cost_per_unit = 1.29  WHERE id = 'a0000001-0000-0000-0000-000000000022'; -- Ginger Beer 33cl
UPDATE products SET cost_per_unit = 3.99  WHERE id = 'a0000001-0000-0000-0000-000000000023'; -- Coconut Cream 40cl
UPDATE products SET cost_per_unit = 2.29  WHERE id = 'a0000001-0000-0000-0000-000000000024'; -- Lime Juice 1L
UPDATE products SET cost_per_unit = 2.29  WHERE id = 'a0000001-0000-0000-0000-000000000025'; -- Lemon Juice 1L
UPDATE products SET cost_per_unit = 1.99  WHERE id = 'a0000001-0000-0000-0000-000000000026'; -- Orange Juice 1L
UPDATE products SET cost_per_unit = 2.79  WHERE id = 'a0000001-0000-0000-0000-000000000027'; -- Cranberry Juice 1L
UPDATE products SET cost_per_unit = 2.79  WHERE id = 'a0000001-0000-0000-0000-000000000028'; -- Grapefruit Juice 1L
UPDATE products SET cost_per_unit = 5.49  WHERE id = 'a0000001-0000-0000-0000-000000000029'; -- Passion Fruit Puree 50cl
UPDATE products SET cost_per_unit = 4.49  WHERE id = 'a0000001-0000-0000-0000-000000000030'; -- Strawberry Puree 50cl
UPDATE products SET cost_per_unit = 15.99 WHERE id = 'a0000001-0000-0000-0000-000000000031'; -- Kahlua 70cl
UPDATE products SET cost_per_unit = 15.49 WHERE id = 'a0000001-0000-0000-0000-000000000032'; -- Baileys 70cl
UPDATE products SET cost_per_unit = 9.99  WHERE id = 'a0000001-0000-0000-0000-000000000033'; -- Angostura Bitters 20cl
UPDATE products SET cost_per_unit = 3.99  WHERE id = 'a0000001-0000-0000-0000-000000000034'; -- Grenadine 70cl
UPDATE products SET cost_per_unit = 8.99  WHERE id = 'a0000001-0000-0000-0000-000000000035'; -- Blue Curacao 70cl
UPDATE products SET cost_per_unit = 9.99  WHERE id = 'a0000001-0000-0000-0000-000000000036'; -- Peach Schnapps 70cl
UPDATE products SET cost_per_unit = 15.49 WHERE id = 'a0000001-0000-0000-0000-000000000037'; -- Midori 70cl
UPDATE products SET cost_per_unit = 12.99 WHERE id = 'a0000001-0000-0000-0000-000000000038'; -- Malibu 1L
UPDATE products SET cost_per_unit = 7.99  WHERE id = 'a0000001-0000-0000-0000-000000000039'; -- Sweet Vermouth 1L
UPDATE products SET cost_per_unit = 7.99  WHERE id = 'a0000001-0000-0000-0000-000000000040'; -- Dry Vermouth 1L

COMMIT;
