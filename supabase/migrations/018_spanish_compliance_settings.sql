-- Migration 018: Spanish labor compliance fields, split shifts, and restaurant settings
-- =============================================================================

-- Split shift columns on shifts table
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS second_start_time VARCHAR(5);
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS second_end_time VARCHAR(5);

-- Spanish compliance fields on employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_end_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employment_status VARCHAR(20) DEFAULT 'active';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS social_security_number VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS convenio_colectivo VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS categoria_profesional VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS tipo_jornada VARCHAR(20) DEFAULT 'completa';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS periodo_prueba_end DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS irpf_retention DECIMAL(5,2);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS job_title VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS weekly_hours_target DECIMAL(5,2);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS gross_salary DECIMAL(10,2);

-- Restaurant settings table (key-value JSONB)
CREATE TABLE IF NOT EXISTS restaurant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY restaurant_settings_read ON restaurant_settings
  FOR SELECT USING (true);

-- Only admins/managers can write settings
CREATE POLICY restaurant_settings_write ON restaurant_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Seed default settings
INSERT INTO restaurant_settings (key, value) VALUES
  ('shift_templates', '{
    "M": {"label": "Morning", "start": "10:00", "end": "17:00", "break": 30},
    "T": {"label": "Afternoon", "start": "17:00", "end": "00:00", "break": 30},
    "N": {"label": "Night", "start": "20:00", "end": "03:00", "break": 15},
    "P": {"label": "Split", "start": "10:00", "end": "14:00", "secondStart": "18:00", "secondEnd": "22:00", "break": 0},
    "D": {"label": "Day Off", "start": "", "end": "", "break": 0}
  }'::jsonb),
  ('labor_constraints', '{
    "maxWeeklyHours": 40,
    "minRestBetweenShifts": 12,
    "minDaysOffPerWeek": 2,
    "overtimeMultiplier": 1.5,
    "overtimeWarningThreshold": 35
  }'::jsonb),
  ('print_groups', '{
    "sala": ["waiter", "bar", "dj", "manager", "admin", "owner"],
    "cocina": ["kitchen"]
  }'::jsonb),
  ('restaurant_hours', '{
    "opening": "10:00",
    "closing": "03:00",
    "daysOpen": [1, 2, 3, 4, 5, 6, 0]
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;
