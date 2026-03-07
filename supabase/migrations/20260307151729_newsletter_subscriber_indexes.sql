-- Indexes for newsletter verification and unsubscribe token lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_verification_token
  ON newsletter_subscribers (verification_token)
  WHERE verification_token IS NOT NULL;