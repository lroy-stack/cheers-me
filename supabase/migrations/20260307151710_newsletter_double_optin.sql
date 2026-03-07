-- Add verification_token and unsubscribe_token to newsletter_subscribers
-- Feature: S1D.C1 — Newsletter double opt-in, S1D.C3 — Fix unsubscribe token
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS verification_token UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS unsubscribe_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS gdpr_consent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gdpr_consent_at TIMESTAMPTZ DEFAULT NULL;