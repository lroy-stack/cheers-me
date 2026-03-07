-- DSAR: Data Subject Access Request table
-- Stores requests under GDPR Art. 15 (access) and Art. 17 (erasure).
CREATE TABLE IF NOT EXISTS data_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          VARCHAR(20) NOT NULL CHECK (type IN ('access', 'erasure', 'portability', 'correction')),
  email         VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255),
  message       TEXT,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  processed_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  processed_at  TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
