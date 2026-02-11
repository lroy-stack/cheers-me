-- ============================================================================
-- GrandCafe Cheers — Events & DJ Enhancement
-- Migration 012: Sports Events Support & Auto-Marketing Integration
-- ============================================================================

-- Add sports-specific columns to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS sport_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS home_team VARCHAR(255),
ADD COLUMN IF NOT EXISTS away_team VARCHAR(255),
ADD COLUMN IF NOT EXISTS broadcast_channel VARCHAR(100),
ADD COLUMN IF NOT EXISTS match_info TEXT;

-- Create index for filtering sports events
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- Add comment for clarity
COMMENT ON COLUMN events.sport_name IS 'Name of sport (e.g., Football, Rugby, F1)';
COMMENT ON COLUMN events.home_team IS 'Home team name for sports events';
COMMENT ON COLUMN events.away_team IS 'Away team name for sports events';
COMMENT ON COLUMN events.broadcast_channel IS 'TV channel broadcasting the event';
COMMENT ON COLUMN events.match_info IS 'Additional match details (league, tournament, etc.)';

-- ============================================================================
-- SOCIAL MEDIA DRAFT INTEGRATION
-- Add table for auto-generated marketing drafts linked to events
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_marketing_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events ON DELETE CASCADE,

  -- Social post draft
  social_caption TEXT,
  social_hashtags TEXT,
  suggested_platforms TEXT[],

  -- Newsletter mention draft
  newsletter_mention TEXT,

  -- Generation metadata
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved BOOLEAN DEFAULT false,
  published BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_event_marketing_drafts_event_id ON event_marketing_drafts(event_id);
CREATE INDEX IF NOT EXISTS idx_event_marketing_drafts_approved ON event_marketing_drafts(approved);

-- RLS for event_marketing_drafts
ALTER TABLE event_marketing_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view marketing drafts"
ON event_marketing_drafts FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'owner')
);

CREATE POLICY "Managers can insert marketing drafts"
ON event_marketing_drafts FOR INSERT
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

CREATE POLICY "Managers can update marketing drafts"
ON event_marketing_drafts FOR UPDATE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- ============================================================================
-- FUNCTION: Auto-update event_marketing_drafts.updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_event_marketing_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_marketing_drafts_updated_at
BEFORE UPDATE ON event_marketing_drafts
FOR EACH ROW
EXECUTE FUNCTION update_event_marketing_drafts_updated_at();

-- ============================================================================
-- REALTIME: Enable for events and music_requests
-- ============================================================================

-- Enable realtime for events table (so UI updates when DJ confirms/status changes)
-- Note: Check if already added in previous migration, this is idempotent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE events;
  END IF;
END $$;

-- Enable realtime for music_requests (live music queue for DJ interface)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'music_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE music_requests;
  END IF;
END $$;

-- Enable realtime for event_equipment_checklists (live checklist updates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'event_equipment_checklists'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE event_equipment_checklists;
  END IF;
END $$;
