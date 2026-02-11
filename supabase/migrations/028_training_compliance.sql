-- ============================================================================
-- 028: Training Compliance System
-- EU 852/2004, Ley 31/1995 Art. 19 — Documented training records
-- ============================================================================

-- Training action enum
DO $$ BEGIN
  CREATE TYPE training_action AS ENUM (
    'viewed', 'downloaded', 'test_started', 'test_completed',
    'test_passed', 'test_failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Training assignment status enum
DO $$ BEGIN
  CREATE TYPE training_assignment_status AS ENUM ('pending', 'completed', 'overdue');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Notification type additions
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'training_assigned';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'training_overdue';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'training_completed';

-- ============================================================================
-- Training Materials (metadata for each guide)
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_code VARCHAR(20) NOT NULL UNIQUE,
  is_mandatory BOOLEAN DEFAULT false,
  applicable_roles TEXT[] DEFAULT '{}',
  requires_test BOOLEAN DEFAULT false,
  passing_score INTEGER DEFAULT 70,
  recurrence_months INTEGER,
  estimated_minutes INTEGER DEFAULT 15,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Training Test Questions
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_code VARCHAR(20) NOT NULL REFERENCES training_materials(guide_code) ON DELETE CASCADE,
  language VARCHAR(2) NOT NULL DEFAULT 'en',
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  explanation TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Training Records (activity log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  guide_code VARCHAR(20) NOT NULL,
  action training_action NOT NULL,
  language VARCHAR(2) DEFAULT 'en',
  score INTEGER,
  answers JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Training Assignments
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_code VARCHAR(20) NOT NULL,
  assigned_to UUID REFERENCES employees(id) ON DELETE CASCADE,
  assigned_role VARCHAR(20),
  assigned_by UUID NOT NULL REFERENCES profiles(id),
  due_date DATE,
  status training_assignment_status DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_training_materials_guide_code ON training_materials(guide_code);
CREATE INDEX IF NOT EXISTS idx_training_test_questions_guide_lang ON training_test_questions(guide_code, language);
CREATE INDEX IF NOT EXISTS idx_training_records_employee ON training_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_records_guide ON training_records(guide_code);
CREATE INDEX IF NOT EXISTS idx_training_records_action ON training_records(action);
CREATE INDEX IF NOT EXISTS idx_training_assignments_employee ON training_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_training_assignments_role ON training_assignments(assigned_role);
CREATE INDEX IF NOT EXISTS idx_training_assignments_status ON training_assignments(status);
CREATE INDEX IF NOT EXISTS idx_training_assignments_guide ON training_assignments(guide_code);

-- ============================================================================
-- Updated_at triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_training_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_training_materials_updated_at ON training_materials;
CREATE TRIGGER trigger_training_materials_updated_at
  BEFORE UPDATE ON training_materials
  FOR EACH ROW EXECUTE FUNCTION update_training_updated_at();

DROP TRIGGER IF EXISTS trigger_training_assignments_updated_at ON training_assignments;
CREATE TRIGGER trigger_training_assignments_updated_at
  BEFORE UPDATE ON training_assignments
  FOR EACH ROW EXECUTE FUNCTION update_training_updated_at();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE training_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_assignments ENABLE ROW LEVEL SECURITY;

-- Training materials: all authenticated can read
CREATE POLICY "training_materials_select" ON training_materials
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "training_materials_manage" ON training_materials
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'owner')
    )
  );

-- Test questions: all authenticated can read
CREATE POLICY "training_questions_select" ON training_test_questions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "training_questions_manage" ON training_test_questions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'owner')
    )
  );

-- Training records: employees see own, managers see all
CREATE POLICY "training_records_select" ON training_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'owner')
    )
    OR employee_id IN (
      SELECT id FROM employees WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "training_records_insert" ON training_records
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'owner')
    )
  );

-- Training assignments: employees see own, managers see all + manage
CREATE POLICY "training_assignments_select" ON training_assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'owner')
    )
    OR assigned_to IN (
      SELECT id FROM employees WHERE profile_id = auth.uid()
    )
    OR assigned_role = (
      SELECT role::text FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "training_assignments_manage" ON training_assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'owner')
    )
  );

-- ============================================================================
-- Notification triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_training_assigned()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body)
    SELECT
      e.profile_id,
      'training_assigned',
      'Training Assigned',
      'You have been assigned training: ' || NEW.guide_code
    FROM employees e
    WHERE e.id = NEW.assigned_to;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_training_assigned ON training_assignments;
CREATE TRIGGER trigger_notify_training_assigned
  AFTER INSERT ON training_assignments
  FOR EACH ROW EXECUTE FUNCTION notify_training_assigned();

-- ============================================================================
-- Seed: Training Materials for all 73 guides
-- ============================================================================

-- Food Safety (G-FS-001 to G-FS-022) — all mandatory, tests for key ones
INSERT INTO training_materials (guide_code, is_mandatory, applicable_roles, requires_test, passing_score, recurrence_months, estimated_minutes) VALUES
  ('G-FS-001', true, '{}', true, 70, 12, 30),
  ('G-FS-002', true, '{}', true, 70, 12, 20),
  ('G-FS-003', true, '{kitchen,bar}', false, 70, 12, 15),
  ('G-FS-004', true, '{kitchen}', true, 70, 12, 15),
  ('G-FS-005', true, '{}', false, 70, 12, 15),
  ('G-FS-006', true, '{}', false, 70, 12, 15),
  ('G-FS-007', true, '{}', false, 70, 12, 10),
  ('G-FS-008', true, '{kitchen,bar}', false, 70, 12, 15),
  ('G-FS-009', true, '{kitchen,bar}', false, 70, 12, 10),
  ('G-FS-010', true, '{kitchen,bar}', false, 70, 12, 10),
  ('G-FS-011', true, '{kitchen,bar}', false, 70, 12, 10),
  ('G-FS-012', true, '{kitchen,bar}', false, 70, 12, 10),
  ('G-FS-013', true, '{}', false, 70, 12, 10),
  ('G-FS-014', true, '{}', false, 70, 12, 10),
  ('G-FS-015', true, '{}', false, 70, 12, 10),
  ('G-FS-016', true, '{kitchen}', false, 70, 12, 10),
  ('G-FS-017', true, '{kitchen}', false, 70, 12, 10),
  ('G-FS-018', true, '{kitchen}', false, 70, 12, 10),
  ('G-FS-019', true, '{kitchen,bar,waiter}', false, 70, 12, 10),
  ('G-FS-020', true, '{kitchen,bar,waiter}', false, 70, 12, 10),
  ('G-FS-021', true, '{kitchen}', false, 70, 12, 10),
  ('G-FS-022', true, '{}', false, 70, 12, 15)
ON CONFLICT (guide_code) DO NOTHING;

-- Occupational Health (G-PRL-001 to G-PRL-018)
INSERT INTO training_materials (guide_code, is_mandatory, applicable_roles, requires_test, passing_score, recurrence_months, estimated_minutes) VALUES
  ('G-PRL-001', true, '{}', true, 70, 12, 25),
  ('G-PRL-002', true, '{}', true, 70, 12, 20),
  ('G-PRL-003', true, '{}', false, 70, 12, 15),
  ('G-PRL-004', true, '{}', false, 70, 12, 15),
  ('G-PRL-005', true, '{}', true, 70, 12, 20),
  ('G-PRL-006', true, '{}', false, 70, 12, 15),
  ('G-PRL-007', true, '{kitchen}', false, 70, 12, 15),
  ('G-PRL-008', true, '{kitchen,bar,waiter}', false, 70, 12, 10),
  ('G-PRL-009', true, '{kitchen,bar}', false, 70, 12, 10),
  ('G-PRL-010', true, '{kitchen}', false, 70, 12, 10),
  ('G-PRL-011', true, '{kitchen,bar,dj}', false, 70, 12, 10),
  ('G-PRL-012', true, '{}', false, 70, 12, 10),
  ('G-PRL-013', true, '{}', false, 70, 12, 10),
  ('G-PRL-014', true, '{kitchen}', false, 70, 12, 10),
  ('G-PRL-015', true, '{}', false, 70, 12, 10),
  ('G-PRL-016', true, '{}', false, 70, 12, 10),
  ('G-PRL-017', true, '{}', false, 70, 12, 10),
  ('G-PRL-018', true, '{}', false, 70, 12, 10)
ON CONFLICT (guide_code) DO NOTHING;

-- Labor Regulations (G-LAB-001 to G-LAB-009)
INSERT INTO training_materials (guide_code, is_mandatory, applicable_roles, requires_test, passing_score, recurrence_months, estimated_minutes) VALUES
  ('G-LAB-001', true, '{}', true, 70, NULL, 20),
  ('G-LAB-002', true, '{}', false, 70, NULL, 15),
  ('G-LAB-003', true, '{}', false, 70, NULL, 15),
  ('G-LAB-004', true, '{}', false, 70, NULL, 10),
  ('G-LAB-005', true, '{}', true, 70, NULL, 15),
  ('G-LAB-006', true, '{}', false, 70, NULL, 10),
  ('G-LAB-007', true, '{}', false, 70, NULL, 10),
  ('G-LAB-008', true, '{}', false, 70, NULL, 10),
  ('G-LAB-009', true, '{}', false, 70, NULL, 10)
ON CONFLICT (guide_code) DO NOTHING;

-- Role Specific (G-ROL-001 to G-ROL-014)
INSERT INTO training_materials (guide_code, is_mandatory, applicable_roles, requires_test, passing_score, recurrence_months, estimated_minutes) VALUES
  ('G-ROL-001', true, '{kitchen}', true, 70, 12, 20),
  ('G-ROL-002', false, '{kitchen}', false, 70, NULL, 15),
  ('G-ROL-003', false, '{kitchen}', false, 70, NULL, 15),
  ('G-ROL-004', false, '{kitchen}', false, 70, NULL, 10),
  ('G-ROL-005', false, '{kitchen}', false, 70, NULL, 10),
  ('G-ROL-006', false, '{bar}', false, 70, NULL, 15),
  ('G-ROL-007', false, '{bar}', false, 70, NULL, 10),
  ('G-ROL-008', false, '{waiter}', false, 70, NULL, 15),
  ('G-ROL-009', false, '{waiter}', false, 70, NULL, 10),
  ('G-ROL-010', false, '{}', false, 70, NULL, 15),
  ('G-ROL-011', false, '{}', false, 70, NULL, 10),
  ('G-ROL-012', false, '{}', false, 70, NULL, 10),
  ('G-ROL-013', false, '{}', false, 70, NULL, 10),
  ('G-ROL-014', false, '{}', false, 70, NULL, 10)
ON CONFLICT (guide_code) DO NOTHING;

-- Required Docs (G-DOC-001 to G-DOC-005)
INSERT INTO training_materials (guide_code, is_mandatory, applicable_roles, requires_test, passing_score, recurrence_months, estimated_minutes) VALUES
  ('G-DOC-001', true, '{admin,manager,owner}', false, 70, NULL, 15),
  ('G-DOC-002', true, '{admin,manager,owner}', false, 70, NULL, 10),
  ('G-DOC-003', true, '{admin,manager,owner}', false, 70, NULL, 10),
  ('G-DOC-004', true, '{admin,manager,owner}', false, 70, NULL, 10),
  ('G-DOC-005', true, '{admin,manager,owner}', false, 70, NULL, 10)
ON CONFLICT (guide_code) DO NOTHING;

-- Environmental (G-ENV-001 to G-ENV-005)
INSERT INTO training_materials (guide_code, is_mandatory, applicable_roles, requires_test, passing_score, recurrence_months, estimated_minutes) VALUES
  ('G-ENV-001', true, '{}', true, 70, 12, 15),
  ('G-ENV-002', false, '{}', false, 70, NULL, 10),
  ('G-ENV-003', false, '{kitchen}', false, 70, NULL, 10),
  ('G-ENV-004', false, '{}', false, 70, NULL, 10),
  ('G-ENV-005', false, '{kitchen,bar,waiter}', false, 70, NULL, 10)
ON CONFLICT (guide_code) DO NOTHING;

-- ============================================================================
-- Enable realtime
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE training_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE training_records;
