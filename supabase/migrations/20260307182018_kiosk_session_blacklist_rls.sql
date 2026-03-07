ALTER TABLE kiosk_session_blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can manage blacklist" ON kiosk_session_blacklist
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner', 'manager')
    )
  );
