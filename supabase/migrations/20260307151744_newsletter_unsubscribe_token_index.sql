-- Index for unsubscribe token lookup
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_unsubscribe_token
  ON newsletter_subscribers (unsubscribe_token)
  WHERE unsubscribe_token IS NOT NULL;