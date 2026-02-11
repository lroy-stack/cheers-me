-- Migration 037: Token usage tracking, cost management, tool audit, artifact versioning
-- Supports: daily aggregates, conversation-level totals, tool execution audit, artifact versions

-- ============================================
-- Daily usage aggregates
-- ============================================
CREATE TABLE IF NOT EXISTS ai_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles ON DELETE CASCADE,
  date DATE NOT NULL,
  model VARCHAR(50) NOT NULL,
  input_tokens BIGINT DEFAULT 0,
  output_tokens BIGINT DEFAULT 0,
  cache_write_tokens BIGINT DEFAULT 0,
  cache_read_tokens BIGINT DEFAULT 0,
  cost_usd NUMERIC(10,6) DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, model)
);

-- ============================================
-- Conversation-level token tracking
-- ============================================
ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS total_tokens BIGINT DEFAULT 0;
ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS estimated_cost_usd NUMERIC(10,6) DEFAULT 0;

-- ============================================
-- Tool execution audit log
-- ============================================
CREATE TABLE IF NOT EXISTS ai_tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles ON DELETE CASCADE,
  conversation_id UUID REFERENCES ai_conversations ON DELETE SET NULL,
  tool_name TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Search cache RLS fix
-- ============================================
DO $$ BEGIN
  ALTER TABLE ai_search_cache ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles;
EXCEPTION WHEN undefined_table THEN
  -- Table doesn't exist yet, skip
END $$;

DO $$ BEGIN
  ALTER TABLE ai_search_cache ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "users_own_cache" ON ai_search_cache FOR ALL USING (user_id = auth.uid());
EXCEPTION WHEN undefined_table THEN NULL;
WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- Atomic upsert for daily usage
-- ============================================
CREATE OR REPLACE FUNCTION upsert_daily_usage(
  p_user_id UUID,
  p_date DATE,
  p_model VARCHAR,
  p_input BIGINT,
  p_output BIGINT,
  p_cache_write BIGINT,
  p_cache_read BIGINT,
  p_cost NUMERIC
) RETURNS VOID AS $$
BEGIN
  INSERT INTO ai_usage_daily (user_id, date, model, input_tokens, output_tokens,
    cache_write_tokens, cache_read_tokens, cost_usd, message_count)
  VALUES (p_user_id, p_date, p_model, p_input, p_output, p_cache_write, p_cache_read, p_cost, 1)
  ON CONFLICT (user_id, date, model) DO UPDATE SET
    input_tokens = ai_usage_daily.input_tokens + EXCLUDED.input_tokens,
    output_tokens = ai_usage_daily.output_tokens + EXCLUDED.output_tokens,
    cache_write_tokens = ai_usage_daily.cache_write_tokens + EXCLUDED.cache_write_tokens,
    cache_read_tokens = ai_usage_daily.cache_read_tokens + EXCLUDED.cache_read_tokens,
    cost_usd = ai_usage_daily.cost_usd + EXCLUDED.cost_usd,
    message_count = ai_usage_daily.message_count + 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Artifact versioning
-- ============================================
DO $$ BEGIN
  ALTER TABLE ai_artifacts ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES ai_artifacts;
EXCEPTION WHEN undefined_table THEN
  -- ai_artifacts may not exist yet; it's created in migration 035
  NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX idx_artifacts_identifier ON ai_artifacts(identifier);
EXCEPTION WHEN undefined_table THEN NULL;
WHEN undefined_column THEN NULL;
WHEN duplicate_table THEN NULL;
END $$;

-- ============================================
-- RLS policies
-- ============================================
ALTER TABLE ai_usage_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_view_own_usage" ON ai_usage_daily FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "system_inserts_usage" ON ai_usage_daily FOR INSERT WITH CHECK (true);

ALTER TABLE ai_tool_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_view_own_exec" ON ai_tool_executions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "system_inserts_exec" ON ai_tool_executions FOR INSERT WITH CHECK (true);
