ALTER TABLE customer_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage customer tags" ON customer_tags
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
