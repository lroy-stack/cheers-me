-- ============================================================================
-- Migration 044: Fix table status logic
-- Problems fixed:
--   1. Trigger never returns tables to 'available' (stuck on 'cleaning')
--   2. 'reserved' status never auto-assigned when reservation created/confirmed
--   3. Trigger only fires ON UPDATE, not ON INSERT
-- ============================================================================

-- ============================================================================
-- STEP 1: Replace the broken trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION update_table_status_from_reservation()
RETURNS TRIGGER AS $$
DECLARE
  new_status TEXT;
  res_status reservation_status;
BEGIN
  -- Determine which reservation_status to evaluate
  IF TG_OP = 'INSERT' THEN
    res_status := NEW.reservation_status;
  ELSE
    res_status := NEW.reservation_status;
  END IF;

  -- Skip if no table assigned
  IF NEW.table_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine new table status based on reservation lifecycle
  CASE res_status
    WHEN 'pending', 'confirmed' THEN
      new_status := 'reserved';
    WHEN 'seated' THEN
      new_status := 'occupied';
    WHEN 'completed', 'cancelled', 'no_show' THEN
      -- Only free the table if no other active reservations exist for it
      IF NOT EXISTS (
        SELECT 1 FROM reservations
        WHERE table_id = NEW.table_id
          AND id != NEW.id
          AND reservation_status IN ('pending', 'confirmed', 'seated')
      ) THEN
        new_status := 'available';
      ELSE
        -- Another active reservation exists, don't change status
        new_status := NULL;
      END IF;
    ELSE
      new_status := NULL;
  END CASE;

  -- Apply the status change
  IF new_status IS NOT NULL THEN
    UPDATE tables SET status = new_status WHERE id = NEW.table_id;
  END IF;

  -- If UPDATE and table_id changed, free the old table
  IF TG_OP = 'UPDATE' AND OLD.table_id IS NOT NULL AND OLD.table_id != NEW.table_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM reservations
      WHERE table_id = OLD.table_id
        AND id != NEW.id
        AND reservation_status IN ('pending', 'confirmed', 'seated')
    ) THEN
      UPDATE tables SET status = 'available' WHERE id = OLD.table_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 2: Drop old trigger and create new ones (INSERT + UPDATE)
-- ============================================================================

DROP TRIGGER IF EXISTS reservation_update_table_status ON reservations;

CREATE TRIGGER reservation_update_table_status
AFTER UPDATE ON reservations
FOR EACH ROW
EXECUTE FUNCTION update_table_status_from_reservation();

CREATE TRIGGER reservation_insert_table_status
AFTER INSERT ON reservations
FOR EACH ROW
EXECUTE FUNCTION update_table_status_from_reservation();

-- ============================================================================
-- STEP 3: Clean up stuck tables — set 'cleaning' back to 'available'
-- ============================================================================

UPDATE tables
SET status = 'available'
WHERE status = 'cleaning'
  AND id NOT IN (
    SELECT DISTINCT table_id FROM reservations
    WHERE table_id IS NOT NULL
      AND reservation_status IN ('pending', 'confirmed', 'seated')
  );

-- ============================================================================
-- STEP 4: Sync existing reservations — mark tables as 'reserved' for active ones
-- ============================================================================

UPDATE tables t
SET status = 'reserved'
FROM reservations r
WHERE r.table_id = t.id
  AND r.reservation_status IN ('pending', 'confirmed')
  AND r.reservation_date >= CURRENT_DATE
  AND t.status = 'available';

UPDATE tables t
SET status = 'occupied'
FROM reservations r
WHERE r.table_id = t.id
  AND r.reservation_status = 'seated'
  AND t.status != 'occupied';

-- ============================================================================
-- STEP 5: Ensure all floor sections are active (fix Lounge/VIP visibility)
-- ============================================================================

UPDATE floor_sections SET is_active = true WHERE is_active = false OR is_active IS NULL;
