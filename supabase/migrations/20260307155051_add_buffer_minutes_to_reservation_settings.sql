-- Add buffer_minutes to reservation_settings for configurable gap between reservations
ALTER TABLE reservation_settings
  ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER NOT NULL DEFAULT 15;
