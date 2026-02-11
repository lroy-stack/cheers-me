import type { Artifact } from '../types'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface SubAgentContext {
  userId: string
  conversationId: string
  supabase: SupabaseClient
  taskId: string
  startTime: number
}

export type SubAgentToolHandler = (
  toolName: string,
  toolInput: Record<string, unknown>,
  context: SubAgentContext
) => Promise<unknown>

export interface SubAgentConfig {
  name: string
  model: string
  systemPrompt: string
  maxIterations: number
  maxTokens: number
  tools: SubAgentTool[]
  toolHandler?: SubAgentToolHandler
}

export interface SubAgentTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export interface PendingWrite {
  tool_name: string
  parameters: Record<string, unknown>
  description: string
}

export interface SubAgentResult {
  success: boolean
  content: string
  artifacts?: Artifact[]
  error?: string
  tokenUsage?: { input_tokens: number; output_tokens: number }
  durationMs?: number
  /** Write operations that need user confirmation before executing */
  pendingWrites?: PendingWrite[]
}

export type ProgressCallback = (step: string) => void
