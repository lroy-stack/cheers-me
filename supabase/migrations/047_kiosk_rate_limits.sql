/**
 * Kiosk Rate Limiting Table
 *
 * This migration creates a table to track PIN verification attempts for rate limiting.
 * Features:
 * - Persistent storage (survives cold starts)
 * - Tracks both failed and successful attempts
 * - Indexed for fast IP-based queries
 * - Auto-cleanup of old records via trigger
 *
 * @see src/lib/kiosk/rate-limiter.ts
 */

-- Create kiosk_rate_limits table
CREATE TABLE IF NOT EXISTS kiosk_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for efficient IP + time queries
CREATE INDEX IF NOT EXISTS idx_kiosk_rate_limits_ip_time
  ON kiosk_rate_limits(ip_address, attempt_at DESC);

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_kiosk_rate_limits_attempt_at
  ON kiosk_rate_limits(attempt_at);

-- Comment on table
COMMENT ON TABLE kiosk_rate_limits IS
  'Tracks kiosk PIN verification attempts for rate limiting. Auto-cleans records older than 24 hours.';

COMMENT ON COLUMN kiosk_rate_limits.ip_address IS
  'Client IP address (from x-forwarded-for or x-real-ip header)';

COMMENT ON COLUMN kiosk_rate_limits.attempt_at IS
  'When the PIN verification attempt occurred';

COMMENT ON COLUMN kiosk_rate_limits.success IS
  'Whether the PIN verification succeeded (true) or failed (false)';

-- Auto-cleanup trigger function
-- Deletes records older than 24 hours whenever a new record is inserted
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM kiosk_rate_limits
  WHERE attempt_at < now() - interval '24 hours';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_cleanup_rate_limits ON kiosk_rate_limits;
CREATE TRIGGER trigger_cleanup_rate_limits
  AFTER INSERT ON kiosk_rate_limits
  EXECUTE FUNCTION cleanup_old_rate_limits();

-- Enable RLS (but allow all authenticated access)
ALTER TABLE kiosk_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can insert (kiosk uses admin client)
CREATE POLICY "Allow insert for authenticated users"
  ON kiosk_rate_limits FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Only admins can view rate limit records
CREATE POLICY "Admins can view rate limits"
  ON kiosk_rate_limits FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'owner')
    )
  );

-- Policy: Only admins can delete rate limit records (for manual cleanup)
CREATE POLICY "Admins can delete rate limits"
  ON kiosk_rate_limits FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'owner')
    )
  );
