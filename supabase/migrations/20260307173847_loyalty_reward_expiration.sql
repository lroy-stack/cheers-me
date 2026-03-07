-- Add expires_at and status columns to loyalty_rewards for 90-day expiration
ALTER TABLE loyalty_rewards
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired'));
