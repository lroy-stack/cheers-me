-- AI Assistant v2: Persistence, Pending Actions, Indexes & RLS
-- Extends existing ai_conversations and ai_conversation_messages tables
-- Creates new ai_pending_actions table

-- ============================================
-- Extend ai_conversations
-- ============================================
ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;
ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;
ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- ============================================
-- Extend ai_conversation_messages
-- ============================================
ALTER TABLE ai_conversation_messages ADD COLUMN IF NOT EXISTS tools_used TEXT[];
ALTER TABLE ai_conversation_messages ADD COLUMN IF NOT EXISTS pending_action_id UUID;
ALTER TABLE ai_conversation_messages ADD COLUMN IF NOT EXISTS token_usage JSONB;
ALTER TABLE ai_conversation_messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- ============================================
-- Create ai_pending_actions table
-- ============================================
CREATE TABLE IF NOT EXISTS ai_pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles ON DELETE CASCADE,
  conversation_id UUID REFERENCES ai_conversations ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  parameters JSONB NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created ON ai_conversation_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_pending_user ON ai_pending_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_pending_status ON ai_pending_actions(status) WHERE status = 'pending';

-- ============================================
-- RLS: ai_conversations
-- ============================================
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ai_conversations_select_own' AND tablename = 'ai_conversations') THEN
    CREATE POLICY ai_conversations_select_own ON ai_conversations FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ai_conversations_insert_own' AND tablename = 'ai_conversations') THEN
    CREATE POLICY ai_conversations_insert_own ON ai_conversations FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ai_conversations_update_own' AND tablename = 'ai_conversations') THEN
    CREATE POLICY ai_conversations_update_own ON ai_conversations FOR UPDATE USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ai_conversations_delete_own' AND tablename = 'ai_conversations') THEN
    CREATE POLICY ai_conversations_delete_own ON ai_conversations FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================
-- RLS: ai_conversation_messages
-- ============================================
ALTER TABLE ai_conversation_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ai_messages_select_own' AND tablename = 'ai_conversation_messages') THEN
    CREATE POLICY ai_messages_select_own ON ai_conversation_messages FOR SELECT
      USING (conversation_id IN (SELECT id FROM ai_conversations WHERE user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ai_messages_insert_own' AND tablename = 'ai_conversation_messages') THEN
    CREATE POLICY ai_messages_insert_own ON ai_conversation_messages FOR INSERT
      WITH CHECK (conversation_id IN (SELECT id FROM ai_conversations WHERE user_id = auth.uid()));
  END IF;
END $$;

-- ============================================
-- RLS: ai_pending_actions
-- ============================================
ALTER TABLE ai_pending_actions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ai_pending_select_own' AND tablename = 'ai_pending_actions') THEN
    CREATE POLICY ai_pending_select_own ON ai_pending_actions FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ai_pending_insert_own' AND tablename = 'ai_pending_actions') THEN
    CREATE POLICY ai_pending_insert_own ON ai_pending_actions FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ai_pending_update_own' AND tablename = 'ai_pending_actions') THEN
    CREATE POLICY ai_pending_update_own ON ai_pending_actions FOR UPDATE USING (user_id = auth.uid());
  END IF;
END $$;
