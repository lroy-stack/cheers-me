-- ============================================================
-- Migration 041: Coffee category with standard cafe selections
-- ============================================================

-- Category: Coffees (sort_order 13, after Soft Drinks)
INSERT INTO menu_categories (id, name_en, name_nl, name_es, name_de, sort_order)
VALUES ('c0000001-0000-0000-0000-000000000013', 'Coffees', 'Koffie', 'Cafés', 'Kaffee', 13)
ON CONFLICT (id) DO NOTHING;

-- Menu items for coffees
INSERT INTO menu_items (id, category_id, name_en, name_nl, name_es, name_de, description_en, description_nl, description_es, description_de, price, available, sort_order)
VALUES
  -- Espresso-based
  ('f0000007-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000013',
   'Espresso', 'Espresso', 'Espresso', 'Espresso',
   'Single shot of rich Italian espresso', 'Enkele shot rijke Italiaanse espresso', 'Un shot de espresso italiano intenso', 'Einzelner Schuss reichhaltiger italienischer Espresso',
   2.50, true, 1),

  ('f0000007-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000013',
   'Double Espresso', 'Dubbele Espresso', 'Espresso Doble', 'Doppelter Espresso',
   'Double shot for an extra kick', 'Dubbele shot voor een extra kick', 'Doble shot para un impulso extra', 'Doppelter Schuss für den Extra-Kick',
   3.50, true, 2),

  ('f0000007-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000013',
   'Americano', 'Americano', 'Americano', 'Americano',
   'Espresso with hot water for a smooth, full-bodied coffee', 'Espresso met heet water voor een zachte, volle koffie', 'Espresso con agua caliente para un café suave e intenso', 'Espresso mit heißem Wasser für einen sanften, vollmundigen Kaffee',
   3.00, true, 3),

  ('f0000007-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000013',
   'Cappuccino', 'Cappuccino', 'Cappuccino', 'Cappuccino',
   'Espresso topped with steamed milk foam', 'Espresso met gestoomd melkschuim', 'Espresso cubierto con espuma de leche', 'Espresso mit aufgeschäumter Milch',
   3.50, true, 4),

  ('f0000007-0000-0000-0000-000000000005', 'c0000001-0000-0000-0000-000000000013',
   'Latte', 'Latte', 'Café con Leche', 'Milchkaffee',
   'Smooth espresso with plenty of steamed milk', 'Zachte espresso met veel gestoomde melk', 'Espresso suave con abundante leche caliente', 'Sanfter Espresso mit viel aufgeschäumter Milch',
   3.50, true, 5),

  ('f0000007-0000-0000-0000-000000000006', 'c0000001-0000-0000-0000-000000000013',
   'Flat White', 'Flat White', 'Flat White', 'Flat White',
   'Double espresso with velvety microfoam milk', 'Dubbele espresso met fluweelachtig melkschuim', 'Doble espresso con leche micro-espumada aterciopelada', 'Doppelter Espresso mit samtigem Mikroschaum',
   3.75, true, 6),

  ('f0000007-0000-0000-0000-000000000007', 'c0000001-0000-0000-0000-000000000013',
   'Latte Macchiato', 'Latte Macchiato', 'Latte Macchiato', 'Latte Macchiato',
   'Layered milk and espresso served in a tall glass', 'Gelaagde melk en espresso geserveerd in een hoog glas', 'Leche y espresso en capas servido en vaso alto', 'Geschichtete Milch und Espresso im hohen Glas',
   3.75, true, 7),

  -- Tea & alternatives
  ('f0000007-0000-0000-0000-000000000008', 'c0000001-0000-0000-0000-000000000013',
   'Tea', 'Thee', 'Té', 'Tee',
   'Selection of black, green and herbal teas', 'Selectie van zwarte, groene en kruidenthee', 'Selección de tés negro, verde e infusiones', 'Auswahl an Schwarz-, Grün- und Kräutertees',
   2.50, true, 8),

  ('f0000007-0000-0000-0000-000000000009', 'c0000001-0000-0000-0000-000000000013',
   'Hot Chocolate', 'Warme Chocolademelk', 'Chocolate Caliente', 'Heiße Schokolade',
   'Rich and creamy hot chocolate with whipped cream', 'Rijke en romige warme chocolademelk met slagroom', 'Chocolate caliente rico y cremoso con nata montada', 'Reichhaltige und cremige heiße Schokolade mit Sahne',
   3.50, true, 9),

  ('f0000007-0000-0000-0000-000000000010', 'c0000001-0000-0000-0000-000000000013',
   'Iced Coffee', 'IJskoffie', 'Café Helado', 'Eiskaffee',
   'Cold brew espresso over ice with milk', 'Koude espresso over ijs met melk', 'Espresso frío con hielo y leche', 'Kalter Espresso über Eis mit Milch',
   4.00, true, 10),

  ('f0000007-0000-0000-0000-000000000011', 'c0000001-0000-0000-0000-000000000013',
   'Iced Latte', 'IJslatte', 'Latte Helado', 'Eislatte',
   'Chilled latte with espresso and cold milk over ice', 'Koude latte met espresso en koude melk over ijs', 'Latte frío con espresso y leche fría con hielo', 'Kalter Latte mit Espresso und kalter Milch über Eis',
   4.50, true, 11),

  -- Specials
  ('f0000007-0000-0000-0000-000000000012', 'c0000001-0000-0000-0000-000000000013',
   'Cortado', 'Cortado', 'Cortado', 'Cortado',
   'Equal parts espresso and warm steamed milk', 'Gelijke delen espresso en warme gestoomde melk', 'Partes iguales de espresso y leche caliente', 'Gleiche Teile Espresso und warme aufgeschäumte Milch',
   3.00, true, 12),

  ('f0000007-0000-0000-0000-000000000013', 'c0000001-0000-0000-0000-000000000013',
   'Affogato', 'Affogato', 'Affogato', 'Affogato',
   'Vanilla ice cream drowned in a shot of hot espresso', 'Vanille-ijs overgoten met een shot hete espresso', 'Helado de vainilla ahogado en un shot de espresso caliente', 'Vanilleeis übergossen mit einem Schuss heißem Espresso',
   4.50, true, 13),

  ('f0000007-0000-0000-0000-000000000014', 'c0000001-0000-0000-0000-000000000013',
   'Chai Latte', 'Chai Latte', 'Chai Latte', 'Chai Latte',
   'Spiced tea with steamed milk and a touch of cinnamon', 'Gekruide thee met gestoomde melk en een vleugje kaneel', 'Té especiado con leche caliente y un toque de canela', 'Gewürztee mit aufgeschäumter Milch und einer Prise Zimt',
   4.00, true, 14);

-- Also remove the old "Coffee / Tea" item from Soft Drinks since we now have a dedicated category
DELETE FROM menu_items WHERE id = '657f618c-6bb1-434c-9af3-f85aad8d0f4a';
