-- ============================================================================
-- Migration 021: Realistic floor plan for GrandCafe Cheers Mallorca
-- 5 sections, 32 tables (~136 pax capacity)
-- Based on real venue layout: beach bar + sports bar + dining + lounge
-- ============================================================================

-- ============================================================================
-- STEP 1: Update existing sections and add Dining Room
-- ============================================================================

-- Update "Indoor" to "Main Hall" (sports bar with 15 screens)
UPDATE floor_sections
SET name = 'Main Hall',
    description = 'Main sports bar area with 15 screens, pool table, and central bar',
    sort_order = 2
WHERE name = 'Indoor';

-- Update Terrace description
UPDATE floor_sections
SET description = 'Boulevard outdoor seating with beach views, Carrer de Cartago'
WHERE name = 'Terrace';

-- Update Bar description
UPDATE floor_sections
SET description = 'High tables and bar stools along the main counter, quick service'
WHERE name = 'Bar';

-- Update VIP to Lounge / VIP
UPDATE floor_sections
SET name = 'Lounge / VIP',
    description = 'DJ area, lounge sofas, VIP booths for events and nightlife',
    sort_order = 5
WHERE name = 'VIP';

-- Add Dining Room section
INSERT INTO floor_sections (name, description, sort_order, is_active)
VALUES ('Dining Room', 'Quiet side room for sit-down dining and celebrations', 3, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- STEP 2: Remove old seed/test tables
-- ============================================================================

-- Delete old seed tables (T1-T7) that were placeholders
DELETE FROM tables
WHERE table_number IN ('T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7');

-- ============================================================================
-- STEP 3: Insert 32 realistic tables
-- ============================================================================

-- Use a DO block so we can reference section IDs by name
DO $$
DECLARE
  sec_terrace  UUID;
  sec_main     UUID;
  sec_dining   UUID;
  sec_bar      UUID;
  sec_lounge   UUID;
BEGIN
  SELECT id INTO sec_terrace FROM floor_sections WHERE name = 'Terrace';
  SELECT id INTO sec_main    FROM floor_sections WHERE name = 'Main Hall';
  SELECT id INTO sec_dining  FROM floor_sections WHERE name = 'Dining Room';
  SELECT id INTO sec_bar     FROM floor_sections WHERE name = 'Bar';
  SELECT id INTO sec_lounge  FROM floor_sections WHERE name = 'Lounge / VIP';

  -- ========================================================================
  -- TERRACE (10 tables) — Boulevard, beach-facing outdoor seating
  -- ========================================================================

  -- T01-T04: 2 pax, small round tables for couples
  INSERT INTO tables (table_number, capacity, section_id, shape, x_position, y_position, width, height, is_active, status, section)
  VALUES
    ('T01', 2, sec_terrace, 'round', 50, 50, NULL, NULL, true, 'available', 'Terrace'),
    ('T02', 2, sec_terrace, 'round', 150, 50, NULL, NULL, true, 'available', 'Terrace'),
    ('T03', 2, sec_terrace, 'round', 250, 50, NULL, NULL, true, 'available', 'Terrace'),
    ('T04', 2, sec_terrace, 'round', 350, 50, NULL, NULL, true, 'available', 'Terrace')
  ON CONFLICT (table_number) DO NOTHING;

  -- T05-T08: 4 pax, square tables for small groups
  INSERT INTO tables (table_number, capacity, section_id, shape, x_position, y_position, width, height, is_active, status, section)
  VALUES
    ('T05', 4, sec_terrace, 'square', 50, 150, NULL, NULL, true, 'available', 'Terrace'),
    ('T06', 4, sec_terrace, 'square', 150, 150, NULL, NULL, true, 'available', 'Terrace'),
    ('T07', 4, sec_terrace, 'square', 250, 150, NULL, NULL, true, 'available', 'Terrace'),
    ('T08', 4, sec_terrace, 'square', 350, 150, NULL, NULL, true, 'available', 'Terrace')
  ON CONFLICT (table_number) DO NOTHING;

  -- T09-T10: 6 pax, rectangular tables for groups
  INSERT INTO tables (table_number, capacity, section_id, shape, x_position, y_position, width, height, is_active, status, section)
  VALUES
    ('T09', 6, sec_terrace, 'rectangle', 100, 250, 120, 60, true, 'available', 'Terrace'),
    ('T10', 6, sec_terrace, 'rectangle', 280, 250, 120, 60, true, 'available', 'Terrace')
  ON CONFLICT (table_number) DO NOTHING;

  -- ========================================================================
  -- MAIN HALL (8 tables) — Sports bar, 15 screens, pool table area
  -- ========================================================================

  -- M01-M02: 2 pax, near screens
  INSERT INTO tables (table_number, capacity, section_id, shape, x_position, y_position, width, height, is_active, status, section)
  VALUES
    ('M01', 2, sec_main, 'round', 500, 50, NULL, NULL, true, 'available', 'Main Hall'),
    ('M02', 2, sec_main, 'round', 600, 50, NULL, NULL, true, 'available', 'Main Hall')
  ON CONFLICT (table_number) DO NOTHING;

  -- M03-M05: 4 pax, center of hall
  INSERT INTO tables (table_number, capacity, section_id, shape, x_position, y_position, width, height, is_active, status, section)
  VALUES
    ('M03', 4, sec_main, 'square', 500, 150, NULL, NULL, true, 'available', 'Main Hall'),
    ('M04', 4, sec_main, 'square', 600, 150, NULL, NULL, true, 'available', 'Main Hall'),
    ('M05', 4, sec_main, 'square', 700, 150, NULL, NULL, true, 'available', 'Main Hall')
  ON CONFLICT (table_number) DO NOTHING;

  -- M06-M07: 6 pax, side walls
  INSERT INTO tables (table_number, capacity, section_id, shape, x_position, y_position, width, height, is_active, status, section)
  VALUES
    ('M06', 6, sec_main, 'rectangle', 500, 260, 120, 60, true, 'available', 'Main Hall'),
    ('M07', 6, sec_main, 'rectangle', 680, 260, 120, 60, true, 'available', 'Main Hall')
  ON CONFLICT (table_number) DO NOTHING;

  -- M08: 8 pax, large table for sports events
  INSERT INTO tables (table_number, capacity, section_id, shape, x_position, y_position, width, height, is_active, status, section)
  VALUES
    ('M08', 8, sec_main, 'rectangle', 580, 370, 160, 80, true, 'available', 'Main Hall')
  ON CONFLICT (table_number) DO NOTHING;

  -- ========================================================================
  -- DINING ROOM (6 tables) — Quiet side room for sit-down meals
  -- ========================================================================

  -- D01-D02: 2 pax, intimate
  INSERT INTO tables (table_number, capacity, section_id, shape, x_position, y_position, width, height, is_active, status, section)
  VALUES
    ('D01', 2, sec_dining, 'round', 50, 400, NULL, NULL, true, 'available', 'Dining Room'),
    ('D02', 2, sec_dining, 'round', 150, 400, NULL, NULL, true, 'available', 'Dining Room')
  ON CONFLICT (table_number) DO NOTHING;

  -- D03-D04: 4 pax, standard dining
  INSERT INTO tables (table_number, capacity, section_id, shape, x_position, y_position, width, height, is_active, status, section)
  VALUES
    ('D03', 4, sec_dining, 'square', 50, 500, NULL, NULL, true, 'available', 'Dining Room'),
    ('D04', 4, sec_dining, 'square', 150, 500, NULL, NULL, true, 'available', 'Dining Room')
  ON CONFLICT (table_number) DO NOTHING;

  -- D05: 6 pax, family table
  INSERT INTO tables (table_number, capacity, section_id, shape, x_position, y_position, width, height, is_active, status, section)
  VALUES
    ('D05', 6, sec_dining, 'rectangle', 50, 600, 120, 60, true, 'available', 'Dining Room')
  ON CONFLICT (table_number) DO NOTHING;

  -- D06: 8 pax, celebrations
  INSERT INTO tables (table_number, capacity, section_id, shape, x_position, y_position, width, height, is_active, status, section)
  VALUES
    ('D06', 8, sec_dining, 'rectangle', 200, 600, 160, 80, true, 'available', 'Dining Room')
  ON CONFLICT (table_number) DO NOTHING;

  -- ========================================================================
  -- BAR (4 high tables) — Bar counter area, quick service
  -- ========================================================================

  -- B01-B02: 2 pax, high bar stools
  INSERT INTO tables (table_number, capacity, section_id, shape, x_position, y_position, width, height, is_active, status, section)
  VALUES
    ('B01', 2, sec_bar, 'round', 500, 450, NULL, NULL, true, 'available', 'Bar'),
    ('B02', 2, sec_bar, 'round', 600, 450, NULL, NULL, true, 'available', 'Bar')
  ON CONFLICT (table_number) DO NOTHING;

  -- B03-B04: 4 pax, shared high tables
  INSERT INTO tables (table_number, capacity, section_id, shape, x_position, y_position, width, height, is_active, status, section)
  VALUES
    ('B03', 4, sec_bar, 'square', 500, 550, NULL, NULL, true, 'available', 'Bar'),
    ('B04', 4, sec_bar, 'square', 600, 550, NULL, NULL, true, 'available', 'Bar')
  ON CONFLICT (table_number) DO NOTHING;

  -- ========================================================================
  -- LOUNGE / VIP (4 tables) — DJ area, sofas, VIP booths
  -- ========================================================================

  -- L01-L02: 4 pax, lounge sofas
  INSERT INTO tables (table_number, capacity, section_id, shape, x_position, y_position, width, height, is_active, status, section)
  VALUES
    ('L01', 4, sec_lounge, 'round', 500, 680, NULL, NULL, true, 'available', 'Lounge / VIP'),
    ('L02', 4, sec_lounge, 'round', 620, 680, NULL, NULL, true, 'available', 'Lounge / VIP')
  ON CONFLICT (table_number) DO NOTHING;

  -- L03: 6 pax, VIP booth
  INSERT INTO tables (table_number, capacity, section_id, shape, x_position, y_position, width, height, is_active, status, section)
  VALUES
    ('L03', 6, sec_lounge, 'rectangle', 500, 780, 120, 60, true, 'available', 'Lounge / VIP')
  ON CONFLICT (table_number) DO NOTHING;

  -- L04: 10 pax, large VIP table for private events
  INSERT INTO tables (table_number, capacity, section_id, shape, x_position, y_position, width, height, is_active, status, section)
  VALUES
    ('L04', 10, sec_lounge, 'rectangle', 660, 780, 180, 90, true, 'available', 'Lounge / VIP')
  ON CONFLICT (table_number) DO NOTHING;

END $$;
