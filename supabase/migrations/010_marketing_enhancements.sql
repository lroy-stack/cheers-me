-- ============================================================================
-- GrandCafe Cheers — Marketing & Social Media Enhancements
-- Adds missing RLS policies, triggers, and indexes for M7 module
-- Version: 0.1.0
-- ============================================================================

-- ============================================================================
-- ENABLE RLS ON MISSING TABLES
-- ============================================================================

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: Content Calendar
-- ============================================================================

-- Marketing staff (admin, manager) can read all content calendar entries
CREATE POLICY "Marketing staff can read content calendar"
ON content_calendar FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Marketing staff can create content calendar entries
CREATE POLICY "Marketing staff can create content"
ON content_calendar FOR INSERT
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Marketing staff can update content calendar entries
CREATE POLICY "Marketing staff can update content"
ON content_calendar FOR UPDATE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Marketing staff can delete content calendar entries
CREATE POLICY "Marketing staff can delete content"
ON content_calendar FOR DELETE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- ============================================================================
-- RLS POLICIES: Social Posts
-- ============================================================================

-- Marketing staff can read all social posts
CREATE POLICY "Marketing staff can read social posts"
ON social_posts FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Marketing staff can create social posts
CREATE POLICY "Marketing staff can create social posts"
ON social_posts FOR INSERT
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Marketing staff can update social posts (for syncing analytics)
CREATE POLICY "Marketing staff can update social posts"
ON social_posts FOR UPDATE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Marketing staff can delete social posts
CREATE POLICY "Marketing staff can delete social posts"
ON social_posts FOR DELETE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- ============================================================================
-- RLS POLICIES: Newsletters
-- ============================================================================

-- Marketing staff can read all newsletters
CREATE POLICY "Marketing staff can read newsletters"
ON newsletters FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Marketing staff can create newsletters
CREATE POLICY "Marketing staff can create newsletters"
ON newsletters FOR INSERT
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Marketing staff can update newsletters
CREATE POLICY "Marketing staff can update newsletters"
ON newsletters FOR UPDATE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Marketing staff can delete newsletters
CREATE POLICY "Marketing staff can delete newsletters"
ON newsletters FOR DELETE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- ============================================================================
-- RLS POLICIES: Newsletter Subscribers
-- ============================================================================

-- Marketing staff can read all subscribers
CREATE POLICY "Marketing staff can read subscribers"
ON newsletter_subscribers FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Anyone can subscribe (public signup form)
CREATE POLICY "Public can subscribe to newsletter"
ON newsletter_subscribers FOR INSERT
WITH CHECK (true);

-- Subscribers can update their own preferences (by email match, not auth)
-- Note: This will be handled via a server-side API route with a signed token
-- No direct UPDATE policy for anonymous users

-- Only marketing staff can delete subscribers (for GDPR compliance)
CREATE POLICY "Marketing staff can delete subscribers"
ON newsletter_subscribers FOR DELETE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- ============================================================================
-- TRIGGERS: Updated At Timestamps
-- ============================================================================

-- Trigger for content_calendar.updated_at
CREATE OR REPLACE FUNCTION update_content_calendar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER content_calendar_updated_at
BEFORE UPDATE ON content_calendar
FOR EACH ROW
EXECUTE FUNCTION update_content_calendar_updated_at();

-- Trigger for social_posts.updated_at
CREATE OR REPLACE FUNCTION update_social_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER social_posts_updated_at
BEFORE UPDATE ON social_posts
FOR EACH ROW
EXECUTE FUNCTION update_social_posts_updated_at();

-- Trigger for newsletters.updated_at
CREATE OR REPLACE FUNCTION update_newsletters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER newsletters_updated_at
BEFORE UPDATE ON newsletters
FOR EACH ROW
EXECUTE FUNCTION update_newsletters_updated_at();

-- ============================================================================
-- ADDITIONAL INDEXES FOR QUERY OPTIMIZATION
-- ============================================================================

-- Content calendar queries by date and status
CREATE INDEX IF NOT EXISTS idx_content_calendar_scheduled_date
ON content_calendar(scheduled_date)
WHERE scheduled_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_calendar_status
ON content_calendar(status);

CREATE INDEX IF NOT EXISTS idx_content_calendar_platform
ON content_calendar(platform)
WHERE platform IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_calendar_created_by
ON content_calendar(created_by);

-- Social posts queries by status and calendar reference
CREATE INDEX IF NOT EXISTS idx_social_posts_status
ON social_posts(status);

CREATE INDEX IF NOT EXISTS idx_social_posts_content_calendar_id
ON social_posts(content_calendar_id)
WHERE content_calendar_id IS NOT NULL;

-- Newsletter queries by status and scheduled date
CREATE INDEX IF NOT EXISTS idx_newsletters_status
ON newsletters(status);

CREATE INDEX IF NOT EXISTS idx_newsletters_scheduled_date
ON newsletters(scheduled_date)
WHERE scheduled_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_newsletters_segment
ON newsletters(segment)
WHERE segment IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_newsletters_created_by
ON newsletters(created_by);

-- Newsletter subscribers queries by language and active status
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_language
ON newsletter_subscribers(language);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_is_active
ON newsletter_subscribers(is_active)
WHERE is_active = true;

-- ============================================================================
-- REALTIME PUBLICATION (Optional, for live updates in UI)
-- ============================================================================

-- Enable realtime for social_posts to show live engagement metrics
-- Note: Uncomment if realtime is needed for this table
-- ALTER PUBLICATION supabase_realtime ADD TABLE social_posts;

-- Enable realtime for content_calendar to sync across devices
-- ALTER PUBLICATION supabase_realtime ADD TABLE content_calendar;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE content_calendar IS 'Marketing content calendar for planning social media posts and campaigns across platforms (Instagram, Facebook) and languages (NL/EN/ES)';
COMMENT ON TABLE social_posts IS 'Published social media posts with engagement metrics synced from Meta Graph API';
COMMENT ON TABLE newsletters IS 'Email newsletters sent via Resend API with audience segmentation';
COMMENT ON TABLE newsletter_subscribers IS 'Newsletter subscriber database with language preferences and subscription status';

COMMENT ON COLUMN content_calendar.platform IS 'Social platform: instagram, facebook, or multi for cross-posting';
COMMENT ON COLUMN content_calendar.status IS 'Post status: draft, scheduled, published, failed';
COMMENT ON COLUMN content_calendar.language IS 'Content language: nl (Dutch), en (English), es (Spanish)';

COMMENT ON COLUMN social_posts.platform_post_id IS 'External post ID from Meta API for syncing analytics';
COMMENT ON COLUMN social_posts.reach IS 'Number of unique accounts reached (from Meta Insights API)';

COMMENT ON COLUMN newsletters.segment IS 'Audience segment: all, vip, language_nl, language_en, language_es';
COMMENT ON COLUMN newsletters.recipient_count IS 'Number of emails sent in this campaign';

COMMENT ON COLUMN newsletter_subscribers.is_active IS 'False if unsubscribed, true if active subscription';
