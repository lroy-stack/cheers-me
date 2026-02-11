-- ============================================================================
-- GrandCafe Cheers — Meta Graph API Integration Enhancements
-- Adds error tracking and engagement metrics to social_posts table
-- Version: 0.1.0
-- ============================================================================

-- ============================================================================
-- ALTER social_posts TABLE
-- ============================================================================

-- Add error_message column for tracking publishing failures
ALTER TABLE social_posts
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add engagement_rate column for calculated engagement percentage
ALTER TABLE social_posts
ADD COLUMN IF NOT EXISTS engagement_rate NUMERIC(5, 2) DEFAULT 0;

-- Rename caption/hashtags columns to content_text for consistency
-- (Only if they exist in old schema)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_posts' AND column_name = 'caption'
  ) THEN
    ALTER TABLE social_posts RENAME COLUMN caption TO content_text;
  END IF;
END $$;

-- Remove hashtags column if it exists (we now include hashtags in content_text)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'social_posts' AND column_name = 'hashtags'
  ) THEN
    ALTER TABLE social_posts DROP COLUMN hashtags;
  END IF;
END $$;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for filtering by error state
CREATE INDEX IF NOT EXISTS idx_social_posts_error_message
ON social_posts(error_message)
WHERE error_message IS NOT NULL;

-- Index for sorting by engagement rate
CREATE INDEX IF NOT EXISTS idx_social_posts_engagement_rate
ON social_posts(engagement_rate DESC)
WHERE engagement_rate > 0;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN social_posts.error_message IS 'Error message from Meta API if post publishing failed';
COMMENT ON COLUMN social_posts.engagement_rate IS 'Calculated engagement rate percentage: (likes + comments + shares) / reach * 100';
COMMENT ON COLUMN social_posts.platform_post_id IS 'Post ID from Meta API (Instagram Media ID or Facebook Post ID)';
COMMENT ON COLUMN social_posts.content_text IS 'Post caption/text content including hashtags';

-- ============================================================================
-- FUNCTION: Calculate engagement rate automatically
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_engagement_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate if reach > 0
  IF NEW.reach > 0 THEN
    NEW.engagement_rate := ROUND(
      ((COALESCE(NEW.likes, 0) + COALESCE(NEW.comments, 0) + COALESCE(NEW.shares, 0))::NUMERIC / NEW.reach * 100),
      2
    );
  ELSE
    NEW.engagement_rate := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate engagement_rate on insert/update
DROP TRIGGER IF EXISTS social_posts_calculate_engagement ON social_posts;
CREATE TRIGGER social_posts_calculate_engagement
BEFORE INSERT OR UPDATE OF likes, comments, shares, reach ON social_posts
FOR EACH ROW
EXECUTE FUNCTION calculate_engagement_rate();

-- ============================================================================
-- SAMPLE DATA FOR TESTING (Optional - comment out for production)
-- ============================================================================

-- Uncomment to insert test data
-- INSERT INTO content_calendar (title, description, platform, status, language, scheduled_date)
-- VALUES
--   ('Welcome to Summer Season 🌞', 'Announcing our summer hours and special events', 'multi', 'draft', 'en', NOW() + INTERVAL '1 day'),
--   ('Craft Beer Thursday 🍺', 'Featuring 22 craft beers on tap!', 'instagram', 'draft', 'nl', NOW() + INTERVAL '2 days');
