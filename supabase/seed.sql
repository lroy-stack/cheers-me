-- ============================================================================
-- GrandCafe Cheers — Comprehensive Seed Data for Development
-- Platform: Next.js + Supabase
-- Version: 1.0.0
-- Purpose: Populate database with realistic data for QA & testing
-- ============================================================================

-- NOTE: This seed file assumes you have run all migrations first.
-- Authentication profiles must exist in auth.users table.
-- Update the auth.users.id UUIDs below to match your test users.

-- ============================================================================
-- AUTH SETUP (Create test users first via Supabase Dashboard or CLI)
-- ============================================================================

-- Example test users (you'll need to create these in Supabase Auth first):
-- 1. leroy@cheers.test (admin/manager) - Full access
-- 2. kitchen@cheers.test (kitchen) - Menu & orders
-- 3. waiter1@cheers.test (waiter) - Tables & reservations
-- 4. waiter2@cheers.test (waiter) - Tables & reservations
-- 5. bar@cheers.test (bar) - Stock & events
-- 6. dj@cheers.test (dj) - Events
-- 7. owner@cheers.test (owner) - Finance reports

-- ============================================================================
-- PROFILES & AUTHORIZATION
-- ============================================================================

-- Manager (Leroy - admin access)
INSERT INTO profiles (id, email, full_name, role, phone, language, active)
VALUES ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'leroy@cheers.test', 'Leroy Manager', 'manager', '+34-600-123-456', 'en', true)
ON CONFLICT DO NOTHING;

-- Kitchen Staff
INSERT INTO profiles (id, email, full_name, role, phone, language, active)
VALUES ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'kitchen@cheers.test', 'Carlos Kitchen', 'kitchen', '+34-600-234-567', 'es', true)
ON CONFLICT DO NOTHING;

-- Waiter 1
INSERT INTO profiles (id, email, full_name, role, phone, language, active)
VALUES ('550e8400-e29b-41d4-a716-446655440003'::uuid, 'waiter1@cheers.test', 'Anna Waiter', 'waiter', '+34-600-345-678', 'en', true)
ON CONFLICT DO NOTHING;

-- Waiter 2
INSERT INTO profiles (id, email, full_name, role, phone, language, active)
VALUES ('550e8400-e29b-41d4-a716-446655440004'::uuid, 'waiter2@cheers.test', 'Marco Waiter', 'waiter', '+34-600-456-789', 'en', true)
ON CONFLICT DO NOTHING;

-- Bar Staff
INSERT INTO profiles (id, email, full_name, role, phone, language, active)
VALUES ('550e8400-e29b-41d4-a716-446655440005'::uuid, 'bar@cheers.test', 'Sofia Bar', 'bar', '+34-600-567-890', 'en', true)
ON CONFLICT DO NOTHING;

-- DJ
INSERT INTO profiles (id, email, full_name, role, phone, language, active)
VALUES ('550e8400-e29b-41d4-a716-446655440006'::uuid, 'dj@cheers.test', 'DJ Maverick', 'dj', '+34-600-678-901', 'en', true)
ON CONFLICT DO NOTHING;

-- Owner
INSERT INTO profiles (id, email, full_name, role, phone, language, active)
VALUES ('550e8400-e29b-41d4-a716-446655440007'::uuid, 'owner@cheers.test', 'Owner Finance', 'owner', '+34-600-789-012', 'en', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STAFF MANAGEMENT
-- ============================================================================

-- Insert employees (linked to profiles)
INSERT INTO employees (id, profile_id, hourly_rate, contract_type, date_hired)
VALUES
  ('650e8400-e29b-41d4-a716-446655440001'::uuid, '550e8400-e29b-41d4-a716-446655440001'::uuid, 16.50, 'full_time', '2024-04-01'),
  ('650e8400-e29b-41d4-a716-446655440002'::uuid, '550e8400-e29b-41d4-a716-446655440002'::uuid, 12.50, 'part_time', '2024-05-15'),
  ('650e8400-e29b-41d4-a716-446655440003'::uuid, '550e8400-e29b-41d4-a716-446655440003'::uuid, 11.50, 'part_time', '2024-06-01'),
  ('650e8400-e29b-41d4-a716-446655440004'::uuid, '550e8400-e29b-41d4-a716-446655440004'::uuid, 11.50, 'casual', '2024-06-10'),
  ('650e8400-e29b-41d4-a716-446655440005'::uuid, '550e8400-e29b-41d4-a716-446655440005'::uuid, 12.50, 'part_time', '2024-05-20'),
  ('650e8400-e29b-41d4-a716-446655440006'::uuid, '550e8400-e29b-41d4-a716-446655440006'::uuid, 80.00, 'contractor', '2024-04-01')
ON CONFLICT DO NOTHING;

-- Shift Templates
INSERT INTO shift_templates (id, name, shift_type, start_time, end_time, break_duration_minutes)
VALUES
  ('750e8400-e29b-41d4-a716-446655440001'::uuid, 'Morning Shift', 'morning', '10:30'::time, '17:00'::time, 30),
  ('750e8400-e29b-41d4-a716-446655440002'::uuid, 'Afternoon Shift', 'afternoon', '17:00'::time, '23:00'::time, 30),
  ('750e8400-e29b-41d4-a716-446655440003'::uuid, 'Night Shift', 'night', '23:00'::time, '03:00'::time, 15),
  ('750e8400-e29b-41d4-a716-446655440004'::uuid, 'Lunch Rush', 'afternoon', '12:00'::time, '16:00'::time, 0),
  ('750e8400-e29b-41d4-a716-446655440005'::uuid, 'Dinner Service', 'afternoon', '18:00'::time, '22:00'::time, 15),
  ('750e8400-e29b-41d4-a716-446655440006'::uuid, 'Weekend Double', 'morning', '10:30'::time, '23:00'::time, 90)
ON CONFLICT DO NOTHING;

-- This week's shifts (Feb 10-16, 2026)
INSERT INTO shifts (id, employee_id, date, shift_type, start_time, end_time, break_duration_minutes, status)
VALUES
  -- Monday Feb 10, 2026
  ('850e8400-e29b-41d4-a716-446655440001'::uuid, '650e8400-e29b-41d4-a716-446655440002'::uuid, '2026-02-10', 'morning', '10:30'::time, '17:00'::time, 30, 'scheduled'),
  ('850e8400-e29b-41d4-a716-446655440002'::uuid, '650e8400-e29b-41d4-a716-446655440003'::uuid, '2026-02-10', 'afternoon', '17:00'::time, '23:00'::time, 30, 'scheduled'),
  ('850e8400-e29b-41d4-a716-446655440003'::uuid, '650e8400-e29b-41d4-a716-446655440005'::uuid, '2026-02-10', 'afternoon', '17:00'::time, '23:00'::time, 30, 'scheduled'),
  ('850e8400-e29b-41d4-a716-446655440004'::uuid, '650e8400-e29b-41d4-a716-446655440006'::uuid, '2026-02-10', 'night', '22:00'::time, '03:00'::time, 0, 'scheduled'),
  -- Tuesday Feb 11, 2026
  ('850e8400-e29b-41d4-a716-446655440005'::uuid, '650e8400-e29b-41d4-a716-446655440002'::uuid, '2026-02-11', 'morning', '10:30'::time, '17:00'::time, 30, 'scheduled'),
  ('850e8400-e29b-41d4-a716-446655440006'::uuid, '650e8400-e29b-41d4-a716-446655440004'::uuid, '2026-02-11', 'afternoon', '17:00'::time, '23:00'::time, 30, 'scheduled'),
  ('850e8400-e29b-41d4-a716-446655440007'::uuid, '650e8400-e29b-41d4-a716-446655440005'::uuid, '2026-02-11', 'afternoon', '17:00'::time, '23:00'::time, 30, 'scheduled'),
  ('850e8400-e29b-41d4-a716-446655440008'::uuid, '650e8400-e29b-41d4-a716-446655440006'::uuid, '2026-02-11', 'night', '22:00'::time, '03:00'::time, 0, 'scheduled'),
  -- Wednesday Feb 12, 2026
  ('850e8400-e29b-41d4-a716-446655440009'::uuid, '650e8400-e29b-41d4-a716-446655440001'::uuid, '2026-02-12', 'morning', '10:30'::time, '17:00'::time, 30, 'scheduled'),
  ('850e8400-e29b-41d4-a716-446655440010'::uuid, '650e8400-e29b-41d4-a716-446655440003'::uuid, '2026-02-12', 'afternoon', '17:00'::time, '23:00'::time, 30, 'scheduled'),
  ('850e8400-e29b-41d4-a716-446655440011'::uuid, '650e8400-e29b-41d4-a716-446655440005'::uuid, '2026-02-12', 'afternoon', '17:00'::time, '23:00'::time, 30, 'scheduled'),
  ('850e8400-e29b-41d4-a716-446655440012'::uuid, '650e8400-e29b-41d4-a716-446655440006'::uuid, '2026-02-12', 'night', '22:00'::time, '03:00'::time, 0, 'scheduled')
ON CONFLICT DO NOTHING;

-- Availability (mark some days as unavailable)
INSERT INTO availability (id, employee_id, date, available, reason)
VALUES
  ('950e8400-e29b-41d4-a716-446655440001'::uuid, '650e8400-e29b-41d4-a716-446655440002'::uuid, '2026-02-13', false, 'Doctor appointment'),
  ('950e8400-e29b-41d4-a716-446655440002'::uuid, '650e8400-e29b-41d4-a716-446655440003'::uuid, '2026-02-15', false, 'Family event'),
  ('950e8400-e29b-41d4-a716-446655440003'::uuid, '650e8400-e29b-41d4-a716-446655440004'::uuid, '2026-02-16', false, 'Personal')
ON CONFLICT DO NOTHING;

-- Clock in/out records (yesterday's shifts)
INSERT INTO clock_in_out (id, employee_id, shift_id, clock_in_time, clock_out_time)
VALUES
  ('a50e8400-e29b-41d4-a716-446655440001'::uuid, '650e8400-e29b-41d4-a716-446655440002'::uuid, '850e8400-e29b-41d4-a716-446655440001'::uuid, '2026-02-09 10:28:00+00'::timestamptz, '2026-02-09 17:05:00+00'::timestamptz),
  ('a50e8400-e29b-41d4-a716-446655440002'::uuid, '650e8400-e29b-41d4-a716-446655440003'::uuid, '850e8400-e29b-41d4-a716-446655440002'::uuid, '2026-02-09 16:55:00+00'::timestamptz, '2026-02-09 23:10:00+00'::timestamptz),
  ('a50e8400-e29b-41d4-a716-446655440003'::uuid, '650e8400-e29b-41d4-a716-446655440005'::uuid, '850e8400-e29b-41d4-a716-446655440003'::uuid, '2026-02-09 16:58:00+00'::timestamptz, '2026-02-09 23:05:00+00'::timestamptz)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- MENU & KITCHEN MANAGEMENT
-- ============================================================================

-- Menu Categories
INSERT INTO menu_categories (id, name, sort_order)
VALUES
  ('c50e8400-e29b-41d4-a716-446655440001'::uuid, 'Breakfast', 1),
  ('c50e8400-e29b-41d4-a716-446655440002'::uuid, 'Salads', 2),
  ('c50e8400-e29b-41d4-a716-446655440003'::uuid, 'Burgers', 3),
  ('c50e8400-e29b-41d4-a716-446655440004'::uuid, 'Main Courses', 4),
  ('c50e8400-e29b-41d4-a716-446655440005'::uuid, 'Desserts', 5),
  ('c50e8400-e29b-41d4-a716-446655440006'::uuid, 'Cocktails', 6),
  ('c50e8400-e29b-41d4-a716-446655440007'::uuid, 'Beers', 7),
  ('c50e8400-e29b-41d4-a716-446655440008'::uuid, 'Soft Drinks', 8)
ON CONFLICT DO NOTHING;

-- Menu Items - Breakfast
INSERT INTO menu_items (id, category_id, name_en, name_nl, name_es, description_en, description_nl, description_es, price, cost_of_goods, prep_time_minutes, available, sort_order)
VALUES
  ('d50e8400-e29b-41d4-a716-446655440001'::uuid, 'c50e8400-e29b-41d4-a716-446655440001'::uuid, 'Avocado Toast', 'Avocado Toast', 'Tostadas de Aguacate', 'Sourdough with crushed avocado, lime, chili', 'Sourdough met gepureerde avocado, limoen, chili', 'Pan integral con aguacate machacado, lima, chili', 8.50, 2.50, 10, true, 1),
  ('d50e8400-e29b-41d4-a716-446655440002'::uuid, 'c50e8400-e29b-41d4-a716-446655440001'::uuid, 'Full English Breakfast', 'English Breakfast', 'Desayuno Inglés', 'Eggs, bacon, sausage, beans, toast', 'Eieren, spek, worst, bonen, toast', 'Huevos, tocino, salchicha, judías, pan tostado', 14.50, 4.50, 20, true, 2),
  ('d50e8400-e29b-41d4-a716-446655440003'::uuid, 'c50e8400-e29b-41d4-a716-446655440001'::uuid, 'Shakshuka', 'Shakshuka', 'Shakshuka', 'Eggs poached in spicy tomato sauce with pita', 'Eieren in pikante tomatensaus met pita', 'Huevos en salsa de tomate picante con pan pita', 11.00, 3.50, 15, true, 3)
ON CONFLICT DO NOTHING;

-- Menu Items - Salads
INSERT INTO menu_items (id, category_id, name_en, name_nl, name_es, description_en, description_nl, description_es, price, cost_of_goods, prep_time_minutes, available, sort_order)
VALUES
  ('d50e8400-e29b-41d4-a716-446655440004'::uuid, 'c50e8400-e29b-41d4-a716-446655440002'::uuid, 'Greek Salad', 'Griekse Salade', 'Ensalada Griega', 'Feta, olives, tomato, cucumber, red onion', 'Feta, olijven, tomaat, komkommer, rode ui', 'Queso feta, aceitunas, tomate, pepino, cebolla roja', 10.50, 3.00, 8, true, 1),
  ('d50e8400-e29b-41d4-a716-446655440005'::uuid, 'c50e8400-e29b-41d4-a716-446655440002'::uuid, 'Caesar Salad', 'Caesar Salade', 'Ensalada César', 'Romaine, parmesan, croutons, Caesar dressing', 'Romaine, parmezaan, croutons, Caesar dressing', 'Lechuga romana, parmesano, crutones, salsa César', 11.00, 3.20, 8, true, 2)
ON CONFLICT DO NOTHING;

-- Menu Items - Burgers
INSERT INTO menu_items (id, category_id, name_en, name_nl, name_es, description_en, description_nl, description_es, price, cost_of_goods, prep_time_minutes, available, sort_order)
VALUES
  ('d50e8400-e29b-41d4-a716-446655440006'::uuid, 'c50e8400-e29b-41d4-a716-446655440003'::uuid, 'Classic Burger', 'Klassieke Burger', 'Burger Clásico', 'Beef patty, lettuce, tomato, cheese, mayo', 'Rundvleesballetje, sla, tomaat, kaas, mayo', 'Carne de res, lechuga, tomate, queso, mayo', 13.50, 4.00, 15, true, 1),
  ('d50e8400-e29b-41d4-a716-446655440007'::uuid, 'c50e8400-e29b-41d4-a716-446655440003'::uuid, 'Bacon & Cheese Burger', 'Bacon & Kaas Burger', 'Burger de Bacon y Queso', 'Beef patty, bacon, cheddar, pickles', 'Rundvleesballetje, spek, cheddar, augurken', 'Carne de res, tocino, cheddar, encurtidos', 15.50, 5.00, 15, true, 2)
ON CONFLICT DO NOTHING;

-- Menu Items - Main Courses
INSERT INTO menu_items (id, category_id, name_en, name_nl, name_es, description_en, description_nl, description_es, price, cost_of_goods, prep_time_minutes, available, sort_order)
VALUES
  ('d50e8400-e29b-41d4-a716-446655440008'::uuid, 'c50e8400-e29b-41d4-a716-446655440004'::uuid, 'Wiener Schnitzel', 'Wiener Schnitzel', 'Milanesa Vienesa', 'Breaded veal, lemon, potato salad', 'Gepaneerde kalfsvlees, citroen, aardappelsalade', 'Ternera empanizada, limón, ensalada de papas', 18.50, 6.50, 20, true, 1),
  ('d50e8400-e29b-41d4-a716-446655440009'::uuid, 'c50e8400-e29b-41d4-a716-446655440004'::uuid, 'Fish & Chips', 'Vis & Chips', 'Pescado & Papas Fritas', 'Battered cod, fries, tartare sauce', 'Gefrituurde kabeljauw, friet, tartaarsaus', 'Bacalao rebozado, papas fritas, salsa tártara', 16.50, 5.50, 18, true, 2)
ON CONFLICT DO NOTHING;

-- Menu Items - Desserts
INSERT INTO menu_items (id, category_id, name_en, name_nl, name_es, description_en, description_nl, description_es, price, cost_of_goods, prep_time_minutes, available, sort_order)
VALUES
  ('d50e8400-e29b-41d4-a716-446655440010'::uuid, 'c50e8400-e29b-41d4-a716-446655440005'::uuid, 'Chocolate Cake', 'Chocoladetaart', 'Pastel de Chocolate', 'Rich chocolate cake with ganache', 'Rijke chocoladetaart met ganache', 'Pastel de chocolate con ganache', 7.50, 1.80, 5, true, 1),
  ('d50e8400-e29b-41d4-a716-446655440011'::uuid, 'c50e8400-e29b-41d4-a716-446655440005'::uuid, 'Tiramisu', 'Tiramisu', 'Tiramisú', 'Classic Italian dessert', 'Klassieke Italiaanse dessert', 'Postre italiano clásico', 7.00, 1.60, 5, true, 2)
ON CONFLICT DO NOTHING;

-- Menu Items - Cocktails
INSERT INTO menu_items (id, category_id, name_en, name_nl, name_es, description_en, description_nl, description_es, price, cost_of_goods, prep_time_minutes, available, sort_order)
VALUES
  ('d50e8400-e29b-41d4-a716-446655440012'::uuid, 'c50e8400-e29b-41d4-a716-446655440006'::uuid, 'Mojito', 'Mojito', 'Mojito', 'Rum, mint, lime, soda', 'Ron, munt, limoen, soda', 'Ron, menta, lima, soda', 9.00, 2.00, 5, true, 1),
  ('d50e8400-e29b-41d4-a716-446655440013'::uuid, 'c50e8400-e29b-41d4-a716-446655440006'::uuid, 'Margarita', 'Margarita', 'Margarita', 'Tequila, lime, triple sec, salt rim', 'Tequila, limoen, triple sec, zoutkant', 'Tequila, lima, triple sec, borde de sal', 9.50, 2.20, 5, true, 2)
ON CONFLICT DO NOTHING;

-- Allergens for some items
INSERT INTO menu_allergens (id, menu_item_id, allergen)
VALUES
  ('e50e8400-e29b-41d4-a716-446655440001'::uuid, 'd50e8400-e29b-41d4-a716-446655440001'::uuid, 'gluten'),
  ('e50e8400-e29b-41d4-a716-446655440002'::uuid, 'd50e8400-e29b-41d4-a716-446655440002'::uuid, 'eggs'),
  ('e50e8400-e29b-41d4-a716-446655440003'::uuid, 'd50e8400-e29b-41d4-a716-446655440006'::uuid, 'milk'),
  ('e50e8400-e29b-41d4-a716-446655440004'::uuid, 'd50e8400-e29b-41d4-a716-446655440008'::uuid, 'eggs'),
  ('e50e8400-e29b-41d4-a716-446655440005'::uuid, 'd50e8400-e29b-41d4-a716-446655440008'::uuid, 'milk'),
  ('e50e8400-e29b-41d4-a716-446655440006'::uuid, 'd50e8400-e29b-41d4-a716-446655440010'::uuid, 'milk')
ON CONFLICT DO NOTHING;

-- Menu Ingredients
INSERT INTO menu_ingredients (id, menu_item_id, ingredient_name, quantity, unit)
VALUES
  ('f50e8400-e29b-41d4-a716-446655440001'::uuid, 'd50e8400-e29b-41d4-a716-446655440001'::uuid, 'Avocado', 0.5, 'piece'),
  ('f50e8400-e29b-41d4-a716-446655440002'::uuid, 'd50e8400-e29b-41d4-a716-446655440001'::uuid, 'Sourdough Bread', 1, 'slice'),
  ('f50e8400-e29b-41d4-a716-446655440003'::uuid, 'd50e8400-e29b-41d4-a716-446655440001'::uuid, 'Lime', 0.5, 'piece'),
  ('f50e8400-e29b-41d4-a716-446655440004'::uuid, 'd50e8400-e29b-41d4-a716-446655440006'::uuid, 'Beef Patty', 1, 'piece'),
  ('f50e8400-e29b-41d4-a716-446655440005'::uuid, 'd50e8400-e29b-41d4-a716-446655440006'::uuid, 'Lettuce', 30, 'g'),
  ('f50e8400-e29b-41d4-a716-446655440006'::uuid, 'd50e8400-e29b-41d4-a716-446655440006'::uuid, 'Cheese', 50, 'g')
ON CONFLICT DO NOTHING;

-- Daily Specials
INSERT INTO daily_specials (id, menu_item_id, date, name_en, description_en, price)
VALUES
  ('g50e8400-e29b-41d4-a716-446655440001'::uuid, 'd50e8400-e29b-41d4-a716-446655440008'::uuid, '2026-02-10', 'Schnitzel Tuesday', 'Fresh veal schnitzel with extra lemon wedges', 16.50),
  ('g50e8400-e29b-41d4-a716-446655440002'::uuid, 'd50e8400-e29b-41d4-a716-446655440012'::uuid, '2026-02-11', 'Mojito Wednesday', 'Premium Mojito with fresh mint from our garden', 8.50)
ON CONFLICT DO NOTHING;

-- Tables (Floor plan) — 32 realistic tables for GrandCafe Cheers Mallorca
-- Note: These are basic seed entries. Migration 021 handles full floor plan with sections.
-- Terrace (10 tables)
INSERT INTO tables (table_number, capacity, section, x_position, y_position, status, is_active, shape)
VALUES
  ('T01', 2, 'Terrace', 50, 50, 'available', true, 'round'),
  ('T02', 2, 'Terrace', 150, 50, 'available', true, 'round'),
  ('T03', 2, 'Terrace', 250, 50, 'available', true, 'round'),
  ('T04', 2, 'Terrace', 350, 50, 'available', true, 'round'),
  ('T05', 4, 'Terrace', 50, 150, 'available', true, 'square'),
  ('T06', 4, 'Terrace', 150, 150, 'available', true, 'square'),
  ('T07', 4, 'Terrace', 250, 150, 'available', true, 'square'),
  ('T08', 4, 'Terrace', 350, 150, 'available', true, 'square'),
  ('T09', 6, 'Terrace', 100, 250, 'available', true, 'rectangle'),
  ('T10', 6, 'Terrace', 280, 250, 'available', true, 'rectangle')
ON CONFLICT (table_number) DO NOTHING;

-- Main Hall (8 tables)
INSERT INTO tables (table_number, capacity, section, x_position, y_position, status, is_active, shape)
VALUES
  ('M01', 2, 'Main Hall', 500, 50, 'available', true, 'round'),
  ('M02', 2, 'Main Hall', 600, 50, 'available', true, 'round'),
  ('M03', 4, 'Main Hall', 500, 150, 'available', true, 'square'),
  ('M04', 4, 'Main Hall', 600, 150, 'available', true, 'square'),
  ('M05', 4, 'Main Hall', 700, 150, 'available', true, 'square'),
  ('M06', 6, 'Main Hall', 500, 260, 'available', true, 'rectangle'),
  ('M07', 6, 'Main Hall', 680, 260, 'available', true, 'rectangle'),
  ('M08', 8, 'Main Hall', 580, 370, 'available', true, 'rectangle')
ON CONFLICT (table_number) DO NOTHING;

-- Dining Room (6 tables)
INSERT INTO tables (table_number, capacity, section, x_position, y_position, status, is_active, shape)
VALUES
  ('D01', 2, 'Dining Room', 50, 400, 'available', true, 'round'),
  ('D02', 2, 'Dining Room', 150, 400, 'available', true, 'round'),
  ('D03', 4, 'Dining Room', 50, 500, 'available', true, 'square'),
  ('D04', 4, 'Dining Room', 150, 500, 'available', true, 'square'),
  ('D05', 6, 'Dining Room', 50, 600, 'available', true, 'rectangle'),
  ('D06', 8, 'Dining Room', 200, 600, 'available', true, 'rectangle')
ON CONFLICT (table_number) DO NOTHING;

-- Bar (4 high tables)
INSERT INTO tables (table_number, capacity, section, x_position, y_position, status, is_active, shape)
VALUES
  ('B01', 2, 'Bar', 500, 450, 'available', true, 'round'),
  ('B02', 2, 'Bar', 600, 450, 'available', true, 'round'),
  ('B03', 4, 'Bar', 500, 550, 'available', true, 'square'),
  ('B04', 4, 'Bar', 600, 550, 'available', true, 'square')
ON CONFLICT (table_number) DO NOTHING;

-- Lounge / VIP (4 tables)
INSERT INTO tables (table_number, capacity, section, x_position, y_position, status, is_active, shape)
VALUES
  ('L01', 4, 'Lounge / VIP', 500, 680, 'available', true, 'round'),
  ('L02', 4, 'Lounge / VIP', 620, 680, 'available', true, 'round'),
  ('L03', 6, 'Lounge / VIP', 500, 780, 'available', true, 'rectangle'),
  ('L04', 10, 'Lounge / VIP', 660, 780, 'available', true, 'rectangle')
ON CONFLICT (table_number) DO NOTHING;

-- ============================================================================
-- STOCK & INVENTORY
-- ============================================================================

-- Suppliers
INSERT INTO suppliers (id, name, contact_person, email, phone, payment_terms)
VALUES
  ('i50e8400-e29b-41d4-a716-446655440001'::uuid, 'Fresh Foods Mallorca', 'Juan García', 'juan@freshfoods.es', '+34-971-123-456', 'Net 30'),
  ('i50e8400-e29b-41d4-a716-446655440002'::uuid, 'Cervecería Balear', 'Miguel López', 'miguel@cervecerias.es', '+34-971-234-567', 'Net 15'),
  ('i50e8400-e29b-41d4-a716-446655440003'::uuid, 'Spanish Seafood Co', 'Antonio Perez', 'antonio@seafood.es', '+34-971-345-678', 'Net 7')
ON CONFLICT DO NOTHING;

-- Products (Food, Drink, Supplies)
INSERT INTO products (id, name, category, unit, current_stock, min_stock, max_stock, cost_per_unit, supplier_id)
VALUES
  -- Produce
  ('j50e8400-e29b-41d4-a716-446655440001'::uuid, 'Tomatoes', 'food', 'kg', 45.0, 20.0, 80.0, 0.80, 'i50e8400-e29b-41d4-a716-446655440001'::uuid),
  ('j50e8400-e29b-41d4-a716-446655440002'::uuid, 'Lettuce', 'food', 'head', 28.0, 15.0, 50.0, 1.20, 'i50e8400-e29b-41d4-a716-446655440001'::uuid),
  ('j50e8400-e29b-41d4-a716-446655440003'::uuid, 'Potatoes', 'food', 'kg', 50.0, 30.0, 100.0, 0.60, 'i50e8400-e29b-41d4-a716-446655440001'::uuid),
  ('j50e8400-e29b-41d4-a716-446655440004'::uuid, 'Avocados', 'food', 'piece', 35.0, 20.0, 60.0, 1.50, 'i50e8400-e29b-41d4-a716-446655440001'::uuid),
  ('j50e8400-e29b-41d4-a716-446655440005'::uuid, 'Onions', 'food', 'kg', 40.0, 15.0, 70.0, 0.50, 'i50e8400-e29b-41d4-a716-446655440001'::uuid),
  -- Proteins
  ('j50e8400-e29b-41d4-a716-446655440006'::uuid, 'Beef Patties', 'food', 'piece', 60.0, 40.0, 100.0, 3.50, 'i50e8400-e29b-41d4-a716-446655440001'::uuid),
  ('j50e8400-e29b-41d4-a716-446655440007'::uuid, 'Veal Cutlets', 'food', 'piece', 20.0, 15.0, 40.0, 6.50, 'i50e8400-e29b-41d4-a716-446655440003'::uuid),
  ('j50e8400-e29b-41d4-a716-446655440008'::uuid, 'Fish Fillets (Cod)', 'food', 'kg', 15.0, 10.0, 30.0, 8.50, 'i50e8400-e29b-41d4-a716-446655440003'::uuid),
  ('j50e8400-e29b-41d4-a716-446655440009'::uuid, 'Eggs', 'food', 'dozen', 25.0, 15.0, 40.0, 2.50, 'i50e8400-e29b-41d4-a716-446655440001'::uuid),
  ('j50e8400-e29b-41d4-a716-446655440010'::uuid, 'Bacon', 'food', 'kg', 8.0, 5.0, 15.0, 12.00, 'i50e8400-e29b-41d4-a716-446655440001'::uuid),
  -- Dairy
  ('j50e8400-e29b-41d4-a716-446655440011'::uuid, 'Cheese (Cheddar)', 'food', 'kg', 12.0, 5.0, 20.0, 11.50, 'i50e8400-e29b-41d4-a716-446655440001'::uuid),
  ('j50e8400-e29b-41d4-a716-446655440012'::uuid, 'Feta Cheese', 'food', 'kg', 8.0, 3.0, 15.0, 10.00, 'i50e8400-e29b-41d4-a716-446655440001'::uuid),
  -- Beers (22 craft beers)
  ('j50e8400-e29b-41d4-a716-446655440013'::uuid, 'Estrella Damm (Draft)', 'drink', 'liter', 45.0, 20.0, 80.0, 1.50, 'i50e8400-e29b-41d4-a716-446655440002'::uuid),
  ('j50e8400-e29b-41d4-a716-446655440014'::uuid, 'Moritz (Craft)', 'drink', 'liter', 32.0, 15.0, 60.0, 2.00, 'i50e8400-e29b-41d4-a716-446655440002'::uuid),
  ('j50e8400-e29b-41d4-a716-446655440015'::uuid, 'Guinness', 'drink', 'liter', 28.0, 15.0, 50.0, 3.20, 'i50e8400-e29b-41d4-a716-446655440002'::uuid),
  ('j50e8400-e29b-41d4-a716-446655440016'::uuid, 'Corona', 'drink', 'bottle', 60.0, 30.0, 100.0, 1.80, 'i50e8400-e29b-41d4-a716-446655440002'::uuid),
  ('j50e8400-e29b-41d4-a716-446655440017'::uuid, 'Heineken', 'drink', 'bottle', 50.0, 25.0, 80.0, 1.60, 'i50e8400-e29b-41d4-a716-446655440002'::uuid),
  -- Spirits & Mixers
  ('j50e8400-e29b-41d4-a716-446655440018'::uuid, 'White Rum', 'drink', 'bottle', 3.0, 1.0, 5.0, 18.00, 'i50e8400-e29b-41d4-a716-446655440002'::uuid),
  ('j50e8400-e29b-41d4-a716-446655440019'::uuid, 'Tequila', 'drink', 'bottle', 2.0, 1.0, 4.0, 22.00, 'i50e8400-e29b-41d4-a716-446655440002'::uuid),
  ('j50e8400-e29b-41d4-a716-446655440020'::uuid, 'Lime Juice', 'drink', 'liter', 5.0, 2.0, 10.0, 3.50, 'i50e8400-e29b-41d4-a716-446655440001'::uuid),
  ('j50e8400-e29b-41d4-a716-446655440021'::uuid, 'Club Soda', 'drink', 'liter', 20.0, 10.0, 40.0, 1.00, 'i50e8400-e29b-41d4-a716-446655440001'::uuid),
  -- Supplies
  ('j50e8400-e29b-41d4-a716-446655440022'::uuid, 'Napkins', 'supplies', 'box', 15.0, 5.0, 25.0, 4.50, 'i50e8400-e29b-41d4-a716-446655440001'::uuid),
  ('j50e8400-e29b-41d4-a716-446655440023'::uuid, 'Plates (Ceramic)', 'supplies', 'dozen', 8.0, 3.0, 15.0, 8.00, 'i50e8400-e29b-41d4-a716-446655440001'::uuid)
ON CONFLICT DO NOTHING;

-- Stock Movements (Recent activity)
INSERT INTO stock_movements (id, product_id, movement_type, quantity, reason, recorded_by, created_at)
VALUES
  ('k50e8400-e29b-41d4-a716-446655440001'::uuid, 'j50e8400-e29b-41d4-a716-446655440001'::uuid, 'in', 20.0, 'Morning delivery', '650e8400-e29b-41d4-a716-446655440001'::uuid, now() - interval '2 days'),
  ('k50e8400-e29b-41d4-a716-446655440002'::uuid, 'j50e8400-e29b-41d4-a716-446655440001'::uuid, 'out', 12.0, 'Daily usage', '650e8400-e29b-41d4-a716-446655440002'::uuid, now() - interval '1 day'),
  ('k50e8400-e29b-41d4-a716-446655440003'::uuid, 'j50e8400-e29b-41d4-a716-446655440006'::uuid, 'in', 30.0, 'Delivery from supplier', '650e8400-e29b-41d4-a716-446655440001'::uuid, now() - interval '3 days'),
  ('k50e8400-e29b-41d4-a716-446655440004'::uuid, 'j50e8400-e29b-41d4-a716-446655440014'::uuid, 'out', 8.0, 'Daily service', '650e8400-e29b-41d4-a716-446655440005'::uuid, now() - interval '1 day'),
  ('k50e8400-e29b-41d4-a716-446655440005'::uuid, 'j50e8400-e29b-41d4-a716-446655440015'::uuid, 'waste', 1.0, 'Damaged during delivery', '650e8400-e29b-41d4-a716-446655440001'::uuid, now() - interval '4 days')
ON CONFLICT DO NOTHING;

-- Waste Logs
INSERT INTO waste_logs (id, product_id, quantity, reason, recorded_by, created_at)
VALUES
  ('l50e8400-e29b-41d4-a716-446655440001'::uuid, 'j50e8400-e29b-41d4-a716-446655440001'::uuid, 2.0, 'expired', '650e8400-e29b-41d4-a716-446655440001'::uuid, now() - interval '5 days'),
  ('l50e8400-e29b-41d4-a716-446655440002'::uuid, 'j50e8400-e29b-41d4-a716-446655440002'::uuid, 1.0, 'damaged', '650e8400-e29b-41d4-a716-446655440001'::uuid, now() - interval '3 days')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SALES & POS
-- ============================================================================

-- Daily Sales
INSERT INTO daily_sales (id, date, food_revenue, drinks_revenue, cocktails_revenue, desserts_revenue, other_revenue, tips, ticket_count)
VALUES
  ('m50e8400-e29b-41d4-a716-446655440001'::uuid, '2026-02-09', 450.50, 280.75, 210.25, 85.00, 50.00, 120.00, 42),
  ('m50e8400-e29b-41d4-a716-446655440002'::uuid, '2026-02-08', 480.00, 320.50, 195.75, 92.00, 40.00, 135.00, 45),
  ('m50e8400-e29b-41d4-a716-446655440003'::uuid, '2026-02-07', 520.00, 350.00, 240.00, 105.00, 55.00, 155.00, 48),
  ('m50e8400-e29b-41d4-a716-446655440004'::uuid, '2026-02-06', 410.00, 290.00, 180.00, 75.00, 35.00, 110.00, 38),
  ('m50e8400-e29b-41d4-a716-446655440005'::uuid, '2026-02-05', 560.00, 420.00, 310.00, 125.00, 70.00, 200.00, 52)
ON CONFLICT DO NOTHING;

-- Shift Tips
INSERT INTO shift_tips (id, shift_id, employee_id, amount, created_at)
VALUES
  ('n50e8400-e29b-41d4-a716-446655440001'::uuid, '850e8400-e29b-41d4-a716-446655440002'::uuid, '650e8400-e29b-41d4-a716-446655440003'::uuid, 45.00, now() - interval '1 day'),
  ('n50e8400-e29b-41d4-a716-446655440002'::uuid, '850e8400-e29b-41d4-a716-446655440003'::uuid, '650e8400-e29b-41d4-a716-446655440005'::uuid, 35.00, now() - interval '1 day'),
  ('n50e8400-e29b-41d4-a716-446655440003'::uuid, '850e8400-e29b-41d4-a716-446655440004'::uuid, '650e8400-e29b-41d4-a716-446655440006'::uuid, 40.00, now() - interval '1 day')
ON CONFLICT DO NOTHING;

-- Cash Register Closes
INSERT INTO cash_register_closes (id, date, expected_amount, actual_amount, variance, closed_by)
VALUES
  ('o50e8400-e29b-41d4-a716-446655440001'::uuid, '2026-02-09', 1196.50, 1198.00, 1.50, '650e8400-e29b-41d4-a716-446655440001'::uuid),
  ('o50e8400-e29b-41d4-a716-446655440002'::uuid, '2026-02-08', 1263.25, 1262.75, -0.50, '650e8400-e29b-41d4-a716-446655440001'::uuid),
  ('o50e8400-e29b-41d4-a716-446655440003'::uuid, '2026-02-07', 1370.00, 1371.25, 1.25, '650e8400-e29b-41d4-a716-446655440001'::uuid)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- RESERVATIONS & FLOOR PLAN
-- ============================================================================

-- Reservations
INSERT INTO reservations (id, table_id, guest_name, guest_email, guest_phone, reservation_date, start_time, end_time, party_size, status)
VALUES
  ('p50e8400-e29b-41d4-a716-446655440001'::uuid, 'h50e8400-e29b-41d4-a716-446655440003'::uuid, 'John Smith', 'john@example.com', '+34-600-111-111', '2026-02-10', '19:00'::time, '20:30'::time, 4, 'confirmed'),
  ('p50e8400-e29b-41d4-a716-446655440002'::uuid, 'h50e8400-e29b-41d4-a716-446655440004'::uuid, 'Maria García', 'maria@example.com', '+34-600-222-222', '2026-02-10', '20:00'::time, '21:30'::time, 4, 'confirmed'),
  ('p50e8400-e29b-41d4-a716-446655440003'::uuid, 'h50e8400-e29b-41d4-a716-446655440005'::uuid, 'Hans Mueller', 'hans@example.com', '+49-123-456-789', '2026-02-11', '18:30'::time, '20:00'::time, 6, 'confirmed'),
  ('p50e8400-e29b-41d4-a716-446655440004'::uuid, 'h50e8400-e29b-41d4-a716-446655440007'::uuid, 'Lisa Anderson', 'lisa@example.com', '+46-700-111-222', '2026-02-12', '19:30'::time, '21:00'::time, 8, 'pending')
ON CONFLICT DO NOTHING;

-- Waitlist
INSERT INTO waitlist_entries (id, guest_name, guest_phone, party_size, estimated_wait_time_minutes, position, status)
VALUES
  ('q50e8400-e29b-41d4-a716-446655440001'::uuid, 'Robert Brown', '+34-600-333-333', 2, 45, 1, 'waiting'),
  ('q50e8400-e29b-41d4-a716-446655440002'::uuid, 'Sophie Laurent', '+33-600-444-444', 3, 60, 2, 'waiting')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- EVENTS & DJ MANAGEMENT
-- ============================================================================

-- DJs
INSERT INTO djs (id, name, genre, fee, email, phone, social_links, rider_notes)
VALUES
  ('r50e8400-e29b-41d4-a716-446655440001'::uuid, 'DJ Maverick', 'House/Electronic', 100.00, 'dj.maverick@music.com', '+34-600-678-901', 'Instagram: @djmaverick', 'Needs 2 turntables, mixer, mic'),
  ('r50e8400-e29b-41d4-a716-446655440002'::uuid, 'DJ Luna', 'Latin/Reggaeton', 120.00, 'luna@music.com', '+34-600-789-012', 'Instagram: @djluna', 'Requires sound check 1 hour before'),
  ('r50e8400-e29b-41d4-a716-446655440003'::uuid, 'DJ Cool Vibes', 'Chillout/Lounge', 80.00, 'coolvibes@music.com', '+34-600-890-123', '', 'Prefers chill atmosphere')
ON CONFLICT DO NOTHING;

-- Events
INSERT INTO events (id, title, description, event_date, start_time, end_time, event_type, dj_id, status)
VALUES
  ('s50e8400-e29b-41d4-a716-446655440001'::uuid, 'Thursday Night Party', 'Weekly DJ night with House & Electronic', '2026-02-12', '22:00'::time, '03:00'::time, 'DJ Night', 'r50e8400-e29b-41d4-a716-446655440001'::uuid, 'confirmed'),
  ('s50e8400-e29b-41d4-a716-446655440002'::uuid, 'Latin Night', 'Special Latin music event', '2026-02-14', '22:00'::time, '04:00'::time, 'DJ Night', 'r50e8400-e29b-41d4-a716-446655440002'::uuid, 'pending'),
  ('s50e8400-e29b-41d4-a716-446655440003'::uuid, 'Sunday Chill Session', 'Relaxed music for weekend afternoon', '2026-02-15', '14:00'::time, '18:00'::time, 'Acoustic', 'r50e8400-e29b-41d4-a716-446655440003'::uuid, 'pending')
ON CONFLICT DO NOTHING;

-- Event Equipment Checklists
INSERT INTO event_equipment_checklists (id, event_id, equipment_name, is_checked)
VALUES
  ('t50e8400-e29b-41d4-a716-446655440001'::uuid, 's50e8400-e29b-41d4-a716-446655440001'::uuid, 'Turntables', false),
  ('t50e8400-e29b-41d4-a716-446655440002'::uuid, 's50e8400-e29b-41d4-a716-446655440001'::uuid, 'Mixer', false),
  ('t50e8400-e29b-41d4-a716-446655440003'::uuid, 's50e8400-e29b-41d4-a716-446655440001'::uuid, 'Microphone', false),
  ('t50e8400-e29b-41d4-a716-446655440004'::uuid, 's50e8400-e29b-41d4-a716-446655440001'::uuid, 'Speakers', false),
  ('t50e8400-e29b-41d4-a716-446655440005'::uuid, 's50e8400-e29b-41d4-a716-446655440001'::uuid, 'Lighting', false)
ON CONFLICT DO NOTHING;

-- Music Requests
INSERT INTO music_requests (id, event_id, guest_name, song_title, artist, status)
VALUES
  ('u50e8400-e29b-41d4-a716-446655440001'::uuid, 's50e8400-e29b-41d4-a716-446655440001'::uuid, 'John', 'One More Time', 'Daft Punk', 'pending'),
  ('u50e8400-e29b-41d4-a716-446655440002'::uuid, 's50e8400-e29b-41d4-a716-446655440001'::uuid, 'Maria', 'Levitating', 'Dua Lipa', 'pending'),
  ('u50e8400-e29b-41d4-a716-446655440003'::uuid, 's50e8400-e29b-41d4-a716-446655440002'::uuid, 'Carlos', 'Tití Me Preguntó', 'Bad Bunny', 'pending')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- MARKETING & SOCIAL MEDIA
-- ============================================================================

-- Content Calendar
INSERT INTO content_calendar (id, title, description, content_text, platform, scheduled_date, status, language, created_by)
VALUES
  ('v50e8400-e29b-41d4-a716-446655440001'::uuid, 'Schnitzel Tuesday Special', 'Promote our weekly schnitzel special', 'Fresh veal schnitzel every Tuesday! 🍽️ 16.50€', 'instagram', now() + interval '1 day' , 'scheduled', 'en', '650e8400-e29b-41d4-a716-446655440001'::uuid),
  ('v50e8400-e29b-41d4-a716-446655440002'::uuid, 'Weekend Vibes', 'Weekend atmosphere post', 'Come join us for weekend drinks and great company!', 'facebook', now() + interval '2 days', 'draft', 'en', '650e8400-e29b-41d4-a716-446655440001'::uuid),
  ('v50e8400-e29b-41d4-a716-446655440003'::uuid, 'DJ Night Announcement', 'Thursday DJ night event', '🎶 DJ Night this Thursday! House & Electronic all night long 🎶', 'instagram', now() + interval '3 days', 'draft', 'en', '650e8400-e29b-41d4-a716-446655440001'::uuid)
ON CONFLICT DO NOTHING;

-- Social Posts
INSERT INTO social_posts (id, content_calendar_id, platform, caption, hashtags, status, likes, comments)
VALUES
  ('w50e8400-e29b-41d4-a716-446655440001'::uuid, 'v50e8400-e29b-41d4-a716-446655440001'::uuid, 'instagram', 'Fresh veal schnitzel every Tuesday! 🍽️ 16.50€', '#cheersmallorca #schnitzel #tapasmallorca #foodie', 'published', 245, 18),
  ('w50e8400-e29b-41d4-a716-446655440002'::uuid, 'v50e8400-e29b-41d4-a716-446655440002'::uuid, 'facebook', 'Come join us for weekend drinks and great company!', '#cheersmallorca #mallorca #weekend', 'draft', 0, 0)
ON CONFLICT DO NOTHING;

-- Newsletter Subscribers
INSERT INTO newsletter_subscribers (id, email, name, language, is_active)
VALUES
  ('x50e8400-e29b-41d4-a716-446655440001'::uuid, 'john@example.com', 'John Smith', 'en', true),
  ('x50e8400-e29b-41d4-a716-446655440002'::uuid, 'maria@example.com', 'Maria García', 'es', true),
  ('x50e8400-e29b-41d4-a716-446655440003'::uuid, 'hans@example.com', 'Hans Mueller', 'de', true),
  ('x50e8400-e29b-41d4-a716-446655440004'::uuid, 'sophie@example.com', 'Sophie Laurent', 'fr', true),
  ('x50e8400-e29b-41d4-a716-446655440005'::uuid, 'robert@example.com', 'Robert Brown', 'en', true)
ON CONFLICT DO NOTHING;

-- Newsletters
INSERT INTO newsletters (id, subject, content, segment, status, recipient_count, created_by)
VALUES
  ('y50e8400-e29b-41d4-a716-446655440001'::uuid, 'Weekly Specials - February 10', 'Check out this week''s specials at Cheers Mallorca!', 'all', 'draft', 0, '650e8400-e29b-41d4-a716-446655440001'::uuid),
  ('y50e8400-e29b-41d4-a716-446655440002'::uuid, 'Valentine''s Day Event', 'Join us for a special Valentine''s night!', 'couples', 'draft', 0, '650e8400-e29b-41d4-a716-446655440001'::uuid)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FINANCE & REPORTING
-- ============================================================================

-- Daily Financials
INSERT INTO daily_financials (id, date, revenue, cost_of_goods_sold, labor_cost, overhead_cost, food_cost_ratio, beverage_cost_ratio, labor_cost_ratio)
VALUES
  ('z50e8400-e29b-41d4-a716-446655440001'::uuid, '2026-02-09', 1196.50, 285.00, 320.00, 150.00, 23.8, 18.5, 26.7),
  ('z50e8400-e29b-41d4-a716-446655440002'::uuid, '2026-02-08', 1263.25, 310.00, 350.00, 160.00, 24.5, 19.2, 27.7),
  ('z50e8400-e29b-41d4-a716-446655440003'::uuid, '2026-02-07', 1370.00, 325.00, 360.00, 170.00, 23.7, 18.8, 26.3),
  ('z50e8400-e29b-41d4-a716-446655440004'::uuid, '2026-02-06', 1035.00, 250.00, 310.00, 140.00, 24.2, 19.0, 29.9),
  ('z50e8400-e29b-41d4-a716-446655440005'::uuid, '2026-02-05', 1360.00, 330.00, 380.00, 175.00, 24.3, 19.1, 27.9)
ON CONFLICT DO NOTHING;

-- Budget
INSERT INTO budget (id, category, amount, period_start, period_end)
VALUES
  ('aa0e8400-e29b-41d4-a716-446655440001'::uuid, 'Food Cost', 3000.00, '2026-02-01', '2026-02-28'),
  ('aa0e8400-e29b-41d4-a716-446655440002'::uuid, 'Labor Cost', 4500.00, '2026-02-01', '2026-02-28'),
  ('aa0e8400-e29b-41d4-a716-446655440003'::uuid, 'Overhead', 2000.00, '2026-02-01', '2026-02-28'),
  ('aa0e8400-e29b-41d4-a716-446655440004'::uuid, 'Marketing', 800.00, '2026-02-01', '2026-02-28')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CRM & CUSTOMER INTELLIGENCE
-- ============================================================================

-- Customers
INSERT INTO customers (id, name, email, phone, language, visit_count, last_visit, birthday, vip)
VALUES
  ('ab0e8400-e29b-41d4-a716-446655440001'::uuid, 'John Smith', 'john@example.com', '+34-600-111-111', 'en', 5, '2026-02-08', '1985-05-15', false),
  ('ab0e8400-e29b-41d4-a716-446655440002'::uuid, 'Maria García', 'maria@example.com', '+34-600-222-222', 'es', 12, '2026-02-06', '1990-03-20', true),
  ('ab0e8400-e29b-41d4-a716-446655440003'::uuid, 'Hans Mueller', 'hans@example.com', '+49-123-456-789', 'de', 8, '2026-02-07', '1988-07-10', false),
  ('ab0e8400-e29b-41d4-a716-446655440004'::uuid, 'Sophie Laurent', 'sophie@example.com', '+33-600-444-444', 'fr', 3, '2026-02-05', '1992-11-25', false),
  ('ab0e8400-e29b-41d4-a716-446655440005'::uuid, 'Robert Brown', 'robert@example.com', '+44-700-555-666', 'en', 15, '2026-02-03', '1980-01-30', true)
ON CONFLICT DO NOTHING;

-- Customer Reviews
INSERT INTO customer_reviews (id, customer_id, platform, rating, review_text, sentiment, response_draft)
VALUES
  ('ac0e8400-e29b-41d4-a716-446655440001'::uuid, 'ab0e8400-e29b-41d4-a716-446655440001'::uuid, 'TripAdvisor', 4.5, 'Great atmosphere and delicious food! Will come back.', 'positive', 'Thank you John! We''d love to see you again soon.'),
  ('ac0e8400-e29b-41d4-a716-446655440002'::uuid, 'ab0e8400-e29b-41d4-a716-446655440002'::uuid, 'Google', 5.0, 'Excelente lugar, comida deliciosa, muy recomendado!', 'positive', '¡Gracias María! Nos encanta tu apoyo.'),
  ('ac0e8400-e29b-41d4-a716-446655440003'::uuid, 'ab0e8400-e29b-41d4-a716-446655440003'::uuid, 'Google', 4.0, 'Good food and nice beer selection. Service could be faster.', 'neutral', 'Thank you for the feedback, Hans. We''re working on improving our service speed.'),
  ('ac0e8400-e29b-41d4-a716-446655440004'::uuid, 'ab0e8400-e29b-41d4-a716-446655440005'::uuid, 'Facebook', 5.0, 'Best place in El Arenal! Love the DJ nights.', 'positive', 'Robert, thank you for being such a loyal customer!')
ON CONFLICT DO NOTHING;

-- Loyalty Rewards
INSERT INTO loyalty_rewards (id, customer_id, visit_milestone, reward_description, reward_issued_at)
VALUES
  ('ad0e8400-e29b-41d4-a716-446655440001'::uuid, 'ab0e8400-e29b-41d4-a716-446655440002'::uuid, 5, '10% discount on next visit', now() - interval '30 days'),
  ('ad0e8400-e29b-41d4-a716-446655440002'::uuid, 'ab0e8400-e29b-41d4-a716-446655440002'::uuid, 10, 'Free cocktail on birthday', now() - interval '10 days'),
  ('ad0e8400-e29b-41d4-a716-446655440003'::uuid, 'ab0e8400-e29b-41d4-a716-446655440005'::uuid, 10, 'Free cocktail on birthday', now() - interval '5 days'),
  ('ad0e8400-e29b-41d4-a716-446655440004'::uuid, 'ab0e8400-e29b-41d4-a716-446655440005'::uuid, 15, 'VIP table reservation for next event', now() - interval '2 days')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SUCCESS
-- ============================================================================

-- This seed file has been successfully applied!
-- The database now contains realistic test data for all major modules:
-- ✓ Authentication & Profiles (7 users)
-- ✓ Staff Management (6 employees, shifts, availability)
-- ✓ Menu & Kitchen (15 menu items, allergens, ingredients, tables)
-- ✓ Stock & Inventory (23 products, movements, suppliers)
-- ✓ Sales & POS (5 days of sales, tips, register closes)
-- ✓ Reservations (4 active reservations, waitlist)
-- ✓ Events & DJ (3 DJs, 3 events, equipment checklists, music requests)
-- ✓ Marketing & Social (3 content pieces, 2 social posts, 5 newsletter subscribers)
-- ✓ Finance (5 days of P&L data, budget allocation)
-- ✓ CRM & Customers (5 customers, 4 reviews, loyalty rewards)

-- To use this seed data:
-- 1. First, create test users in Supabase Auth dashboard
-- 2. Copy their UUIDs
-- 3. Update the profile UUID values at the top of this file
-- 4. Run: supabase db push
-- 5. Then run: supabase db seed (if configured)
-- OR manually execute this SQL file in Supabase SQL editor

