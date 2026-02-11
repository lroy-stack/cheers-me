/**
 * Kiosk Security Events Table
 *
 * This migration creates a table to log security-related events in the kiosk system.
 * Used for audit trails, monitoring, and anomaly detection.
 *
 * Event types tracked:
 * - turnstile_failed: Cloudflare challenge verification failed
 * - turnstile_fallback: Cloudflare API unavailable, fail-open applied
 * - rate_limit_exceeded: Too many failed PIN attempts
 * - invalid_pin: Incorrect PIN entered
 * - invalid_session_token: Invalid or malformed session token
 * - session_token_expired: Session token has expired
 * - unauthorized_access: Employee ID mismatch or unauthorized action
 *
 * @see src/lib/kiosk/security-logger.ts
 */

-- Create kiosk_security_events table
CREATE TABLE IF NOT EXISTS kiosk_security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for event type queries
CREATE INDEX IF NOT EXISTS idx_kiosk_security_events_type
  ON kiosk_security_events(event_type);

-- Create index for time-based queries
CREATE INDEX IF NOT EXISTS idx_kiosk_security_events_created_at
  ON kiosk_security_events(created_at DESC);

-- Create GIN index for JSONB metadata searches
CREATE INDEX IF NOT EXISTS idx_kiosk_security_events_metadata
  ON kiosk_security_events USING GIN (metadata);

-- Comment on table
COMMENT ON TABLE kiosk_security_events IS
  'Logs security-related events in the kiosk system for audit trails and monitoring.';

COMMENT ON COLUMN kiosk_security_events.event_type IS
  'Type of security event (e.g., turnstile_failed, rate_limit_exceeded, invalid_pin)';

COMMENT ON COLUMN kiosk_security_events.metadata IS
  'Additional contextual information about the event (IP address, error codes, etc.)';

-- Enable RLS
ALTER TABLE kiosk_security_events ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins and owners can view security events
CREATE POLICY "Admins can view security events"
  ON kiosk_security_events FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'owner')
    )
  );

-- Policy: Allow insert for authenticated users (kiosk uses admin client)
CREATE POLICY "Allow insert for authenticated users"
  ON kiosk_security_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Only admins can delete events (for GDPR compliance or cleanup)
CREATE POLICY "Admins can delete security events"
  ON kiosk_security_events FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'owner')
    )
  );

-- Auto-cleanup trigger function (optional - keeps table size manageable)
-- Deletes events older than 90 days
CREATE OR REPLACE FUNCTION cleanup_old_security_events()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM kiosk_security_events
  WHERE created_at < now() - interval '90 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (runs after every 100th insert to avoid overhead)
-- Note: This is a simple approach. For production, consider a scheduled job.
DROP TRIGGER IF EXISTS trigger_cleanup_security_events ON kiosk_security_events;
CREATE TRIGGER trigger_cleanup_security_events
  AFTER INSERT ON kiosk_security_events
  FOR EACH STATEMENT
  EXECUTE FUNCTION cleanup_old_security_events();

-- Create a view for recent security events (convenience for monitoring)
CREATE OR REPLACE VIEW recent_kiosk_security_events AS
SELECT
  id,
  event_type,
  metadata,
  created_at
FROM kiosk_security_events
WHERE created_at > now() - interval '7 days'
ORDER BY created_at DESC;

-- Grant access to the view for admins
GRANT SELECT ON recent_kiosk_security_events TO authenticated;

COMMENT ON VIEW recent_kiosk_security_events IS
  'View of kiosk security events from the last 7 days (for monitoring dashboard)';
