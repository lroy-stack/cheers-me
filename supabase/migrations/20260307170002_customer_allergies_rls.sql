ALTER TABLE customer_allergies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage customer allergies" ON customer_allergies
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
