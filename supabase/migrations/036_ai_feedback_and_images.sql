-- Migration 036: AI Feedback + Generated Images
-- Adds tables for message feedback and AI-generated images

-- ============================================
-- AI Message Feedback
-- ============================================
CREATE TABLE IF NOT EXISTS ai_message_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES ai_conversation_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating VARCHAR(10) NOT NULL CHECK (rating IN ('positive', 'negative')),
  reason VARCHAR(50),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_message_feedback_message ON ai_message_feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_ai_message_feedback_user ON ai_message_feedback(user_id);

ALTER TABLE ai_message_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own feedback"
  ON ai_message_feedback
  FOR ALL
  USING (user_id = auth.uid());

-- ============================================
-- AI Generated Images
-- ============================================
CREATE TABLE IF NOT EXISTS ai_generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  purpose VARCHAR(50),
  storage_path TEXT NOT NULL,
  public_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_generated_images_user ON ai_generated_images(user_id);

ALTER TABLE ai_generated_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own images"
  ON ai_generated_images
  FOR ALL
  USING (user_id = auth.uid());

-- ============================================
-- Storage bucket for AI generated images
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-generated-images', 'ai-generated-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own AI images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'ai-generated-images'
    AND auth.uid()::text = (string_to_array(name, '/'))[2]
  );

CREATE POLICY "Public read AI images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'ai-generated-images');
