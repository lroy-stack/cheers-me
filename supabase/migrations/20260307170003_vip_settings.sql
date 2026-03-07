CREATE TABLE IF NOT EXISTS vip_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_threshold INT NOT NULL DEFAULT 10,
  spent_threshold DECIMAL(10,2) NOT NULL DEFAULT 0,
  auto_promote_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO vip_settings (visit_threshold, spent_threshold, auto_promote_enabled)
VALUES (10, 0, true)
ON CONFLICT DO NOTHING;
