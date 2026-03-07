ALTER TABLE holiday_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/manager can manage holiday closures" ON holiday_closures
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can read holiday closures" ON holiday_closures
  FOR SELECT TO anon
  USING (true);
