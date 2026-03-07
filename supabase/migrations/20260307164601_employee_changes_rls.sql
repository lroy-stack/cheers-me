ALTER TABLE employee_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers_read_employee_changes" ON employee_changes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner', 'manager')
    )
  );

CREATE POLICY "service_insert_employee_changes" ON employee_changes
  FOR INSERT
  TO service_role
  WITH CHECK (true);
