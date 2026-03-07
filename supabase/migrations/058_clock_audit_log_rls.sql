-- Migration 058: RLS policies for audit_log table (Feature #39)

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins, owners, managers can read audit logs
CREATE POLICY "audit_log_select_managers" ON audit_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner', 'manager')
    )
  )
