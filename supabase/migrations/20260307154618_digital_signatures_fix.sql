-- Extend existing digital_signatures table with year/month fields for monthly registry acknowledgments
-- The table already exists from migration 019 with: user_id, document_type, document_id, signature_url, signed_at, ip_address
ALTER TABLE digital_signatures
  ADD COLUMN IF NOT EXISTS registry_year INTEGER,
  ADD COLUMN IF NOT EXISTS registry_month INTEGER CHECK (registry_month IS NULL OR registry_month BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_digital_signatures_monthly_registry
  ON digital_signatures(user_id, document_type, registry_year, registry_month)
  WHERE document_type = 'monthly_registry' AND registry_year IS NOT NULL AND registry_month IS NOT NULL;
