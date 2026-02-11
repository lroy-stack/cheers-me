-- Migration 035: AI Assistant v3
-- Adds: artifacts, file attachments, sub-agent tracking, generated documents, search cache
-- Modifies: ai_conversation_messages (model_used), ai_conversations (pinned)

-- ============================================
-- Column additions
-- ============================================

-- Model used per message (Haiku/Sonnet)
ALTER TABLE ai_conversation_messages ADD COLUMN IF NOT EXISTS model_used VARCHAR(50);

-- Pin conversations
ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE;

-- ============================================
-- Artifacts table
-- ============================================

CREATE TABLE IF NOT EXISTS ai_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES ai_conversations ON DELETE CASCADE,
  message_id UUID REFERENCES ai_conversation_messages ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversation artifacts"
  ON ai_artifacts FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM ai_conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert artifacts to own conversations"
  ON ai_artifacts FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM ai_conversations WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_ai_artifacts_conversation ON ai_artifacts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_artifacts_type ON ai_artifacts(type);

-- ============================================
-- File attachments table
-- ============================================

CREATE TABLE IF NOT EXISTS ai_file_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles ON DELETE CASCADE,
  conversation_id UUID REFERENCES ai_conversations ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT,
  processed_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_file_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own file attachments"
  ON ai_file_attachments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own file attachments"
  ON ai_file_attachments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own file attachments"
  ON ai_file_attachments FOR DELETE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_ai_file_attachments_user ON ai_file_attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_file_attachments_conversation ON ai_file_attachments(conversation_id);

-- ============================================
-- Sub-agent tasks table
-- ============================================

CREATE TABLE IF NOT EXISTS ai_subagent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES ai_conversations ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles ON DELETE CASCADE,
  agent_type VARCHAR(50) NOT NULL,
  task_params JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'running',
  result JSONB,
  artifacts JSONB DEFAULT '[]',
  model_used VARCHAR(100),
  token_usage JSONB,
  duration_ms INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE ai_subagent_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subagent tasks"
  ON ai_subagent_tasks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own subagent tasks"
  ON ai_subagent_tasks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own subagent tasks"
  ON ai_subagent_tasks FOR UPDATE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_ai_subagent_tasks_user ON ai_subagent_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_subagent_tasks_conversation ON ai_subagent_tasks(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_subagent_tasks_status ON ai_subagent_tasks(status) WHERE status = 'running';

-- ============================================
-- Generated documents table
-- ============================================

CREATE TABLE IF NOT EXISTS ai_generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES ai_subagent_tasks ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES profiles ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type VARCHAR(100) DEFAULT 'application/pdf',
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_generated_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generated documents"
  ON ai_generated_documents FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own generated documents"
  ON ai_generated_documents FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own generated documents"
  ON ai_generated_documents FOR DELETE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_ai_generated_documents_user ON ai_generated_documents(user_id);

-- ============================================
-- Search cache table
-- ============================================

CREATE TABLE IF NOT EXISTS ai_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT NOT NULL,
  research_type VARCHAR(50) NOT NULL,
  query TEXT NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_search_cache_hash ON ai_search_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_ai_search_cache_expires ON ai_search_cache(expires_at);

-- ============================================
-- Full-text search on conversation titles
-- ============================================

CREATE INDEX IF NOT EXISTS idx_ai_conv_title_gin
  ON ai_conversations USING gin(to_tsvector('english', COALESCE(title, '')));
