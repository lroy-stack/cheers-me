-- ============================================================================
-- 023: Kiosk Clock System
-- Adds PIN-based clock-in/out for tablet kiosk and break tracking
-- ============================================================================

-- New columns on employees for kiosk PIN
ALTER TABLE employees ADD COLUMN kiosk_pin VARCHAR(4);
ALTER TABLE employees ADD COLUMN kiosk_pin_failed_attempts INTEGER DEFAULT 0;
ALTER TABLE employees ADD COLUMN kiosk_pin_locked_until TIMESTAMPTZ;

-- Unique PIN per active employee (partial unique index)
CREATE UNIQUE INDEX idx_employees_kiosk_pin
  ON employees(kiosk_pin)
  WHERE kiosk_pin IS NOT NULL AND employment_status = 'active';

-- ============================================================================
-- Break tracking table
-- ============================================================================

CREATE TABLE clock_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clock_record_id UUID NOT NULL REFERENCES clock_in_out(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clock_breaks_record ON clock_breaks(clock_record_id);
CREATE INDEX idx_clock_breaks_active ON clock_breaks(clock_record_id) WHERE end_time IS NULL;

-- ============================================================================
-- RLS policies for clock_breaks
-- ============================================================================

ALTER TABLE clock_breaks ENABLE ROW LEVEL SECURITY;

-- Employees can see their own breaks; managers/admins/owners can see all
CREATE POLICY "clock_breaks_select" ON clock_breaks FOR SELECT TO authenticated
  USING (
    clock_record_id IN (
      SELECT id FROM clock_in_out
      WHERE employee_id = (SELECT id FROM employees WHERE profile_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','owner'))
  );

-- Employees can insert breaks for their own clock records
CREATE POLICY "clock_breaks_insert" ON clock_breaks FOR INSERT TO authenticated
  WITH CHECK (
    clock_record_id IN (
      SELECT id FROM clock_in_out
      WHERE employee_id = (SELECT id FROM employees WHERE profile_id = auth.uid())
    )
  );

-- Employees can update their own breaks; managers/admins/owners can update all
CREATE POLICY "clock_breaks_update" ON clock_breaks FOR UPDATE TO authenticated
  USING (
    clock_record_id IN (
      SELECT id FROM clock_in_out
      WHERE employee_id = (SELECT id FROM employees WHERE profile_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','owner'))
  );

-- ============================================================================
-- Realtime
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE clock_breaks;
