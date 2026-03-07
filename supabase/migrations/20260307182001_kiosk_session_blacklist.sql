CREATE TABLE IF NOT EXISTS kiosk_session_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL UNIQUE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  blacklisted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_kiosk_blacklist_token ON kiosk_session_blacklist(session_token);
