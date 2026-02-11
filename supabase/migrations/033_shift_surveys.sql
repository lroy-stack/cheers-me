-- ============================================================================
-- Shift Survey & Feedback System
-- Post-shift surveys with AI analysis and anomaly detection
-- ============================================================================

-- ============================================================================
-- SHIFT SURVEY RESPONSES TABLE
-- ============================================================================

CREATE TABLE shift_survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clock_record_id UUID NOT NULL UNIQUE REFERENCES clock_in_out(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  shift_type VARCHAR(20),
  worked_minutes INTEGER,
  scheduled_minutes INTEGER,
  variance_minutes INTEGER,
  break_variance_minutes INTEGER,
  anomaly_type VARCHAR(50),
  anomaly_reason VARCHAR(100),
  anomaly_comment TEXT,
  ai_analysis JSONB,
  manager_reviewed BOOLEAN DEFAULT false,
  manager_reviewed_by UUID REFERENCES profiles(id),
  manager_reviewed_at TIMESTAMPTZ,
  manager_notes TEXT,
  responded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_survey_employee ON shift_survey_responses(employee_id);
CREATE INDEX idx_survey_responded ON shift_survey_responses(responded_at DESC);
CREATE INDEX idx_survey_flagged ON shift_survey_responses(rating) WHERE rating <= 2;
CREATE INDEX idx_survey_unreviewed ON shift_survey_responses(manager_reviewed) WHERE NOT manager_reviewed;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE shift_survey_responses ENABLE ROW LEVEL SECURITY;

-- Employees can view their own surveys, managers/admins can view all
CREATE POLICY "survey_select_own" ON shift_survey_responses FOR SELECT TO authenticated
  USING (
    employee_id = (SELECT id FROM employees WHERE profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','owner'))
  );

-- Only managers/admins can update (for review)
CREATE POLICY "survey_update_manager" ON shift_survey_responses FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','owner')));

-- ============================================================================
-- UPDATE NOTIFICATION ENUM
-- ============================================================================

-- Add new notification types for shift feedback
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'shift_feedback_received';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'shift_feedback_flagged';
