-- Migration 025: Real Menu Seed Data — Cheers Mallorca
-- Replaces demo menu data with actual menu items, cocktails, and spirits

-- ============================================================================
-- CLEAN EXISTING MENU DATA
-- ============================================================================

-- Delete existing menu data (cascade handles allergens/ingredients)
DELETE FROM cocktail_preparation_steps;
DELETE FROM cocktail_recipes;
DELETE FROM menu_ingredients;
DELETE FROM menu_items;
DELETE FROM menu_categories;

-- ============================================================================
-- CATEGORIES (12)
-- ============================================================================

INSERT INTO menu_categories (id, name_en, name_nl, name_es, name_de, sort_order) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'Breakfast & Lunch', 'Ontbijt & Lunch', 'Desayuno & Almuerzo', 'Frühstück & Mittagessen', 1),
  ('c0000001-0000-0000-0000-000000000002', 'Burgers & Schnitzel', 'Burgers & Schnitzel', 'Hamburguesas & Escalope', 'Burger & Schnitzel', 2),
  ('c0000001-0000-0000-0000-000000000003', 'Pasta', 'Pasta', 'Pasta', 'Nudeln', 3),
  ('c0000001-0000-0000-0000-000000000004', 'Salads', 'Salades', 'Ensaladas', 'Salate', 4),
  ('c0000001-0000-0000-0000-000000000005', 'Desserts', 'Desserts', 'Postres', 'Nachspeisen', 5),
  ('c0000001-0000-0000-0000-000000000006', 'Sauces & Sides', 'Sauzen & Bijgerechten', 'Salsas & Acompañamientos', 'Soßen & Beilagen', 6),
  ('c0000001-0000-0000-0000-000000000007', 'Classic Cocktails', 'Klassieke Cocktails', 'Cócteles Clásicos', 'Klassische Cocktails', 7),
  ('c0000001-0000-0000-0000-000000000008', 'Coffee Cocktails', 'Koffie Cocktails', 'Cócteles de Café', 'Kaffee Cocktails', 8),
  ('c0000001-0000-0000-0000-000000000009', 'Spritz & Sangria', 'Spritz & Sangria', 'Spritz & Sangría', 'Spritz & Sangria', 9),
  ('c0000001-0000-0000-0000-000000000010', 'Beers', 'Bieren', 'Cervezas', 'Biere', 10),
  ('c0000001-0000-0000-0000-000000000011', 'Wines & Champagne', 'Wijnen & Champagne', 'Vinos & Champán', 'Weine & Champagner', 11),
  ('c0000001-0000-0000-0000-000000000012', 'Soft Drinks', 'Frisdranken', 'Refrescos', 'Erfrischungsgetränke', 12);

-- ============================================================================
-- FOOD ITEMS
-- ============================================================================

-- Breakfast & Lunch (13 items, available until 16:00)
INSERT INTO menu_items (id, category_id, name_en, name_nl, name_es, name_de, description_en, description_nl, description_es, description_de, price, prep_time_minutes, available, sort_order) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', '3 Fried Eggs on White Bread', '3 Gebakken Eieren op Wit Brood', 'Huevos Fritos 3 en Pan Blanco', '3 Spiegeleier auf Weißbrot', 'Three fried eggs on toasted white bread', 'Drie gebakken eieren op geroosterd wit brood', 'Tres huevos fritos sobre pan blanco tostado', 'Drei Spiegeleier auf getoastetem Weißbrot', 9.50, 10, true, 1),
  ('f0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'Scrambled Eggs Sandwich', 'Broodje Roerei', 'Bocadillo de Huevos Revueltos', 'Rührei-Sandwich', 'Fluffy scrambled eggs on fresh bread', 'Romig roerei op vers brood', 'Huevos revueltos esponjosos en pan fresco', 'Lockeres Rührei auf frischem Brot', 9.50, 10, true, 2),
  ('f0000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001', 'Tuna Sandwich', 'Broodje Tonijn', 'Bocadillo de Atún', 'Thunfisch-Sandwich', 'Classic tuna salad sandwich', 'Klassiek tonijnsalade broodje', 'Bocadillo clásico de ensalada de atún', 'Klassisches Thunfischsalat-Sandwich', 8.90, 8, true, 3),
  ('f0000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000001', 'Carpaccio Sandwich', 'Broodje Carpaccio', 'Bocadillo de Carpaccio', 'Carpaccio-Sandwich', 'Beef carpaccio with arugula and parmesan', 'Rundercarpaccio met rucola en parmezaan', 'Carpaccio de ternera con rúcula y parmesano', 'Rindercarpaccio mit Rucola und Parmesan', 11.50, 10, true, 4),
  ('f0000001-0000-0000-0000-000000000005', 'c0000001-0000-0000-0000-000000000001', 'Serrano Ham Sandwich', 'Broodje Serrano Ham', 'Bocadillo de Jamón Serrano', 'Serrano-Schinken-Sandwich', 'Spanish cured ham on fresh bread', 'Spaanse ham op vers brood', 'Jamón serrano en pan fresco', 'Spanischer Schinken auf frischem Brot', 8.50, 5, true, 5),
  ('f0000001-0000-0000-0000-000000000006', 'c0000001-0000-0000-0000-000000000001', 'Hot Cheese Salami Sandwich', 'Warme Kaas Salami Broodje', 'Bocadillo Caliente de Queso y Salami', 'Warmes Käse-Salami-Sandwich', 'Toasted sandwich with melted cheese and salami', 'Warm broodje met gesmolten kaas en salami', 'Bocadillo tostado con queso fundido y salami', 'Getoastetes Sandwich mit geschmolzenem Käse und Salami', 8.50, 8, true, 6),
  ('f0000001-0000-0000-0000-000000000007', 'c0000001-0000-0000-0000-000000000001', 'Goat Cheese Sandwich', 'Broodje Geitenkaas', 'Bocadillo de Queso de Cabra', 'Ziegenkäse-Sandwich', 'Warm goat cheese on bread with honey', 'Warme geitenkaas op brood met honing', 'Queso de cabra caliente en pan con miel', 'Warmer Ziegenkäse auf Brot mit Honig', 8.90, 8, true, 7),
  ('f0000001-0000-0000-0000-000000000008', 'c0000001-0000-0000-0000-000000000001', 'Avocado Toast with Poached Eggs', 'Avocado Toast met Gepocheerde Eieren', 'Tostada de Aguacate con Huevos Escalfados', 'Avocado Toast mit Pochierten Eiern', 'Smashed avocado on sourdough with two poached eggs', 'Gepureerde avocado op zuurdesem met twee gepocheerde eieren', 'Aguacate en tostada de masa madre con dos huevos escalfados', 'Zerdrückte Avocado auf Sauerteig mit zwei pochierten Eiern', 9.50, 12, true, 8),
  ('f0000001-0000-0000-0000-000000000009', 'c0000001-0000-0000-0000-000000000001', '2 Croquettes on Bread', '2 Kroketten op Brood', '2 Croquetas en Pan', '2 Kroketten auf Brot', 'Two creamy croquettes served on bread', 'Twee romige kroketten geserveerd op brood', 'Dos croquetas cremosas servidas en pan', 'Zwei cremige Kroketten auf Brot serviert', 8.90, 10, true, 9),
  ('f0000001-0000-0000-0000-000000000010', 'c0000001-0000-0000-0000-000000000001', 'Chicken Club Sandwich', 'Kip Club Sandwich', 'Club Sandwich de Pollo', 'Hähnchen Club Sandwich', 'Triple-decker with grilled chicken, bacon, lettuce and tomato', 'Driedubbel met gegrilde kip, spek, sla en tomaat', 'Triple piso con pollo a la parrilla, bacon, lechuga y tomate', 'Dreistöckig mit gegrilltem Hähnchen, Speck, Salat und Tomate', 12.90, 15, true, 10),
  ('f0000001-0000-0000-0000-000000000011', 'c0000001-0000-0000-0000-000000000001', 'Salmon Club Sandwich', 'Zalm Club Sandwich', 'Club Sandwich de Salmón', 'Lachs Club Sandwich', 'Smoked salmon club with cream cheese and capers', 'Gerookte zalm club met roomkaas en kappertjes', 'Club de salmón ahumado con queso crema y alcaparras', 'Räucherlachs-Club mit Frischkäse und Kapern', 14.90, 15, true, 11),
  ('f0000001-0000-0000-0000-000000000012', 'c0000001-0000-0000-0000-000000000001', 'Chicken Satay Sandwich', 'Broodje Kip Saté', 'Bocadillo de Pollo Satay', 'Hähnchen-Satay-Sandwich', 'Grilled chicken with peanut satay sauce', 'Gegrilde kip met pindasatesaus', 'Pollo a la parrilla con salsa satay de cacahuete', 'Gegrilltes Hähnchen mit Erdnuss-Satay-Soße', 9.50, 12, true, 12),
  ('f0000001-0000-0000-0000-000000000013', 'c0000001-0000-0000-0000-000000000001', 'Soup of the Day', 'Soep van de Dag', 'Sopa del Día', 'Tagessuppe', 'Homemade soup served with bread (served from 12:00)', 'Huisgemaakte soep geserveerd met brood (geserveerd vanaf 12:00)', 'Sopa casera servida con pan (servida desde las 12:00)', 'Hausgemachte Suppe mit Brot serviert (ab 12:00 Uhr)', 14.00, 5, true, 13);

-- Burgers & Schnitzel (3 items)
INSERT INTO menu_items (id, category_id, name_en, name_nl, name_es, name_de, description_en, description_nl, description_es, description_de, price, prep_time_minutes, available, sort_order) VALUES
  ('f0000002-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000002', 'Crispy Chicken Burger', 'Krokante Kip Burger', 'Hamburguesa de Pollo Crujiente', 'Knuspriger Hähnchen-Burger', 'Crispy fried chicken breast with lettuce, tomato and special sauce', 'Krokant gebakken kipfilet met sla, tomaat en speciale saus', 'Pechuga de pollo crujiente frita con lechuga, tomate y salsa especial', 'Knusprig gebratene Hähnchenbrust mit Salat, Tomate und Spezialsauce', 15.50, 15, true, 1),
  ('f0000002-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000002', 'Crispy Chicken Cheese Burger', 'Krokante Kip Kaas Burger', 'Hamburguesa de Pollo Crujiente con Queso', 'Knuspriger Hähnchen-Käse-Burger', 'Crispy chicken with melted cheddar cheese', 'Krokante kip met gesmolten cheddar kaas', 'Pollo crujiente con queso cheddar fundido', 'Knuspriges Hähnchen mit geschmolzenem Cheddar', 16.50, 15, true, 2),
  ('f0000002-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000002', 'Wiener Schnitzel', 'Weense Schnitzel', 'Escalope Vienés', 'Wiener Schnitzel', 'Classic breaded veal schnitzel with fries and salad', 'Klassieke gepaneerde kalfsschnitzel met friet en salade', 'Escalope de ternera empanado clásico con patatas fritas y ensalada', 'Klassisches paniertes Kalbsschnitzel mit Pommes und Salat', 14.50, 18, true, 3);

-- Pasta (4 items)
INSERT INTO menu_items (id, category_id, name_en, name_nl, name_es, name_de, description_en, description_nl, description_es, description_de, price, prep_time_minutes, available, sort_order) VALUES
  ('f0000003-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000003', 'Spaghetti Bolognese', 'Spaghetti Bolognese', 'Espaguetis Boloñesa', 'Spaghetti Bolognese', 'Classic Italian meat sauce with spaghetti', 'Klassieke Italiaanse vleessaus met spaghetti', 'Salsa clásica italiana de carne con espaguetis', 'Klassische italienische Fleischsoße mit Spaghetti', 14.50, 15, true, 1),
  ('f0000003-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000003', 'Spaghetti Carbonara', 'Spaghetti Carbonara', 'Espaguetis Carbonara', 'Spaghetti Carbonara', 'Creamy egg and pancetta pasta', 'Romige ei en pancetta pasta', 'Pasta cremosa con huevo y panceta', 'Cremige Ei- und Pancetta-Pasta', 14.90, 15, true, 2),
  ('f0000003-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000003', 'Salmon Pasta', 'Zalm Pasta', 'Pasta de Salmón', 'Lachs-Pasta', 'Fresh salmon with cream sauce and dill', 'Verse zalm met roomsaus en dille', 'Salmón fresco con salsa de nata y eneldo', 'Frischer Lachs mit Sahnesauce und Dill', 18.50, 18, true, 3),
  ('f0000003-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000003', 'Vegetarian Pasta', 'Vegetarische Pasta', 'Pasta Vegetariana', 'Vegetarische Pasta', 'Seasonal vegetables with pesto and parmesan', 'Seizoensgroenten met pesto en parmezaan', 'Verduras de temporada con pesto y parmesano', 'Saisongemüse mit Pesto und Parmesan', 14.50, 15, true, 4);

-- Salads (4 items)
INSERT INTO menu_items (id, category_id, name_en, name_nl, name_es, name_de, description_en, description_nl, description_es, description_de, price, prep_time_minutes, available, sort_order) VALUES
  ('f0000004-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000004', 'Goat Cheese Salad', 'Geitenkaas Salade', 'Ensalada de Queso de Cabra', 'Ziegenkäse-Salat', 'Warm goat cheese on mixed greens with honey dressing', 'Warme geitenkaas op gemengde sla met honingdressing', 'Queso de cabra caliente sobre verdes mixtos con aderezo de miel', 'Warmer Ziegenkäse auf gemischtem Salat mit Honig-Dressing', 14.90, 10, true, 1),
  ('f0000004-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000004', 'Caesar Salad', 'Caesar Salade', 'Ensalada César', 'Caesar-Salat', 'Romaine lettuce with caesar dressing, croutons and parmesan', 'Romaine sla met caesardressing, croutons en parmezaan', 'Lechuga romana con aderezo César, picatostes y parmesano', 'Römersalat mit Caesar-Dressing, Croutons und Parmesan', 14.90, 10, true, 2),
  ('f0000004-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000004', 'Greek Salad', 'Griekse Salade', 'Ensalada Griega', 'Griechischer Salat', 'Traditional Greek salad with feta and olives', 'Traditionele Griekse salade met feta en olijven', 'Ensalada griega tradicional con feta y aceitunas', 'Traditioneller griechischer Salat mit Feta und Oliven', 14.90, 10, true, 3),
  ('f0000004-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000004', 'Carpaccio & Truffle Salad', 'Carpaccio & Truffel Salade', 'Ensalada de Carpaccio y Trufa', 'Carpaccio & Trüffel-Salat', 'Beef carpaccio with truffle oil, arugula and parmesan shavings', 'Rundercarpaccio met truffelolie, rucola en parmezaanschaafsel', 'Carpaccio de ternera con aceite de trufa, rúcula y virutas de parmesano', 'Rindercarpaccio mit Trüffelöl, Rucola und Parmesanspänen', 16.90, 10, true, 4);

-- Desserts (7 items, all €5.50)
INSERT INTO menu_items (id, category_id, name_en, name_nl, name_es, name_de, description_en, description_nl, description_es, description_de, price, prep_time_minutes, available, sort_order) VALUES
  ('f0000005-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000005', 'Brownie', 'Brownie', 'Brownie', 'Brownie', 'Rich chocolate brownie with ice cream', 'Rijke chocolade brownie met ijs', 'Brownie de chocolate intenso con helado', 'Reichhaltiger Schokoladen-Brownie mit Eis', 5.50, 5, true, 1),
  ('f0000005-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000005', 'Lotus Cheesecake', 'Lotus Kaastaart', 'Tarta de Queso Lotus', 'Lotus-Käsekuchen', 'Creamy cheesecake with Lotus biscoff base', 'Romige kaastaart met Lotus koekjesbodem', 'Tarta de queso cremosa con base de galleta Lotus', 'Cremiger Käsekuchen mit Lotus-Keksboden', 5.50, 5, true, 2),
  ('f0000005-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000005', 'New York Cheesecake', 'New York Kaastaart', 'Tarta de Queso New York', 'New York Käsekuchen', 'Classic New York style cheesecake', 'Klassieke New York stijl kaastaart', 'Tarta de queso clásica estilo New York', 'Klassischer New Yorker Käsekuchen', 5.50, 5, true, 3),
  ('f0000005-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000005', 'Apple Crumble', 'Appel Crumble', 'Crumble de Manzana', 'Apfel-Crumble', 'Warm apple crumble with vanilla ice cream', 'Warme appelcrumble met vanille-ijs', 'Crumble de manzana caliente con helado de vainilla', 'Warmer Apfel-Crumble mit Vanilleeis', 5.50, 8, true, 4),
  ('f0000005-0000-0000-0000-000000000005', 'c0000001-0000-0000-0000-000000000005', 'Carrot Cake', 'Worteltaart', 'Tarta de Zanahoria', 'Karottenkuchen', 'Moist carrot cake with cream cheese frosting', 'Sappige worteltaart met roomkaas glazuur', 'Tarta de zanahoria jugosa con glaseado de queso crema', 'Saftiger Karottenkuchen mit Frischkäse-Glasur', 5.50, 5, true, 5),
  ('f0000005-0000-0000-0000-000000000006', 'c0000001-0000-0000-0000-000000000005', 'Dame Blanche', 'Dame Blanche', 'Dame Blanche', 'Dame Blanche', 'Vanilla ice cream with warm chocolate sauce', 'Vanille-ijs met warme chocoladesaus', 'Helado de vainilla con salsa de chocolate caliente', 'Vanilleeis mit warmer Schokoladensoße', 5.50, 5, true, 6),
  ('f0000005-0000-0000-0000-000000000007', 'c0000001-0000-0000-0000-000000000005', 'Strawberry Coupe', 'Aardbeien Coupe', 'Copa de Fresas', 'Erdbeerbecher', 'Fresh strawberries with ice cream and whipped cream', 'Verse aardbeien met ijs en slagroom', 'Fresas frescas con helado y nata montada', 'Frische Erdbeeren mit Eis und Sahne', 5.50, 5, true, 7);

-- Sauces & Sides (2 items)
INSERT INTO menu_items (id, category_id, name_en, name_nl, name_es, name_de, description_en, description_nl, description_es, description_de, price, prep_time_minutes, available, sort_order) VALUES
  ('f0000006-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000006', 'Pepper Sauce', 'Pepersaus', 'Salsa de Pimienta', 'Pfeffersoße', 'Creamy pepper sauce', 'Romige pepersaus', 'Salsa cremosa de pimienta', 'Cremige Pfeffersoße', 1.50, 2, true, 1),
  ('f0000006-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000006', 'Side Salad', 'Bijgerecht Salade', 'Ensalada de Acompañamiento', 'Beilagensalat', 'Fresh mixed green side salad', 'Verse gemengde groene bijgerecht salade', 'Ensalada verde mixta de acompañamiento', 'Frischer gemischter grüner Beilagensalat', 2.50, 3, true, 2);

-- ============================================================================
-- SPIRIT PRODUCTS (for stock tracking)
-- ============================================================================

INSERT INTO products (id, name, category, unit, current_stock, min_stock, cost_per_unit) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'White Rum', 'drink', 'bottle', 10, 3, 12.00),
  ('a0000001-0000-0000-0000-000000000002', 'Vodka', 'drink', 'bottle', 10, 3, 11.00),
  ('a0000001-0000-0000-0000-000000000003', 'Gin', 'drink', 'bottle', 8, 3, 14.00),
  ('a0000001-0000-0000-0000-000000000004', 'Tequila', 'drink', 'bottle', 8, 3, 15.00),
  ('a0000001-0000-0000-0000-000000000005', 'Bourbon', 'drink', 'bottle', 6, 2, 18.00),
  ('a0000001-0000-0000-0000-000000000006', 'Dark Rum', 'drink', 'bottle', 6, 2, 14.00),
  ('a0000001-0000-0000-0000-000000000007', 'Cachaça', 'drink', 'bottle', 4, 2, 13.00),
  ('a0000001-0000-0000-0000-000000000008', 'Scotch Whisky', 'drink', 'bottle', 4, 2, 22.00),
  ('a0000001-0000-0000-0000-000000000009', 'Cognac', 'drink', 'bottle', 3, 1, 28.00),
  ('a0000001-0000-0000-0000-000000000010', 'Brandy', 'drink', 'bottle', 4, 2, 16.00),
  ('a0000001-0000-0000-0000-000000000011', 'Irish Whiskey', 'drink', 'bottle', 4, 2, 20.00),
  ('a0000001-0000-0000-0000-000000000012', 'Amaretto', 'drink', 'bottle', 4, 2, 12.00),
  ('a0000001-0000-0000-0000-000000000013', 'Pisco', 'drink', 'bottle', 3, 1, 16.00),
  ('a0000001-0000-0000-0000-000000000014', 'Aperol', 'drink', 'bottle', 6, 2, 11.00),
  ('a0000001-0000-0000-0000-000000000015', 'Limoncello', 'drink', 'bottle', 4, 2, 10.00),
  ('a0000001-0000-0000-0000-000000000016', 'Grand Marnier', 'drink', 'bottle', 3, 1, 22.00),
  ('a0000001-0000-0000-0000-000000000017', 'Triple Sec', 'drink', 'bottle', 5, 2, 8.00),
  ('a0000001-0000-0000-0000-000000000018', 'Campari', 'drink', 'bottle', 4, 2, 14.00),
  ('a0000001-0000-0000-0000-000000000019', 'Elderflower Liqueur', 'drink', 'bottle', 3, 1, 16.00),
  ('a0000001-0000-0000-0000-000000000020', 'Simple Syrup', 'drink', 'bottle', 8, 3, 3.00),
  ('a0000001-0000-0000-0000-000000000021', 'Prosecco', 'drink', 'bottle', 12, 4, 6.00),
  ('a0000001-0000-0000-0000-000000000022', 'Ginger Beer', 'drink', 'bottle', 15, 5, 1.50),
  ('a0000001-0000-0000-0000-000000000023', 'Coconut Cream', 'drink', 'bottle', 4, 2, 4.00),
  ('a0000001-0000-0000-0000-000000000024', 'Lime Juice', 'drink', 'bottle', 10, 4, 2.50),
  ('a0000001-0000-0000-0000-000000000025', 'Lemon Juice', 'drink', 'bottle', 10, 4, 2.50),
  ('a0000001-0000-0000-0000-000000000026', 'Orange Juice', 'drink', 'bottle', 10, 4, 2.00),
  ('a0000001-0000-0000-0000-000000000027', 'Cranberry Juice', 'drink', 'bottle', 6, 3, 2.50),
  ('a0000001-0000-0000-0000-000000000028', 'Grapefruit Juice', 'drink', 'bottle', 6, 3, 2.50),
  ('a0000001-0000-0000-0000-000000000029', 'Passion Fruit Puree', 'drink', 'bottle', 4, 2, 5.00),
  ('a0000001-0000-0000-0000-000000000030', 'Strawberry Puree', 'drink', 'bottle', 4, 2, 4.50),
  ('a0000001-0000-0000-0000-000000000031', 'Kahlua', 'drink', 'bottle', 4, 2, 14.00),
  ('a0000001-0000-0000-0000-000000000032', 'Baileys', 'drink', 'bottle', 4, 2, 14.00),
  ('a0000001-0000-0000-0000-000000000033', 'Angostura Bitters', 'drink', 'bottle', 3, 1, 8.00),
  ('a0000001-0000-0000-0000-000000000034', 'Grenadine', 'drink', 'bottle', 4, 2, 4.00),
  ('a0000001-0000-0000-0000-000000000035', 'Blue Curacao', 'drink', 'bottle', 3, 1, 8.00),
  ('a0000001-0000-0000-0000-000000000036', 'Peach Schnapps', 'drink', 'bottle', 3, 1, 9.00),
  ('a0000001-0000-0000-0000-000000000037', 'Midori', 'drink', 'bottle', 2, 1, 14.00),
  ('a0000001-0000-0000-0000-000000000038', 'Malibu', 'drink', 'bottle', 4, 2, 12.00),
  ('a0000001-0000-0000-0000-000000000039', 'Sweet Vermouth', 'drink', 'bottle', 3, 1, 8.00),
  ('a0000001-0000-0000-0000-000000000040', 'Dry Vermouth', 'drink', 'bottle', 3, 1, 8.00)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CLASSIC COCKTAILS (40 items @ €9.50 + 1 signature @ €10.50)
-- ============================================================================

INSERT INTO menu_items (id, category_id, name_en, name_nl, name_es, name_de, description_en, description_nl, description_es, description_de, price, prep_time_minutes, available, sort_order) VALUES
  -- Classic Cocktails
  ('d0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000007', 'Mojito', 'Mojito', 'Mojito', 'Mojito', 'White rum, lime, mint, sugar, soda', 'Witte rum, limoen, munt, suiker, soda', 'Ron blanco, lima, menta, azúcar, soda', 'Weißer Rum, Limette, Minze, Zucker, Soda', 9.50, 4, true, 1),
  ('d0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000007', 'Caipirinha', 'Caipirinha', 'Caipiriña', 'Caipirinha', 'Cachaça, lime, sugar', 'Cachaça, limoen, suiker', 'Cachaça, lima, azúcar', 'Cachaça, Limette, Zucker', 9.50, 3, true, 2),
  ('d0000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000007', 'Piña Colada', 'Piña Colada', 'Piña Colada', 'Piña Colada', 'White rum, coconut cream, pineapple juice', 'Witte rum, kokosroom, ananassap', 'Ron blanco, crema de coco, zumo de piña', 'Weißer Rum, Kokoscreme, Ananassaft', 9.50, 4, true, 3),
  ('d0000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000007', 'Margarita', 'Margarita', 'Margarita', 'Margarita', 'Tequila, triple sec, lime juice', 'Tequila, triple sec, limoensap', 'Tequila, triple sec, zumo de lima', 'Tequila, Triple Sec, Limettensaft', 9.50, 3, true, 4),
  ('d0000001-0000-0000-0000-000000000005', 'c0000001-0000-0000-0000-000000000007', 'Cosmopolitan', 'Cosmopolitan', 'Cosmopolitan', 'Cosmopolitan', 'Vodka, triple sec, cranberry, lime', 'Vodka, triple sec, cranberry, limoen', 'Vodka, triple sec, arándano, lima', 'Wodka, Triple Sec, Cranberry, Limette', 9.50, 3, true, 5),
  ('d0000001-0000-0000-0000-000000000006', 'c0000001-0000-0000-0000-000000000007', 'Daiquiri', 'Daiquiri', 'Daiquiri', 'Daiquiri', 'White rum, lime juice, simple syrup', 'Witte rum, limoensap, suikersiroop', 'Ron blanco, zumo de lima, almíbar', 'Weißer Rum, Limettensaft, Zuckersirup', 9.50, 3, true, 6),
  ('d0000001-0000-0000-0000-000000000007', 'c0000001-0000-0000-0000-000000000007', 'Moscow Mule', 'Moscow Mule', 'Moscow Mule', 'Moscow Mule', 'Vodka, ginger beer, lime', 'Vodka, ginger beer, limoen', 'Vodka, ginger beer, lima', 'Wodka, Ginger Beer, Limette', 9.50, 3, true, 7),
  ('d0000001-0000-0000-0000-000000000008', 'c0000001-0000-0000-0000-000000000007', 'Dark & Stormy', 'Dark & Stormy', 'Dark & Stormy', 'Dark & Stormy', 'Dark rum, ginger beer, lime', 'Donkere rum, ginger beer, limoen', 'Ron oscuro, ginger beer, lima', 'Dunkler Rum, Ginger Beer, Limette', 9.50, 3, true, 8),
  ('d0000001-0000-0000-0000-000000000009', 'c0000001-0000-0000-0000-000000000007', 'Long Island Iced Tea', 'Long Island Iced Tea', 'Long Island Iced Tea', 'Long Island Iced Tea', 'Vodka, gin, rum, tequila, triple sec, cola', 'Vodka, gin, rum, tequila, triple sec, cola', 'Vodka, ginebra, ron, tequila, triple sec, cola', 'Wodka, Gin, Rum, Tequila, Triple Sec, Cola', 9.50, 4, true, 9),
  ('d0000001-0000-0000-0000-000000000010', 'c0000001-0000-0000-0000-000000000007', 'Mai Tai', 'Mai Tai', 'Mai Tai', 'Mai Tai', 'White rum, dark rum, triple sec, orgeat, lime', 'Witte rum, donkere rum, triple sec, orgeat, limoen', 'Ron blanco, ron oscuro, triple sec, orgeat, lima', 'Weißer Rum, dunkler Rum, Triple Sec, Orgeat, Limette', 9.50, 4, true, 10),
  ('d0000001-0000-0000-0000-000000000011', 'c0000001-0000-0000-0000-000000000007', 'Gin & Tonic', 'Gin Tonic', 'Gin Tonic', 'Gin Tonic', 'Premium gin, tonic water, juniper, citrus', 'Premium gin, tonic water, jeneverbes, citrus', 'Ginebra premium, tónica, enebro, cítricos', 'Premium Gin, Tonic Water, Wacholder, Zitrus', 9.50, 2, true, 11),
  ('d0000001-0000-0000-0000-000000000012', 'c0000001-0000-0000-0000-000000000007', 'Negroni', 'Negroni', 'Negroni', 'Negroni', 'Gin, Campari, sweet vermouth', 'Gin, Campari, zoete vermout', 'Ginebra, Campari, vermut dulce', 'Gin, Campari, süßer Wermut', 9.50, 2, true, 12),
  ('d0000001-0000-0000-0000-000000000013', 'c0000001-0000-0000-0000-000000000007', 'Old Fashioned', 'Old Fashioned', 'Old Fashioned', 'Old Fashioned', 'Bourbon, Angostura bitters, sugar, orange peel', 'Bourbon, Angostura bitters, suiker, sinaasappelschil', 'Bourbon, Angostura bitters, azúcar, piel de naranja', 'Bourbon, Angostura Bitter, Zucker, Orangenschale', 9.50, 3, true, 13),
  ('d0000001-0000-0000-0000-000000000014', 'c0000001-0000-0000-0000-000000000007', 'Whiskey Sour', 'Whiskey Sour', 'Whiskey Sour', 'Whiskey Sour', 'Bourbon, lemon juice, simple syrup, egg white', 'Bourbon, citroensap, suikersiroop, eiwit', 'Bourbon, zumo de limón, almíbar, clara de huevo', 'Bourbon, Zitronensaft, Zuckersirup, Eiweiß', 9.50, 3, true, 14),
  ('d0000001-0000-0000-0000-000000000015', 'c0000001-0000-0000-0000-000000000007', 'Manhattan', 'Manhattan', 'Manhattan', 'Manhattan', 'Bourbon, sweet vermouth, Angostura bitters', 'Bourbon, zoete vermout, Angostura bitters', 'Bourbon, vermut dulce, Angostura bitters', 'Bourbon, süßer Wermut, Angostura Bitter', 9.50, 3, true, 15),
  ('d0000001-0000-0000-0000-000000000016', 'c0000001-0000-0000-0000-000000000007', 'Martini', 'Martini', 'Martini', 'Martini', 'Gin or vodka, dry vermouth, olive or lemon twist', 'Gin of vodka, droge vermout, olijf of citroenschil', 'Ginebra o vodka, vermut seco, aceituna o twist de limón', 'Gin oder Wodka, trockener Wermut, Olive oder Zitronenschale', 9.50, 2, true, 16),
  ('d0000001-0000-0000-0000-000000000017', 'c0000001-0000-0000-0000-000000000007', 'Tom Collins', 'Tom Collins', 'Tom Collins', 'Tom Collins', 'Gin, lemon juice, simple syrup, soda', 'Gin, citroensap, suikersiroop, soda', 'Ginebra, zumo de limón, almíbar, soda', 'Gin, Zitronensaft, Zuckersirup, Soda', 9.50, 3, true, 17),
  ('d0000001-0000-0000-0000-000000000018', 'c0000001-0000-0000-0000-000000000007', 'Paloma', 'Paloma', 'Paloma', 'Paloma', 'Tequila, grapefruit juice, lime, soda', 'Tequila, grapefruitsap, limoen, soda', 'Tequila, zumo de pomelo, lima, soda', 'Tequila, Grapefruitsaft, Limette, Soda', 9.50, 3, true, 18),
  ('d0000001-0000-0000-0000-000000000019', 'c0000001-0000-0000-0000-000000000007', 'Tequila Sunrise', 'Tequila Sunrise', 'Tequila Sunrise', 'Tequila Sunrise', 'Tequila, orange juice, grenadine', 'Tequila, sinaasappelsap, grenadine', 'Tequila, zumo de naranja, granadina', 'Tequila, Orangensaft, Grenadine', 9.50, 3, true, 19),
  ('d0000001-0000-0000-0000-000000000020', 'c0000001-0000-0000-0000-000000000007', 'Cuba Libre', 'Cuba Libre', 'Cuba Libre', 'Cuba Libre', 'White rum, cola, lime', 'Witte rum, cola, limoen', 'Ron blanco, cola, lima', 'Weißer Rum, Cola, Limette', 9.50, 2, true, 20),
  ('d0000001-0000-0000-0000-000000000021', 'c0000001-0000-0000-0000-000000000007', 'Amaretto Sour', 'Amaretto Sour', 'Amaretto Sour', 'Amaretto Sour', 'Amaretto, lemon juice, simple syrup', 'Amaretto, citroensap, suikersiroop', 'Amaretto, zumo de limón, almíbar', 'Amaretto, Zitronensaft, Zuckersirup', 9.50, 3, true, 21),
  ('d0000001-0000-0000-0000-000000000022', 'c0000001-0000-0000-0000-000000000007', 'Pisco Sour', 'Pisco Sour', 'Pisco Sour', 'Pisco Sour', 'Pisco, lime juice, simple syrup, egg white', 'Pisco, limoensap, suikersiroop, eiwit', 'Pisco, zumo de lima, almíbar, clara de huevo', 'Pisco, Limettensaft, Zuckersirup, Eiweiß', 9.50, 3, true, 22),
  ('d0000001-0000-0000-0000-000000000023', 'c0000001-0000-0000-0000-000000000007', 'Sex on the Beach', 'Sex on the Beach', 'Sex on the Beach', 'Sex on the Beach', 'Vodka, peach schnapps, orange juice, cranberry', 'Vodka, perziklikeur, sinaasappelsap, cranberry', 'Vodka, licor de melocotón, zumo de naranja, arándano', 'Wodka, Pfirsichlikör, Orangensaft, Cranberry', 9.50, 3, true, 23),
  ('d0000001-0000-0000-0000-000000000024', 'c0000001-0000-0000-0000-000000000007', 'Blue Lagoon', 'Blue Lagoon', 'Blue Lagoon', 'Blue Lagoon', 'Vodka, blue curaçao, lemonade', 'Vodka, blue curaçao, limonade', 'Vodka, blue curaçao, limonada', 'Wodka, Blue Curaçao, Limonade', 9.50, 2, true, 24),
  ('d0000001-0000-0000-0000-000000000025', 'c0000001-0000-0000-0000-000000000007', 'Midori Sour', 'Midori Sour', 'Midori Sour', 'Midori Sour', 'Midori, lemon juice, simple syrup', 'Midori, citroensap, suikersiroop', 'Midori, zumo de limón, almíbar', 'Midori, Zitronensaft, Zuckersirup', 9.50, 3, true, 25),
  ('d0000001-0000-0000-0000-000000000026', 'c0000001-0000-0000-0000-000000000007', 'Bramble', 'Bramble', 'Bramble', 'Bramble', 'Gin, lemon juice, simple syrup, crème de mûre', 'Gin, citroensap, suikersiroop, crème de mûre', 'Ginebra, zumo de limón, almíbar, crème de mûre', 'Gin, Zitronensaft, Zuckersirup, Crème de Mûre', 9.50, 3, true, 26),
  ('d0000001-0000-0000-0000-000000000027', 'c0000001-0000-0000-0000-000000000007', 'Gimlet', 'Gimlet', 'Gimlet', 'Gimlet', 'Gin, lime juice, simple syrup', 'Gin, limoensap, suikersiroop', 'Ginebra, zumo de lima, almíbar', 'Gin, Limettensaft, Zuckersirup', 9.50, 2, true, 27),
  ('d0000001-0000-0000-0000-000000000028', 'c0000001-0000-0000-0000-000000000007', 'Sidecar', 'Sidecar', 'Sidecar', 'Sidecar', 'Cognac, triple sec, lemon juice', 'Cognac, triple sec, citroensap', 'Coñac, triple sec, zumo de limón', 'Cognac, Triple Sec, Zitronensaft', 9.50, 3, true, 28),
  ('d0000001-0000-0000-0000-000000000029', 'c0000001-0000-0000-0000-000000000007', 'Rum Punch', 'Rum Punch', 'Ponche de Ron', 'Rum Punch', 'Dark rum, orange juice, pineapple, grenadine, lime', 'Donkere rum, sinaasappelsap, ananas, grenadine, limoen', 'Ron oscuro, zumo de naranja, piña, granadina, lima', 'Dunkler Rum, Orangensaft, Ananas, Grenadine, Limette', 9.50, 3, true, 29),
  ('d0000001-0000-0000-0000-000000000030', 'c0000001-0000-0000-0000-000000000007', 'Hurricane', 'Hurricane', 'Hurricane', 'Hurricane', 'Dark rum, passion fruit, orange juice, lime, grenadine', 'Donkere rum, passievrucht, sinaasappelsap, limoen, grenadine', 'Ron oscuro, maracuyá, zumo de naranja, lima, granadina', 'Dunkler Rum, Passionsfrucht, Orangensaft, Limette, Grenadine', 9.50, 4, true, 30),
  ('d0000001-0000-0000-0000-000000000031', 'c0000001-0000-0000-0000-000000000007', 'Zombie', 'Zombie', 'Zombie', 'Zombie', 'White rum, dark rum, lime, passion fruit, grenadine', 'Witte rum, donkere rum, limoen, passievrucht, grenadine', 'Ron blanco, ron oscuro, lima, maracuyá, granadina', 'Weißer Rum, dunkler Rum, Limette, Passionsfrucht, Grenadine', 9.50, 4, true, 31),
  ('d0000001-0000-0000-0000-000000000032', 'c0000001-0000-0000-0000-000000000007', 'Malibu Sunset', 'Malibu Sunset', 'Malibu Sunset', 'Malibu Sunset', 'Malibu, orange juice, pineapple, grenadine', 'Malibu, sinaasappelsap, ananas, grenadine', 'Malibu, zumo de naranja, piña, granadina', 'Malibu, Orangensaft, Ananas, Grenadine', 9.50, 3, true, 32),
  ('d0000001-0000-0000-0000-000000000033', 'c0000001-0000-0000-0000-000000000007', 'Gin Fizz', 'Gin Fizz', 'Gin Fizz', 'Gin Fizz', 'Gin, lemon juice, sugar, soda water', 'Gin, citroensap, suiker, sodawater', 'Ginebra, zumo de limón, azúcar, agua con gas', 'Gin, Zitronensaft, Zucker, Sodawasser', 9.50, 3, true, 33),
  ('d0000001-0000-0000-0000-000000000034', 'c0000001-0000-0000-0000-000000000007', 'Vodka Martini', 'Vodka Martini', 'Vodka Martini', 'Vodka Martini', 'Vodka, dry vermouth, olive', 'Vodka, droge vermout, olijf', 'Vodka, vermut seco, aceituna', 'Wodka, trockener Wermut, Olive', 9.50, 2, true, 34),
  ('d0000001-0000-0000-0000-000000000035', 'c0000001-0000-0000-0000-000000000007', 'Strawberry Daiquiri', 'Aardbei Daiquiri', 'Daiquiri de Fresa', 'Erdbeer-Daiquiri', 'White rum, strawberry, lime, sugar', 'Witte rum, aardbei, limoen, suiker', 'Ron blanco, fresa, lima, azúcar', 'Weißer Rum, Erdbeere, Limette, Zucker', 9.50, 4, true, 35),
  ('d0000001-0000-0000-0000-000000000036', 'c0000001-0000-0000-0000-000000000007', 'Passion Fruit Martini', 'Passievrucht Martini', 'Martini de Maracuyá', 'Passionsfrucht-Martini', 'Vodka, passion fruit, vanilla, prosecco', 'Vodka, passievrucht, vanille, prosecco', 'Vodka, maracuyá, vainilla, prosecco', 'Wodka, Passionsfrucht, Vanille, Prosecco', 9.50, 4, true, 36),
  ('d0000001-0000-0000-0000-000000000037', 'c0000001-0000-0000-0000-000000000007', 'French 75', 'French 75', 'French 75', 'French 75', 'Gin, lemon juice, simple syrup, champagne', 'Gin, citroensap, suikersiroop, champagne', 'Ginebra, zumo de limón, almíbar, champán', 'Gin, Zitronensaft, Zuckersirup, Champagner', 9.50, 3, true, 37),
  ('d0000001-0000-0000-0000-000000000038', 'c0000001-0000-0000-0000-000000000007', 'Boulevardier', 'Boulevardier', 'Boulevardier', 'Boulevardier', 'Bourbon, Campari, sweet vermouth', 'Bourbon, Campari, zoete vermout', 'Bourbon, Campari, vermut dulce', 'Bourbon, Campari, süßer Wermut', 9.50, 3, true, 38),
  ('d0000001-0000-0000-0000-000000000039', 'c0000001-0000-0000-0000-000000000007', 'Last Word', 'Last Word', 'Last Word', 'Last Word', 'Gin, green chartreuse, maraschino, lime', 'Gin, groene chartreuse, maraschino, limoen', 'Ginebra, chartreuse verde, marrasquino, lima', 'Gin, Grüne Chartreuse, Maraschino, Limette', 9.50, 3, true, 39),
  ('d0000001-0000-0000-0000-000000000040', 'c0000001-0000-0000-0000-000000000007', 'Jungle Bird', 'Jungle Bird', 'Jungle Bird', 'Jungle Bird', 'Dark rum, Campari, pineapple, lime, simple syrup', 'Donkere rum, Campari, ananas, limoen, suikersiroop', 'Ron oscuro, Campari, piña, lima, almíbar', 'Dunkler Rum, Campari, Ananas, Limette, Zuckersirup', 9.50, 3, true, 40);

-- Signature cocktail (€10.50)
INSERT INTO menu_items (id, category_id, name_en, name_nl, name_es, name_de, description_en, description_nl, description_es, description_de, price, prep_time_minutes, available, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000041', 'c0000001-0000-0000-0000-000000000007', 'Cheers to You!', 'Cheers to You!', '¡Cheers to You!', 'Cheers to You!', 'Our signature cocktail — White rum, passion fruit, coconut, lime, prosecco float', 'Onze signature cocktail — Witte rum, passievrucht, kokos, limoen, prosecco float', 'Nuestro cóctel estrella — Ron blanco, maracuyá, coco, lima, toque de prosecco', 'Unser Signature Cocktail — Weißer Rum, Passionsfrucht, Kokos, Limette, Prosecco Float', 10.50, 5, true, 41);

-- Coffee Cocktails (4 items, €8.50-€9.50)
INSERT INTO menu_items (id, category_id, name_en, name_nl, name_es, name_de, description_en, description_nl, description_es, description_de, price, prep_time_minutes, available, sort_order) VALUES
  ('d0000002-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000008', 'Espresso Martini', 'Espresso Martini', 'Espresso Martini', 'Espresso Martini', 'Vodka, Kahlua, fresh espresso', 'Vodka, Kahlua, verse espresso', 'Vodka, Kahlua, espresso fresco', 'Wodka, Kahlua, frischer Espresso', 9.50, 4, true, 1),
  ('d0000002-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000008', 'Irish Coffee', 'Irish Coffee', 'Irish Coffee', 'Irish Coffee', 'Irish whiskey, coffee, cream, sugar', 'Ierse whiskey, koffie, room, suiker', 'Whiskey irlandés, café, nata, azúcar', 'Irischer Whiskey, Kaffee, Sahne, Zucker', 8.50, 5, true, 2),
  ('d0000002-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000008', 'Baileys Coffee', 'Baileys Koffie', 'Café con Baileys', 'Baileys Kaffee', 'Baileys Irish Cream, hot coffee, whipped cream', 'Baileys Irish Cream, warme koffie, slagroom', 'Baileys Irish Cream, café caliente, nata montada', 'Baileys Irish Cream, heißer Kaffee, Schlagsahne', 8.50, 4, true, 3),
  ('d0000002-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000008', 'Amaretto Coffee', 'Amaretto Koffie', 'Café con Amaretto', 'Amaretto Kaffee', 'Amaretto, hot coffee, whipped cream', 'Amaretto, warme koffie, slagroom', 'Amaretto, café caliente, nata montada', 'Amaretto, heißer Kaffee, Schlagsahne', 8.50, 4, true, 4);

-- Spritz & Sangria (5 items)
INSERT INTO menu_items (id, category_id, name_en, name_nl, name_es, name_de, description_en, description_nl, description_es, description_de, price, prep_time_minutes, available, sort_order) VALUES
  ('d0000003-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000009', 'Aperol Spritz', 'Aperol Spritz', 'Aperol Spritz', 'Aperol Spritz', 'Aperol, prosecco, soda, orange slice', 'Aperol, prosecco, soda, sinaasappelschijf', 'Aperol, prosecco, soda, rodaja de naranja', 'Aperol, Prosecco, Soda, Orangenscheibe', 9.50, 2, true, 1),
  ('d0000003-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000009', 'Limoncello Spritz', 'Limoncello Spritz', 'Limoncello Spritz', 'Limoncello Spritz', 'Limoncello, prosecco, soda', 'Limoncello, prosecco, soda', 'Limoncello, prosecco, soda', 'Limoncello, Prosecco, Soda', 9.50, 2, true, 2),
  ('d0000003-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000009', 'Hugo Spritz', 'Hugo Spritz', 'Hugo Spritz', 'Hugo Spritz', 'Elderflower liqueur, prosecco, soda, mint', 'Vlierbloesemlikeur, prosecco, soda, munt', 'Licor de flor de saúco, prosecco, soda, menta', 'Holunderblütenlikör, Prosecco, Soda, Minze', 9.50, 2, true, 3),
  ('d0000003-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000009', 'Red Sangria', 'Rode Sangria', 'Sangría Tinta', 'Rote Sangria', 'Red wine, brandy, orange, seasonal fruits', 'Rode wijn, brandewijn, sinaasappel, seizoensfruit', 'Vino tinto, brandy, naranja, frutas de temporada', 'Rotwein, Brandy, Orange, Saisonfrüchte', 9.50, 3, true, 4),
  ('d0000003-0000-0000-0000-000000000005', 'c0000001-0000-0000-0000-000000000009', 'White Sangria', 'Witte Sangria', 'Sangría Blanca', 'Weiße Sangria', 'White wine, elderflower, peach, citrus', 'Witte wijn, vlierbloesem, perzik, citrus', 'Vino blanco, flor de saúco, melocotón, cítricos', 'Weißwein, Holunderblüte, Pfirsich, Zitrus', 9.50, 3, true, 5);

-- ============================================================================
-- COCKTAIL RECIPES (1:1 with cocktail menu_items)
-- ============================================================================

INSERT INTO cocktail_recipes (id, menu_item_id, glass_type, preparation_method, ice_type, difficulty_level, base_spirit, garnish, flavor_profiles, is_signature) VALUES
  -- Classic Cocktails
  ('b0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'highball', 'muddled', 'crushed', 'easy', 'White Rum', 'Mint sprig, lime wheel', '{refreshing,sweet,herbal}', false),
  ('b0000001-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000002', 'rocks', 'muddled', 'crushed', 'easy', 'Cachaça', 'Lime wedge', '{sour,refreshing,spirit_forward}', false),
  ('b0000001-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000003', 'hurricane', 'blended', 'crushed', 'easy', 'White Rum', 'Pineapple wedge, cherry', '{tropical,sweet,creamy}', false),
  ('b0000001-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000004', 'coupe', 'shaken', 'none', 'easy', 'Tequila', 'Salt rim, lime wheel', '{sour,refreshing}', false),
  ('b0000001-0000-0000-0000-000000000005', 'd0000001-0000-0000-0000-000000000005', 'martini', 'shaken', 'none', 'easy', 'Vodka', 'Orange twist', '{fruity,sour}', false),
  ('b0000001-0000-0000-0000-000000000006', 'd0000001-0000-0000-0000-000000000006', 'coupe', 'shaken', 'none', 'easy', 'White Rum', 'Lime wheel', '{sour,refreshing}', false),
  ('b0000001-0000-0000-0000-000000000007', 'd0000001-0000-0000-0000-000000000007', 'copper_mug', 'built', 'cubed', 'easy', 'Vodka', 'Lime wedge, mint', '{refreshing,spicy}', false),
  ('b0000001-0000-0000-0000-000000000008', 'd0000001-0000-0000-0000-000000000008', 'highball', 'built', 'cubed', 'easy', 'Dark Rum', 'Lime wedge', '{spicy,spirit_forward}', false),
  ('b0000001-0000-0000-0000-000000000009', 'd0000001-0000-0000-0000-000000000009', 'highball', 'built', 'cubed', 'medium', 'Vodka', 'Lemon wedge', '{sweet,spirit_forward}', false),
  ('b0000001-0000-0000-0000-000000000010', 'd0000001-0000-0000-0000-000000000010', 'tiki', 'shaken', 'crushed', 'medium', 'White Rum', 'Mint, lime wheel, cherry', '{tropical,sweet,fruity}', false),
  ('b0000001-0000-0000-0000-000000000011', 'd0000001-0000-0000-0000-000000000011', 'highball', 'built', 'cubed', 'easy', 'Gin', 'Lime wedge, juniper berries', '{herbal,refreshing,bitter}', false),
  ('b0000001-0000-0000-0000-000000000012', 'd0000001-0000-0000-0000-000000000012', 'rocks', 'stirred', 'large_cube', 'medium', 'Gin', 'Orange peel', '{bitter,spirit_forward,herbal}', false),
  ('b0000001-0000-0000-0000-000000000013', 'd0000001-0000-0000-0000-000000000013', 'rocks', 'stirred', 'large_cube', 'medium', 'Bourbon', 'Orange peel, cherry', '{spirit_forward,bitter,sweet}', false),
  ('b0000001-0000-0000-0000-000000000014', 'd0000001-0000-0000-0000-000000000014', 'rocks', 'shaken', 'cubed', 'medium', 'Bourbon', 'Cherry, lemon peel', '{sour,sweet,spirit_forward}', false),
  ('b0000001-0000-0000-0000-000000000015', 'd0000001-0000-0000-0000-000000000015', 'coupe', 'stirred', 'none', 'medium', 'Bourbon', 'Cherry', '{spirit_forward,sweet,bitter}', false),
  ('b0000001-0000-0000-0000-000000000016', 'd0000001-0000-0000-0000-000000000016', 'martini', 'stirred', 'none', 'medium', 'Gin', 'Olive or lemon twist', '{spirit_forward,herbal}', false),
  ('b0000001-0000-0000-0000-000000000017', 'd0000001-0000-0000-0000-000000000017', 'collins', 'shaken', 'cubed', 'easy', 'Gin', 'Lemon wheel, cherry', '{sour,refreshing}', false),
  ('b0000001-0000-0000-0000-000000000018', 'd0000001-0000-0000-0000-000000000018', 'highball', 'built', 'cubed', 'easy', 'Tequila', 'Grapefruit wedge, salt rim', '{sour,refreshing,bitter}', false),
  ('b0000001-0000-0000-0000-000000000019', 'd0000001-0000-0000-0000-000000000019', 'highball', 'built', 'cubed', 'easy', 'Tequila', 'Orange slice, cherry', '{sweet,fruity}', false),
  ('b0000001-0000-0000-0000-000000000020', 'd0000001-0000-0000-0000-000000000020', 'highball', 'built', 'cubed', 'easy', 'White Rum', 'Lime wedge', '{sweet,refreshing}', false),
  ('b0000001-0000-0000-0000-000000000021', 'd0000001-0000-0000-0000-000000000021', 'rocks', 'shaken', 'cubed', 'easy', 'Amaretto', 'Cherry, lemon peel', '{sweet,sour}', false),
  ('b0000001-0000-0000-0000-000000000022', 'd0000001-0000-0000-0000-000000000022', 'coupe', 'shaken', 'none', 'medium', 'Pisco', 'Angostura bitters drops', '{sour,spirit_forward}', false),
  ('b0000001-0000-0000-0000-000000000023', 'd0000001-0000-0000-0000-000000000023', 'highball', 'built', 'cubed', 'easy', 'Vodka', 'Orange slice', '{sweet,fruity}', false),
  ('b0000001-0000-0000-0000-000000000024', 'd0000001-0000-0000-0000-000000000024', 'highball', 'built', 'cubed', 'easy', 'Vodka', 'Lemon slice', '{sweet,refreshing}', false),
  ('b0000001-0000-0000-0000-000000000025', 'd0000001-0000-0000-0000-000000000025', 'coupe', 'shaken', 'none', 'easy', 'Midori', 'Cherry', '{sweet,sour,fruity}', false),
  ('b0000001-0000-0000-0000-000000000026', 'd0000001-0000-0000-0000-000000000026', 'rocks', 'built', 'crushed', 'medium', 'Gin', 'Blackberries, lemon', '{fruity,sweet,sour}', false),
  ('b0000001-0000-0000-0000-000000000027', 'd0000001-0000-0000-0000-000000000027', 'coupe', 'shaken', 'none', 'easy', 'Gin', 'Lime wheel', '{sour,refreshing,herbal}', false),
  ('b0000001-0000-0000-0000-000000000028', 'd0000001-0000-0000-0000-000000000028', 'coupe', 'shaken', 'none', 'medium', 'Cognac', 'Sugar rim, lemon twist', '{spirit_forward,sour,sweet}', false),
  ('b0000001-0000-0000-0000-000000000029', 'd0000001-0000-0000-0000-000000000029', 'hurricane', 'shaken', 'cubed', 'easy', 'Dark Rum', 'Orange slice, cherry', '{tropical,sweet,fruity}', false),
  ('b0000001-0000-0000-0000-000000000030', 'd0000001-0000-0000-0000-000000000030', 'hurricane', 'shaken', 'cubed', 'easy', 'Dark Rum', 'Orange slice, cherry', '{tropical,sweet,fruity}', false),
  ('b0000001-0000-0000-0000-000000000031', 'd0000001-0000-0000-0000-000000000031', 'tiki', 'shaken', 'crushed', 'advanced', 'White Rum', 'Mint, lime, cherry', '{tropical,sweet,spirit_forward}', false),
  ('b0000001-0000-0000-0000-000000000032', 'd0000001-0000-0000-0000-000000000032', 'highball', 'built', 'cubed', 'easy', 'Malibu', 'Orange slice, cherry', '{tropical,sweet,fruity}', false),
  ('b0000001-0000-0000-0000-000000000033', 'd0000001-0000-0000-0000-000000000033', 'collins', 'shaken', 'cubed', 'easy', 'Gin', 'Lemon wheel', '{sour,refreshing}', false),
  ('b0000001-0000-0000-0000-000000000034', 'd0000001-0000-0000-0000-000000000034', 'martini', 'stirred', 'none', 'easy', 'Vodka', 'Olive', '{spirit_forward}', false),
  ('b0000001-0000-0000-0000-000000000035', 'd0000001-0000-0000-0000-000000000035', 'coupe', 'blended', 'crushed', 'easy', 'White Rum', 'Strawberry', '{sweet,fruity,refreshing}', false),
  ('b0000001-0000-0000-0000-000000000036', 'd0000001-0000-0000-0000-000000000036', 'coupe', 'shaken', 'none', 'medium', 'Vodka', 'Passion fruit half, prosecco shot', '{tropical,sweet,fruity}', false),
  ('b0000001-0000-0000-0000-000000000037', 'd0000001-0000-0000-0000-000000000037', 'champagne_flute', 'shaken', 'none', 'medium', 'Gin', 'Lemon twist', '{refreshing,sour}', false),
  ('b0000001-0000-0000-0000-000000000038', 'd0000001-0000-0000-0000-000000000038', 'rocks', 'stirred', 'large_cube', 'medium', 'Bourbon', 'Orange peel, cherry', '{bitter,spirit_forward,sweet}', false),
  ('b0000001-0000-0000-0000-000000000039', 'd0000001-0000-0000-0000-000000000039', 'coupe', 'shaken', 'none', 'advanced', 'Gin', 'Lime wheel', '{herbal,sour,sweet}', false),
  ('b0000001-0000-0000-0000-000000000040', 'd0000001-0000-0000-0000-000000000040', 'rocks', 'shaken', 'cubed', 'medium', 'Dark Rum', 'Pineapple wedge', '{tropical,bitter,fruity}', false),
  -- Signature
  ('b0000001-0000-0000-0000-000000000041', 'd0000001-0000-0000-0000-000000000041', 'coupe', 'shaken', 'none', 'medium', 'White Rum', 'Passion fruit half, coconut flakes, edible flower', '{tropical,sweet,creamy,fruity}', true),
  -- Coffee cocktails
  ('b0000002-0000-0000-0000-000000000001', 'd0000002-0000-0000-0000-000000000001', 'martini', 'shaken', 'none', 'medium', 'Vodka', 'Three coffee beans', '{coffee,sweet,spirit_forward}', false),
  ('b0000002-0000-0000-0000-000000000002', 'd0000002-0000-0000-0000-000000000002', 'irish_coffee', 'built', 'none', 'easy', 'Irish Whiskey', 'Whipped cream', '{coffee,sweet,creamy}', false),
  ('b0000002-0000-0000-0000-000000000003', 'd0000002-0000-0000-0000-000000000003', 'irish_coffee', 'built', 'none', 'easy', 'Baileys', 'Whipped cream, cocoa dust', '{coffee,sweet,creamy}', false),
  ('b0000002-0000-0000-0000-000000000004', 'd0000002-0000-0000-0000-000000000004', 'irish_coffee', 'built', 'none', 'easy', 'Amaretto', 'Whipped cream', '{coffee,sweet}', false),
  -- Spritz & Sangria
  ('b0000003-0000-0000-0000-000000000001', 'd0000003-0000-0000-0000-000000000001', 'wine', 'built', 'cubed', 'easy', 'Aperol', 'Orange slice', '{bitter,refreshing,sweet}', false),
  ('b0000003-0000-0000-0000-000000000002', 'd0000003-0000-0000-0000-000000000002', 'wine', 'built', 'cubed', 'easy', 'Limoncello', 'Lemon wheel', '{sweet,sour,refreshing}', false),
  ('b0000003-0000-0000-0000-000000000003', 'd0000003-0000-0000-0000-000000000003', 'wine', 'built', 'cubed', 'easy', 'Elderflower Liqueur', 'Mint sprig', '{sweet,herbal,refreshing}', false),
  ('b0000003-0000-0000-0000-000000000004', 'd0000003-0000-0000-0000-000000000004', 'wine', 'built', 'cubed', 'easy', 'Brandy', 'Orange slice, cinnamon', '{fruity,sweet}', false),
  ('b0000003-0000-0000-0000-000000000005', 'd0000003-0000-0000-0000-000000000005', 'wine', 'built', 'cubed', 'easy', 'Elderflower Liqueur', 'Peach slice, mint', '{sweet,fruity,refreshing}', false);

-- ============================================================================
-- PREPARATION STEPS (for key cocktails, multilingual)
-- ============================================================================

-- Mojito (6 steps)
INSERT INTO cocktail_preparation_steps (recipe_id, step_number, instruction_en, instruction_nl, instruction_es, instruction_de, duration_seconds, tip) VALUES
  ('b0000001-0000-0000-0000-000000000001', 1, 'Add 8-10 fresh mint leaves and 20ml simple syrup to the glass', 'Voeg 8-10 verse muntblaadjes en 20ml suikersiroop toe aan het glas', 'Añade 8-10 hojas de menta fresca y 20ml de almíbar al vaso', 'Gib 8-10 frische Minzblätter und 20ml Zuckersirup ins Glas', 15, 'Gently press mint, don''t crush it — you want the oils, not the bitterness'),
  ('b0000001-0000-0000-0000-000000000001', 2, 'Add 30ml fresh lime juice and gently muddle', 'Voeg 30ml vers limoensap toe en muddle voorzichtig', 'Añade 30ml de zumo de lima fresco y tritura suavemente', 'Füge 30ml frischen Limettensaft hinzu und muddle vorsichtig', 15, NULL),
  ('b0000001-0000-0000-0000-000000000001', 3, 'Add 50ml white rum', 'Voeg 50ml witte rum toe', 'Añade 50ml de ron blanco', 'Gib 50ml weißen Rum dazu', 5, NULL),
  ('b0000001-0000-0000-0000-000000000001', 4, 'Fill glass with crushed ice', 'Vul het glas met crushed ice', 'Llena el vaso con hielo picado', 'Fülle das Glas mit Crushed Ice', 10, NULL),
  ('b0000001-0000-0000-0000-000000000001', 5, 'Top with soda water and stir gently', 'Aanvullen met sodawater en voorzichtig roeren', 'Rellena con agua con gas y revuelve suavemente', 'Mit Sodawasser auffüllen und sanft umrühren', 10, NULL),
  ('b0000001-0000-0000-0000-000000000001', 6, 'Garnish with mint sprig and lime wheel', 'Garneer met munt takje en limoen schijf', 'Decora con ramita de menta y rodaja de lima', 'Mit Minzzweig und Limettenscheibe garnieren', 10, 'Slap the mint sprig between your hands to release aroma');

-- Espresso Martini (4 steps)
INSERT INTO cocktail_preparation_steps (recipe_id, step_number, instruction_en, instruction_nl, instruction_es, instruction_de, duration_seconds, tip) VALUES
  ('b0000002-0000-0000-0000-000000000001', 1, 'Pull a fresh shot of espresso and let it cool slightly', 'Trek een verse espresso en laat kort afkoelen', 'Prepara un espresso fresco y déjalo enfriar ligeramente', 'Einen frischen Espresso ziehen und kurz abkühlen lassen', 30, 'Fresh espresso is key — stale coffee won''t create the signature foam'),
  ('b0000002-0000-0000-0000-000000000001', 2, 'Add 50ml vodka, 25ml Kahlua, and the espresso to a shaker with ice', 'Voeg 50ml vodka, 25ml Kahlua en de espresso toe aan een shaker met ijs', 'Añade 50ml de vodka, 25ml de Kahlua y el espresso a una coctelera con hielo', 'Gib 50ml Wodka, 25ml Kahlua und den Espresso in einen Shaker mit Eis', 15, NULL),
  ('b0000002-0000-0000-0000-000000000001', 3, 'Shake vigorously for 15 seconds — this creates the crema', 'Schud krachtig 15 seconden — dit creëert de crema', 'Agita vigorosamente durante 15 segundos — esto crea la crema', 'Kräftig 15 Sekunden schütteln — das erzeugt die Crema', 15, 'Shake harder than any other cocktail'),
  ('b0000002-0000-0000-0000-000000000001', 4, 'Double strain into a chilled martini glass. Garnish with 3 coffee beans', 'Dubbel zeven in een gekoeld martiniglas. Garneer met 3 koffiebonen', 'Doble colado en copa martini fría. Decora con 3 granos de café', 'Doppelt in ein gekühltes Martiniglas abseihen. Mit 3 Kaffeebohnen garnieren', 15, 'The 3 beans represent health, wealth, and happiness');

-- Cheers to You! Signature (5 steps)
INSERT INTO cocktail_preparation_steps (recipe_id, step_number, instruction_en, instruction_nl, instruction_es, instruction_de, duration_seconds, tip) VALUES
  ('b0000001-0000-0000-0000-000000000041', 1, 'Scoop out passion fruit pulp into a shaker', 'Schep passievruchtvlees in een shaker', 'Vierte la pulpa de maracuyá en una coctelera', 'Passionsfruchtfleisch in einen Shaker geben', 15, 'Use ripe passion fruit — they should be wrinkly'),
  ('b0000001-0000-0000-0000-000000000041', 2, 'Add 50ml white rum, 25ml coconut cream, and 20ml lime juice', 'Voeg 50ml witte rum, 25ml kokosroom en 20ml limoensap toe', 'Añade 50ml de ron blanco, 25ml de crema de coco y 20ml de zumo de lima', 'Füge 50ml weißen Rum, 25ml Kokoscreme und 20ml Limettensaft hinzu', 10, NULL),
  ('b0000001-0000-0000-0000-000000000041', 3, 'Add ice and shake vigorously for 12 seconds', 'Voeg ijs toe en schud krachtig 12 seconden', 'Añade hielo y agita vigorosamente durante 12 segundos', 'Eis hinzufügen und 12 Sekunden kräftig schütteln', 12, NULL),
  ('b0000001-0000-0000-0000-000000000041', 4, 'Double strain into a chilled coupe glass', 'Dubbel zeven in een gekoeld coupeglas', 'Doble colado en copa coupe fría', 'Doppelt in ein gekühltes Coupe-Glas abseihen', 10, NULL),
  ('b0000001-0000-0000-0000-000000000041', 5, 'Top with a splash of prosecco. Garnish with passion fruit half, coconut flakes, and an edible flower', 'Aanvullen met een scheutje prosecco. Garneer met halve passievrucht, kokossnippers en een eetbare bloem', 'Corona con un chorrito de prosecco. Decora con media maracuyá, copos de coco y una flor comestible', 'Mit einem Schuss Prosecco auffüllen. Mit halber Passionsfrucht, Kokosflocken und essbarer Blume garnieren', 15, 'The prosecco float is the "cheers" — serve with a small prosecco shot on the side');

-- Negroni (3 steps)
INSERT INTO cocktail_preparation_steps (recipe_id, step_number, instruction_en, instruction_nl, instruction_es, instruction_de, duration_seconds, tip) VALUES
  ('b0000001-0000-0000-0000-000000000012', 1, 'Add 30ml gin, 30ml Campari, and 30ml sweet vermouth to a mixing glass with ice', 'Voeg 30ml gin, 30ml Campari en 30ml zoete vermout toe aan een mengbeker met ijs', 'Añade 30ml de ginebra, 30ml de Campari y 30ml de vermut dulce a un vaso mezclador con hielo', 'Gib 30ml Gin, 30ml Campari und 30ml süßen Wermut in ein Rührglas mit Eis', 15, NULL),
  ('b0000001-0000-0000-0000-000000000012', 2, 'Stir for 20-30 seconds until well chilled', 'Roer 20-30 seconden tot goed gekoeld', 'Remueve durante 20-30 segundos hasta que esté bien frío', '20-30 Sekunden rühren bis gut gekühlt', 25, 'Stir, don''t shake — a Negroni should be silky, not frothy'),
  ('b0000001-0000-0000-0000-000000000012', 3, 'Strain into a rocks glass over a large ice cube. Garnish with orange peel', 'Zeef in een tumbler over een groot ijsblok. Garneer met sinaasappelschil', 'Cuela en un vaso rocks sobre un cubo de hielo grande. Decora con piel de naranja', 'In ein Rocks-Glas über einen großen Eiswürfel abseihen. Mit Orangenschale garnieren', 15, 'Express the orange peel oils over the drink before placing');

-- Aperol Spritz (3 steps)
INSERT INTO cocktail_preparation_steps (recipe_id, step_number, instruction_en, instruction_nl, instruction_es, instruction_de, duration_seconds, tip) VALUES
  ('b0000003-0000-0000-0000-000000000001', 1, 'Fill a large wine glass with ice cubes', 'Vul een groot wijnglas met ijsblokjes', 'Llena una copa de vino grande con cubitos de hielo', 'Ein großes Weinglas mit Eiswürfeln füllen', 10, NULL),
  ('b0000003-0000-0000-0000-000000000001', 2, 'Pour 60ml Aperol, then 90ml prosecco', 'Schenk 60ml Aperol in, dan 90ml prosecco', 'Vierte 60ml de Aperol, luego 90ml de prosecco', '60ml Aperol eingießen, dann 90ml Prosecco', 10, 'Always Aperol first, then prosecco — the bubbles do the mixing'),
  ('b0000003-0000-0000-0000-000000000001', 3, 'Top with a splash of soda water. Garnish with an orange slice', 'Aanvullen met een scheutje sodawater. Garneer met een sinaasappelschijf', 'Rellena con un chorrito de agua con gas. Decora con una rodaja de naranja', 'Mit einem Schuss Sodawasser auffüllen. Mit einer Orangenscheibe garnieren', 10, NULL);

-- Old Fashioned (4 steps)
INSERT INTO cocktail_preparation_steps (recipe_id, step_number, instruction_en, instruction_nl, instruction_es, instruction_de, duration_seconds, tip) VALUES
  ('b0000001-0000-0000-0000-000000000013', 1, 'Add a sugar cube and 2-3 dashes of Angostura bitters to a rocks glass', 'Voeg een suikerklontje en 2-3 scheuten Angostura bitters toe aan een tumbler', 'Añade un terrón de azúcar y 2-3 gotas de Angostura bitters a un vaso rocks', 'Einen Zuckerwürfel und 2-3 Spritzer Angostura Bitter in ein Rocks-Glas geben', 10, NULL),
  ('b0000001-0000-0000-0000-000000000013', 2, 'Add a splash of water and muddle until dissolved', 'Voeg een scheutje water toe en muddle tot opgelost', 'Añade un chorrito de agua y tritura hasta disolver', 'Einen Spritzer Wasser dazugeben und muddlen bis aufgelöst', 15, NULL),
  ('b0000001-0000-0000-0000-000000000013', 3, 'Add 60ml bourbon and a large ice cube. Stir gently', 'Voeg 60ml bourbon en een groot ijsblok toe. Roer voorzichtig', 'Añade 60ml de bourbon y un cubo de hielo grande. Remueve suavemente', '60ml Bourbon und einen großen Eiswürfel hinzufügen. Sanft umrühren', 20, NULL),
  ('b0000001-0000-0000-0000-000000000013', 4, 'Express orange peel over the drink, rub the rim, and drop in. Add a cherry', 'Knijp sinaasappelschil uit boven de cocktail, wrijf over de rand en laat erin vallen. Voeg een kers toe', 'Exprime la piel de naranja sobre la bebida, frota el borde y déjala caer. Añade una cereza', 'Orangenschale über dem Drink ausdrücken, den Rand einreiben und hineinlegen. Eine Kirsche hinzufügen', 15, 'A perfectly made Old Fashioned is the mark of a good bartender');
