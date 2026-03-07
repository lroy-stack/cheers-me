-- Migration 061: Add metadata column to clock_in_out for geolocation data (Feature #40)
ALTER TABLE clock_in_out ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL
