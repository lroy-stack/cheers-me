ALTER TABLE reservation_time_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read reservation_time_slots"
  ON reservation_time_slots FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Anon can read reservation_time_slots"
  ON reservation_time_slots FOR SELECT
  TO anon USING (is_active = true);

CREATE POLICY "Admins and managers can manage reservation_time_slots"
  ON reservation_time_slots FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'manager')
    )
  );
