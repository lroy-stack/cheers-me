-- ============================================================================
-- Create processed_webhook_events table for idempotent Stripe webhook handling
-- Prevents duplicate processing if Stripe retries a webhook event
-- ============================================================================

CREATE TABLE IF NOT EXISTS processed_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by event_id
CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_event_id 
  ON processed_webhook_events (event_id);

-- Enable RLS: only service role can access (webhooks run server-side with service role)
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- No RLS policies needed — access via service role only (bypasses RLS)
-- Regular users have no reason to access this table
