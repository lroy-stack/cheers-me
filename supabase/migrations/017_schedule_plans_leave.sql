-- ============================================================================
-- GrandCafe Cheers — Schedule Plans & Leave Management
-- Migration: 017
-- Description: Adds schedule plan management, leave tracking, and employee enhancements
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE schedule_plan_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE leave_type AS ENUM ('vacation', 'sick_leave', 'personal_day', 'maternity', 'unpaid');
CREATE TYPE leave_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- ============================================================================
-- SCHEDULE PLANS
-- ============================================================================

CREATE TABLE schedule_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start_date DATE NOT NULL,
  status schedule_plan_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES profiles ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES profiles ON DELETE SET NULL,
  notes TEXT,
  copied_from_plan_id UUID REFERENCES schedule_plans ON DELETE SET NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_start_date, version)
);

CREATE INDEX idx_schedule_plans_week ON schedule_plans(week_start_date);
CREATE INDEX idx_schedule_plans_status ON schedule_plans(status);

-- ============================================================================
-- LINK SHIFTS TO PLANS + DAY OFF SUPPORT
-- ============================================================================

ALTER TABLE shifts ADD COLUMN schedule_plan_id UUID REFERENCES schedule_plans ON DELETE SET NULL;
ALTER TABLE shifts ADD COLUMN is_day_off BOOLEAN DEFAULT false;
CREATE INDEX idx_shifts_schedule_plan ON shifts(schedule_plan_id);

-- ============================================================================
-- LEAVE MANAGEMENT
-- ============================================================================

CREATE TABLE leave_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees ON DELETE CASCADE,
  year INTEGER NOT NULL,
  leave_type leave_type NOT NULL,
  total_days DECIMAL(5,1) NOT NULL DEFAULT 30,
  used_days DECIMAL(5,1) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, year, leave_type)
);

CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees ON DELETE CASCADE,
  leave_type leave_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days DECIMAL(5,1) NOT NULL,
  status leave_request_status NOT NULL DEFAULT 'pending',
  reason TEXT,
  reviewed_by UUID REFERENCES profiles ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);

-- ============================================================================
-- SCHEDULE PLAN HISTORY
-- ============================================================================

CREATE TABLE schedule_plan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_plan_id UUID NOT NULL REFERENCES schedule_plans ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  changed_by UUID NOT NULL REFERENCES profiles ON DELETE SET NULL,
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- EMPLOYEE ENHANCEMENTS
-- ============================================================================

ALTER TABLE employees ADD COLUMN weekly_hours_target DECIMAL(5,1) DEFAULT 40;
ALTER TABLE employees ADD COLUMN gross_salary DECIMAL(10,2);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE schedule_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_plan_history ENABLE ROW LEVEL SECURITY;

-- Schedule Plans: managers/admins can CRUD, all authenticated can read published
CREATE POLICY "schedule_plans_select" ON schedule_plans
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'owner')
    )
  );

CREATE POLICY "schedule_plans_insert" ON schedule_plans
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "schedule_plans_update" ON schedule_plans
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "schedule_plans_delete" ON schedule_plans
  FOR DELETE TO authenticated
  USING (
    status = 'draft'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Leave Entitlements: managers/admins can CRUD, staff can read own
CREATE POLICY "leave_entitlements_select" ON leave_entitlements
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

CREATE POLICY "leave_entitlements_manage" ON leave_entitlements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Leave Requests: staff can create/read own, managers can manage all
CREATE POLICY "leave_requests_select" ON leave_requests
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

CREATE POLICY "leave_requests_insert" ON leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "leave_requests_update" ON leave_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
    OR (
      employee_id IN (
        SELECT id FROM employees WHERE profile_id = auth.uid()
      )
      AND status = 'pending'
    )
  );

-- Schedule Plan History: managers/admins can read
CREATE POLICY "schedule_plan_history_select" ON schedule_plan_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'owner')
    )
  );

CREATE POLICY "schedule_plan_history_insert" ON schedule_plan_history
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );
