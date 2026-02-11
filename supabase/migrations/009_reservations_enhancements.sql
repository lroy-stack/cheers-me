-- ============================================================================
-- GrandCafe Cheers — Reservations & Tables Module Enhancements
-- Phase 2: Operations
-- Module: M6 - Reservations & Tables
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Reservation status enum (more granular than generic 'status')
CREATE TYPE reservation_status AS ENUM (
  'pending',      -- Initial state, awaiting confirmation
  'confirmed',    -- Confirmed by guest
  'seated',       -- Guest has arrived and been seated
  'completed',    -- Reservation finished, table freed
  'cancelled',    -- Cancelled by guest or staff
  'no_show'       -- Guest didn't show up
);

-- Waitlist status
CREATE TYPE waitlist_status AS ENUM (
  'waiting',      -- Currently on waitlist
  'notified',     -- Notified that table is ready
  'seated',       -- Guest has been seated
  'cancelled',    -- Guest cancelled or left
  'expired'       -- Wait time exceeded, removed from list
);

-- Table shape for floor plan editor
CREATE TYPE table_shape AS ENUM (
  'round',
  'square',
  'rectangle'
);

-- Reservation source (tracking where bookings come from)
CREATE TYPE reservation_source AS ENUM (
  'walk_in',
  'phone',
  'website',
  'instagram',
  'email',
  'staff_created'
);

-- ============================================================================
-- RESERVATION TIME SLOT CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS reservation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_duration_minutes INTEGER NOT NULL DEFAULT 60,  -- 15, 30, or 60 minutes
  max_advance_booking_days INTEGER NOT NULL DEFAULT 30,
  min_advance_booking_hours INTEGER NOT NULL DEFAULT 2,
  auto_release_no_show_minutes INTEGER NOT NULL DEFAULT 15, -- Release table after 15min no-show
  require_confirmation BOOLEAN DEFAULT true,
  allow_online_booking BOOLEAN DEFAULT true,
  max_party_size INTEGER NOT NULL DEFAULT 12,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Default reservation settings (single row table)
INSERT INTO reservation_settings (
  slot_duration_minutes,
  max_advance_booking_days,
  min_advance_booking_hours,
  auto_release_no_show_minutes,
  require_confirmation,
  allow_online_booking,
  max_party_size
) VALUES (60, 30, 2, 15, true, true, 12)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- TIME SLOT AVAILABILITY RULES
-- ============================================================================

-- Define operating hours and available time slots per day
CREATE TABLE IF NOT EXISTS reservation_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  max_covers INTEGER, -- Maximum total people that can be seated in this slot
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(day_of_week, start_time)
);

-- Default time slots (high season hours: 10:30 - 03:00)
INSERT INTO reservation_time_slots (day_of_week, start_time, end_time, max_covers) VALUES
  -- Sunday
  (0, '10:30', '15:00', 80),
  (0, '15:00', '20:00', 100),
  (0, '20:00', '03:00', 120),
  -- Monday
  (1, '10:30', '15:00', 80),
  (1, '15:00', '20:00', 100),
  (1, '20:00', '03:00', 120),
  -- Tuesday
  (2, '10:30', '15:00', 80),
  (2, '15:00', '20:00', 100),
  (2, '20:00', '03:00', 120),
  -- Wednesday
  (3, '10:30', '15:00', 80),
  (3, '15:00', '20:00', 100),
  (3, '20:00', '03:00', 120),
  -- Thursday
  (4, '10:30', '15:00', 80),
  (4, '15:00', '20:00', 100),
  (4, '20:00', '03:00', 120),
  -- Friday
  (5, '10:30', '15:00', 80),
  (5, '15:00', '20:00', 100),
  (5, '20:00', '03:00', 120),
  -- Saturday
  (6, '10:30', '15:00', 80),
  (6, '15:00', '20:00', 100),
  (6, '20:00', '03:00', 120)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- ENHANCED TABLES TABLE
-- ============================================================================

-- Add new columns to existing tables table
ALTER TABLE tables
  ADD COLUMN IF NOT EXISTS shape table_shape DEFAULT 'round',
  ADD COLUMN IF NOT EXISTS width DECIMAL(10, 2),  -- For rectangle tables (in pixels or cm)
  ADD COLUMN IF NOT EXISTS height DECIMAL(10, 2), -- For rectangle tables
  ADD COLUMN IF NOT EXISTS rotation DECIMAL(5, 2) DEFAULT 0, -- Rotation in degrees
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add index for active tables
CREATE INDEX IF NOT EXISTS idx_tables_is_active ON tables(is_active);
CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(status);

-- ============================================================================
-- ENHANCED RESERVATIONS TABLE
-- ============================================================================

-- Add new columns to existing reservations table
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS reservation_status reservation_status DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS source reservation_source DEFAULT 'staff_created',
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER DEFAULT 90,
  ADD COLUMN IF NOT EXISTS actual_arrival_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_departure_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES profiles ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Update existing status column (keep for backwards compatibility, but prefer reservation_status)
COMMENT ON COLUMN reservations.status IS 'Deprecated - use reservation_status instead';

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(reservation_status);
CREATE INDEX IF NOT EXISTS idx_reservations_source ON reservations(source);
CREATE INDEX IF NOT EXISTS idx_reservations_customer_id ON reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date_time ON reservations(reservation_date, start_time);

-- ============================================================================
-- ENHANCED WAITLIST TABLE
-- ============================================================================

-- Add new columns to existing waitlist_entries table
ALTER TABLE waitlist_entries
  ADD COLUMN IF NOT EXISTS waitlist_status waitlist_status DEFAULT 'waiting',
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS table_id UUID REFERENCES tables ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quote_time_minutes INTEGER, -- Quoted wait time given to guest
  ADD COLUMN IF NOT EXISTS actual_wait_minutes INTEGER, -- Actual time waited (calculated)
  ADD COLUMN IF NOT EXISTS preferred_section VARCHAR(100),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update existing status column
COMMENT ON COLUMN waitlist_entries.status IS 'Deprecated - use waitlist_status instead';

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist_entries(waitlist_status);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_waitlist_position ON waitlist_entries(position);

-- ============================================================================
-- RESERVATION CONFIRMATIONS & NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS reservation_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations ON DELETE CASCADE,
  confirmation_type VARCHAR(50) NOT NULL, -- 'email', 'sms', 'whatsapp'
  recipient VARCHAR(255) NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservation_confirmations_reservation_id
  ON reservation_confirmations(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_confirmations_sent_at
  ON reservation_confirmations(sent_at);

-- ============================================================================
-- FLOOR PLAN SECTIONS
-- ============================================================================

-- Define sections of the restaurant (terrace, indoor, bar, etc.)
CREATE TABLE IF NOT EXISTS floor_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add section reference to tables
ALTER TABLE tables
  ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES floor_sections ON DELETE SET NULL;

-- Default sections for GrandCafe Cheers
INSERT INTO floor_sections (name, description, sort_order) VALUES
  ('Terrace', 'Outdoor seating area facing the beach', 1),
  ('Indoor', 'Main indoor dining area', 2),
  ('Bar', 'Bar counter and high tables', 3),
  ('VIP', 'Reserved for VIP guests', 4)
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_tables_section_id ON tables(section_id);

-- ============================================================================
-- OCCUPANCY TRACKING
-- ============================================================================

-- Track table occupancy sessions for analytics
CREATE TABLE IF NOT EXISTS table_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES tables ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations ON DELETE SET NULL,
  party_size INTEGER NOT NULL,
  seated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  departed_at TIMESTAMPTZ,
  duration_minutes INTEGER, -- Calculated on departure
  revenue DECIMAL(10, 2), -- Total bill for this session
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_table_sessions_table_id ON table_sessions(table_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_seated_at ON table_sessions(seated_at);
CREATE INDEX IF NOT EXISTS idx_table_sessions_reservation_id ON table_sessions(reservation_id);

-- ============================================================================
-- NO-SHOW TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS no_show_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations ON DELETE CASCADE,
  customer_id UUID REFERENCES customers ON DELETE SET NULL,
  guest_phone VARCHAR(20),
  guest_email VARCHAR(255),
  reservation_date DATE NOT NULL,
  party_size INTEGER NOT NULL,
  marked_no_show_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  marked_by UUID REFERENCES profiles ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_no_show_customer_id ON no_show_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_no_show_guest_phone ON no_show_history(guest_phone);
CREATE INDEX IF NOT EXISTS idx_no_show_date ON no_show_history(reservation_date);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update reservation_settings.updated_at on changes
CREATE OR REPLACE FUNCTION update_reservation_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reservation_settings_updated_at
BEFORE UPDATE ON reservation_settings
FOR EACH ROW
EXECUTE FUNCTION update_reservation_settings_updated_at();

-- Calculate actual wait time for waitlist entries when seated
CREATE OR REPLACE FUNCTION calculate_waitlist_wait_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.seated_at IS NOT NULL AND OLD.seated_at IS NULL THEN
    NEW.actual_wait_minutes = EXTRACT(EPOCH FROM (NEW.seated_at - NEW.created_at)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER waitlist_calculate_wait_time
BEFORE UPDATE ON waitlist_entries
FOR EACH ROW
EXECUTE FUNCTION calculate_waitlist_wait_time();

-- Calculate table session duration on departure
CREATE OR REPLACE FUNCTION calculate_table_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.departed_at IS NOT NULL AND OLD.departed_at IS NULL THEN
    NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.departed_at - NEW.seated_at)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER table_session_duration
BEFORE UPDATE ON table_sessions
FOR EACH ROW
EXECUTE FUNCTION calculate_table_session_duration();

-- Auto-create no-show record when reservation marked as no-show
CREATE OR REPLACE FUNCTION create_no_show_record()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reservation_status = 'no_show' AND OLD.reservation_status != 'no_show' THEN
    INSERT INTO no_show_history (
      reservation_id,
      customer_id,
      guest_phone,
      guest_email,
      reservation_date,
      party_size,
      marked_no_show_at
    ) VALUES (
      NEW.id,
      NEW.customer_id,
      NEW.guest_phone,
      NEW.guest_email,
      NEW.reservation_date,
      NEW.party_size,
      now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reservation_no_show_tracking
AFTER UPDATE ON reservations
FOR EACH ROW
EXECUTE FUNCTION create_no_show_record();

-- Auto-update table status based on reservations and sessions
CREATE OR REPLACE FUNCTION update_table_status_from_reservation()
RETURNS TRIGGER AS $$
BEGIN
  -- When reservation is seated, mark table as occupied
  IF NEW.reservation_status = 'seated' AND OLD.reservation_status != 'seated' THEN
    UPDATE tables SET status = 'occupied' WHERE id = NEW.table_id;
  END IF;

  -- When reservation is completed/cancelled/no-show, check if table should be freed
  IF NEW.reservation_status IN ('completed', 'cancelled', 'no_show')
     AND OLD.reservation_status NOT IN ('completed', 'cancelled', 'no_show') THEN
    -- Only set to cleaning if no other active sessions on this table
    IF NOT EXISTS (
      SELECT 1 FROM table_sessions
      WHERE table_id = NEW.table_id AND departed_at IS NULL
    ) THEN
      UPDATE tables SET status = 'cleaning' WHERE id = NEW.table_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reservation_update_table_status
AFTER UPDATE ON reservations
FOR EACH ROW
EXECUTE FUNCTION update_table_status_from_reservation();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE reservation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE floor_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE no_show_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_confirmations ENABLE ROW LEVEL SECURITY;

-- Reservation settings: Managers and admins can view/edit
CREATE POLICY "Managers can view reservation settings"
  ON reservation_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'owner')
    )
  );

CREATE POLICY "Managers can update reservation settings"
  ON reservation_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Time slots: Staff can view, managers can edit
CREATE POLICY "Staff can view time slots"
  ON reservation_time_slots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'waiter')
    )
  );

CREATE POLICY "Managers can manage time slots"
  ON reservation_time_slots FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Floor sections: All staff can view
CREATE POLICY "Staff can view floor sections"
  ON floor_sections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'waiter', 'kitchen', 'bar')
    )
  );

-- Table sessions: Staff can view and create
CREATE POLICY "Staff can view table sessions"
  ON table_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'waiter')
    )
  );

CREATE POLICY "Staff can create table sessions"
  ON table_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'waiter')
    )
  );

CREATE POLICY "Staff can update table sessions"
  ON table_sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'waiter')
    )
  );

-- No-show history: Managers can view
CREATE POLICY "Managers can view no-show history"
  ON no_show_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'owner')
    )
  );

-- Reservation confirmations: Staff can view
CREATE POLICY "Staff can view reservation confirmations"
  ON reservation_confirmations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'waiter')
    )
  );

-- Update existing waitlist RLS (if not already set)
DROP POLICY IF EXISTS "Staff can view waitlist" ON waitlist_entries;
CREATE POLICY "Staff can view waitlist"
  ON waitlist_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'waiter')
    )
  );

DROP POLICY IF EXISTS "Staff can manage waitlist" ON waitlist_entries;
CREATE POLICY "Staff can manage waitlist"
  ON waitlist_entries FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'waiter')
    )
  );

-- Update existing tables RLS
DROP POLICY IF EXISTS "Staff can view tables" ON tables;
CREATE POLICY "Staff can view tables"
  ON tables FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'waiter', 'kitchen', 'bar')
    )
  );

DROP POLICY IF EXISTS "Managers can manage tables" ON tables;
CREATE POLICY "Managers can manage tables"
  ON tables FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Update reservations RLS for more granular control
DROP POLICY IF EXISTS "Staff can read reservations" ON reservations;
CREATE POLICY "Staff can view reservations"
  ON reservations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'waiter')
    )
  );

DROP POLICY IF EXISTS "Staff can create reservations" ON reservations;
CREATE POLICY "Staff can create reservations"
  ON reservations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'waiter')
    )
  );

DROP POLICY IF EXISTS "Staff can update reservations" ON reservations;
CREATE POLICY "Staff can update reservations"
  ON reservations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'waiter')
    )
  );

-- ============================================================================
-- HELPER VIEWS FOR DASHBOARD
-- ============================================================================

-- Today's reservations summary
CREATE OR REPLACE VIEW todays_reservations_summary AS
SELECT
  reservation_date,
  COUNT(*) as total_reservations,
  SUM(party_size) as total_covers,
  COUNT(*) FILTER (WHERE reservation_status = 'confirmed') as confirmed_count,
  COUNT(*) FILTER (WHERE reservation_status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE reservation_status = 'seated') as currently_seated,
  COUNT(*) FILTER (WHERE reservation_status = 'no_show') as no_show_count,
  COUNT(*) FILTER (WHERE reservation_status = 'completed') as completed_count
FROM reservations
WHERE reservation_date = CURRENT_DATE
GROUP BY reservation_date;

-- Occupancy rate by time slot
CREATE OR REPLACE VIEW occupancy_by_time_slot AS
SELECT
  r.reservation_date,
  DATE_PART('hour', r.start_time) as hour,
  COUNT(DISTINCT r.table_id) as tables_reserved,
  (SELECT COUNT(*) FROM tables WHERE is_active = true) as total_tables,
  ROUND(
    (COUNT(DISTINCT r.table_id)::DECIMAL /
     NULLIF((SELECT COUNT(*) FROM tables WHERE is_active = true), 0)) * 100,
    2
  ) as occupancy_percentage
FROM reservations r
WHERE r.reservation_status IN ('confirmed', 'seated', 'completed')
GROUP BY r.reservation_date, DATE_PART('hour', r.start_time)
ORDER BY r.reservation_date DESC, hour;

-- No-show rate by customer
CREATE OR REPLACE VIEW customer_no_show_rate AS
SELECT
  c.id,
  c.name,
  c.email,
  c.phone,
  COUNT(r.id) as total_reservations,
  COUNT(*) FILTER (WHERE r.reservation_status = 'no_show') as no_show_count,
  ROUND(
    (COUNT(*) FILTER (WHERE r.reservation_status = 'no_show')::DECIMAL /
     NULLIF(COUNT(r.id), 0)) * 100,
    2
  ) as no_show_percentage
FROM customers c
LEFT JOIN reservations r ON r.customer_id = c.id
GROUP BY c.id, c.name, c.email, c.phone
HAVING COUNT(r.id) > 0
ORDER BY no_show_percentage DESC;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE reservation_settings IS 'Global configuration for reservation system (single row)';
COMMENT ON TABLE reservation_time_slots IS 'Available reservation time slots by day of week';
COMMENT ON TABLE floor_sections IS 'Physical sections of the restaurant floor plan';
COMMENT ON TABLE table_sessions IS 'Tracking actual table occupancy for analytics';
COMMENT ON TABLE no_show_history IS 'Historical record of no-shows for customer reliability tracking';
COMMENT ON TABLE reservation_confirmations IS 'Log of confirmation emails/SMS sent to guests';

COMMENT ON COLUMN tables.x_position IS 'X coordinate for floor plan editor (pixels or cm)';
COMMENT ON COLUMN tables.y_position IS 'Y coordinate for floor plan editor (pixels or cm)';
COMMENT ON COLUMN tables.shape IS 'Visual shape for floor plan rendering';
COMMENT ON COLUMN tables.rotation IS 'Rotation angle in degrees for floor plan';

COMMENT ON COLUMN reservations.reservation_status IS 'Current status in reservation lifecycle';
COMMENT ON COLUMN reservations.source IS 'How the reservation was created (tracking channel effectiveness)';
COMMENT ON COLUMN reservations.estimated_duration_minutes IS 'Expected duration (default 90 min)';
COMMENT ON COLUMN reservations.actual_arrival_time IS 'When guest actually arrived (vs reservation time)';

COMMENT ON VIEW todays_reservations_summary IS 'Dashboard summary of today''s reservation metrics';
COMMENT ON VIEW occupancy_by_time_slot IS 'Table occupancy rate by hour for capacity planning';
COMMENT ON VIEW customer_no_show_rate IS 'Customer reliability metrics based on no-show history';
