ALTER TABLE staff_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employees_view_own_documents" ON staff_documents
  FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner', 'manager')
    )
  );

CREATE POLICY "managers_insert_documents" ON staff_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner', 'manager')
    )
    OR uploaded_by = auth.uid()
  );

CREATE POLICY "managers_delete_documents" ON staff_documents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner', 'manager')
    )
  );
