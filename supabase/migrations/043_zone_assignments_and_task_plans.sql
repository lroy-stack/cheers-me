-- ═══════════════════════════════════════════════════
-- Migration 043: Zone Assignments + Weekly Task Plans
-- ═══════════════════════════════════════════════════

-- ═══ ZONE ASSIGNMENTS (who works in which zone per shift) ═══
CREATE TABLE IF NOT EXISTS zone_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES floor_sections(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
  assignment_date DATE NOT NULL,
  shift_type VARCHAR(20),  -- 'morning', 'afternoon', 'night'
  notes TEXT,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(section_id, employee_id, assignment_date, shift_type)
);

-- ═══ WEEKLY TASK PLANS ═══
CREATE TABLE IF NOT EXISTS weekly_task_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start_date DATE NOT NULL UNIQUE,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ PLANNED TASKS (individual tasks within a weekly plan) ═══
CREATE TABLE IF NOT EXISTS planned_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES weekly_task_plans(id) ON DELETE CASCADE,
  template_id UUID REFERENCES staff_task_templates(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL,
  assigned_role VARCHAR(50),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Monday
  shift_type VARCHAR(20),  -- 'morning', 'afternoon', 'night'
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  estimated_minutes INTEGER,
  section_id UUID REFERENCES floor_sections(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  task_id UUID REFERENCES staff_tasks(id) ON DELETE SET NULL,  -- link to generated real task
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_zone_assignments_date ON zone_assignments(assignment_date);
CREATE INDEX IF NOT EXISTS idx_zone_assignments_employee ON zone_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_zone_assignments_section ON zone_assignments(section_id);
CREATE INDEX IF NOT EXISTS idx_weekly_task_plans_week ON weekly_task_plans(week_start_date);
CREATE INDEX IF NOT EXISTS idx_planned_tasks_plan ON planned_tasks(plan_id);
CREATE INDEX IF NOT EXISTS idx_planned_tasks_day ON planned_tasks(day_of_week);
CREATE INDEX IF NOT EXISTS idx_planned_tasks_assigned ON planned_tasks(assigned_to);

-- RLS
ALTER TABLE zone_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_task_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_tasks ENABLE ROW LEVEL SECURITY;

-- Read: all authenticated users
CREATE POLICY "read_zone_assignments" ON zone_assignments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "read_task_plans" ON weekly_task_plans
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "read_planned_tasks" ON planned_tasks
  FOR SELECT USING (auth.role() = 'authenticated');

-- Write: admin/owner/manager only
CREATE POLICY "manage_zone_assignments" ON zone_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'manager'))
  );

CREATE POLICY "manage_task_plans" ON weekly_task_plans
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'manager'))
  );

CREATE POLICY "manage_planned_tasks" ON planned_tasks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'manager'))
  );

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_zone_assignment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER zone_assignment_updated
  BEFORE UPDATE ON zone_assignments
  FOR EACH ROW EXECUTE FUNCTION update_zone_assignment_timestamp();

CREATE TRIGGER weekly_task_plan_updated
  BEFORE UPDATE ON weekly_task_plans
  FOR EACH ROW EXECUTE FUNCTION update_zone_assignment_timestamp();

CREATE TRIGGER planned_task_updated
  BEFORE UPDATE ON planned_tasks
  FOR EACH ROW EXECUTE FUNCTION update_zone_assignment_timestamp();
