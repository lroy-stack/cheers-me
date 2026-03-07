ALTER TABLE vip_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/manager can manage vip settings" ON vip_settings
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
