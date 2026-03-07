ALTER TABLE data_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage data_requests" ON data_requests FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','owner','manager')));
CREATE INDEX IF NOT EXISTS idx_data_requests_email ON data_requests (email);
CREATE INDEX IF NOT EXISTS idx_data_requests_status ON data_requests (status);
