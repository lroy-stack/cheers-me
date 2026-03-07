CREATE TABLE IF NOT EXISTS employee_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  change_reason TEXT
);
