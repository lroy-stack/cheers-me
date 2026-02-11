-- ============================================================================
-- 027: Staff Task Management System
-- ============================================================================

-- Task priority enum
DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Task status enum
DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Notification type additions
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'task_assigned';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'task_completed';

-- ============================================================================
-- Staff Task Templates
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  items JSONB DEFAULT '[]',
  default_priority task_priority DEFAULT 'medium',
  default_assigned_role VARCHAR(20),
  frequency VARCHAR(50),
  estimated_minutes INTEGER,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Staff Tasks
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  template_id UUID REFERENCES staff_task_templates(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL,
  assigned_role VARCHAR(20),
  assigned_by UUID NOT NULL REFERENCES profiles(id),
  due_date DATE,
  due_time TIME,
  priority task_priority DEFAULT 'medium',
  status task_status DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Staff Task Items (Checklist)
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff_task_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES staff_tasks(id) ON DELETE CASCADE,
  text VARCHAR(500) NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_staff_tasks_assigned_to ON staff_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_assigned_role ON staff_tasks(assigned_role);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_status ON staff_tasks(status);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_due_date ON staff_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_assigned_by ON staff_tasks(assigned_by);
CREATE INDEX IF NOT EXISTS idx_staff_task_items_task_id ON staff_task_items(task_id);
CREATE INDEX IF NOT EXISTS idx_staff_task_templates_created_by ON staff_task_templates(created_by);

-- ============================================================================
-- Updated_at triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_staff_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_staff_tasks_updated_at ON staff_tasks;
CREATE TRIGGER trigger_staff_tasks_updated_at
  BEFORE UPDATE ON staff_tasks
  FOR EACH ROW EXECUTE FUNCTION update_staff_tasks_updated_at();

DROP TRIGGER IF EXISTS trigger_staff_task_items_updated_at ON staff_task_items;
CREATE TRIGGER trigger_staff_task_items_updated_at
  BEFORE UPDATE ON staff_task_items
  FOR EACH ROW EXECUTE FUNCTION update_staff_tasks_updated_at();

DROP TRIGGER IF EXISTS trigger_staff_task_templates_updated_at ON staff_task_templates;
CREATE TRIGGER trigger_staff_task_templates_updated_at
  BEFORE UPDATE ON staff_task_templates
  FOR EACH ROW EXECUTE FUNCTION update_staff_tasks_updated_at();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE staff_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_task_items ENABLE ROW LEVEL SECURITY;

-- Templates: managers/admin/owner full access, staff read-only
CREATE POLICY "templates_select_authenticated" ON staff_task_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "templates_insert_managers" ON staff_task_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'owner')
    )
  );

CREATE POLICY "templates_update_managers" ON staff_task_templates
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'owner')
    )
  );

CREATE POLICY "templates_delete_managers" ON staff_task_templates
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'owner')
    )
  );

-- Tasks: managers full access, employees see their own tasks
CREATE POLICY "tasks_select_own_or_manager" ON staff_tasks
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

CREATE POLICY "tasks_insert_managers" ON staff_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'owner')
    )
  );

CREATE POLICY "tasks_update_own_or_manager" ON staff_tasks
  FOR UPDATE TO authenticated
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

CREATE POLICY "tasks_delete_managers" ON staff_tasks
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'owner')
    )
  );

-- Task items: follow parent task visibility
CREATE POLICY "task_items_select" ON staff_task_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_tasks
      WHERE staff_tasks.id = task_id
      AND (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'manager', 'owner')
        )
        OR staff_tasks.assigned_to IN (
          SELECT id FROM employees WHERE profile_id = auth.uid()
        )
        OR staff_tasks.assigned_role = (
          SELECT role::text FROM profiles WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "task_items_insert_managers" ON staff_task_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'owner')
    )
  );

CREATE POLICY "task_items_update_own_or_manager" ON staff_task_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_tasks
      WHERE staff_tasks.id = task_id
      AND (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'manager', 'owner')
        )
        OR staff_tasks.assigned_to IN (
          SELECT id FROM employees WHERE profile_id = auth.uid()
        )
        OR staff_tasks.assigned_role = (
          SELECT role::text FROM profiles WHERE id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "task_items_delete_managers" ON staff_task_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager', 'owner')
    )
  );

-- ============================================================================
-- Task assignment notification trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message)
    SELECT
      e.profile_id,
      'task_assigned',
      'New Task Assigned',
      'You have been assigned a new task: ' || NEW.title
    FROM employees e
    WHERE e.id = NEW.assigned_to;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_task_assigned ON staff_tasks;
CREATE TRIGGER trigger_notify_task_assigned
  AFTER INSERT ON staff_tasks
  FOR EACH ROW EXECUTE FUNCTION notify_task_assigned();

-- Task completion notification trigger
CREATE OR REPLACE FUNCTION notify_task_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (
      NEW.assigned_by,
      'task_completed',
      'Task Completed',
      'Task "' || NEW.title || '" has been completed.'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_task_completed ON staff_tasks;
CREATE TRIGGER trigger_notify_task_completed
  AFTER UPDATE ON staff_tasks
  FOR EACH ROW EXECUTE FUNCTION notify_task_completed();

-- ============================================================================
-- Enable realtime
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE staff_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE staff_task_items;
