/**
 * AI Assistant Types
 * Types for conversations, messages, pending actions, streaming, role-based access,
 * model selection, sub-agents, artifacts, and file attachments.
 */

// ============================================
// Model types
// ============================================

export type ModelId = 'claude-haiku-4-5-20251001' | 'claude-sonnet-4-5-20250929'

export interface ModelSelection {
  model: ModelId
  reason: string
  isOverride: boolean
}

// ============================================
// Artifact types
// ============================================

export type ArtifactType = 'html' | 'chart' | 'table' | 'mermaid' | 'calendar' | 'pdf' | 'code' | 'form'

export interface Artifact {
  id: string
  type: ArtifactType
  title?: string
  content: string
}

// ============================================
// File attachment types
// ============================================

export interface FileAttachment {
  id: string
  filename: string
  mimeType: string
  fileSize: number
  processedContent?: string
  /** base64 for images */
  base64?: string
}

// ============================================
// Sub-agent types
// ============================================

export type SubAgentType = 'document_generator' | 'web_researcher' | 'schedule_optimizer' | 'compliance_auditor' | 'financial_reporter' | 'marketing_campaign' | 'sports_events' | 'advertising_manager' | 'cocktail_specialist'

export interface SubAgentEvent {
  agent: SubAgentType
  task?: string
  step?: string
  success?: boolean
  artifacts?: Artifact[]
  error?: string
}

// ============================================
// Database entity types
// ============================================

export interface Conversation {
  id: string
  user_id: string
  title: string | null
  summary: string | null
  message_count: number
  last_message_at: string | null
  pinned: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ConversationMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  tools_used: string[] | null
  pending_action_id: string | null
  token_usage: { input_tokens: number; output_tokens: number } | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface ConversationSummary {
  id: string
  title: string | null
  message_count: number
  last_message_at: string | null
  pinned: boolean
  created_at: string
}

export interface ConversationWithMessages extends Conversation {
  messages: ConversationMessage[]
}

export interface DBPendingAction {
  id: string
  user_id: string
  conversation_id: string | null
  tool_name: string
  parameters: Record<string, unknown>
  description: string | null
  status: 'pending' | 'confirmed' | 'rejected' | 'expired'
  created_at: string
  expires_at: string
  resolved_at: string | null
}

// ============================================
// Streaming / SSE types
// ============================================

export type SSEEventType =
  | 'message_start'
  | 'content_delta'
  | 'tool_use'
  | 'tool_result'
  | 'pending_action'
  | 'message_done'
  | 'error'
  | 'subagent_start'
  | 'subagent_progress'
  | 'subagent_done'
  | 'artifact'

export interface SSEEvent {
  event: SSEEventType
  data: unknown
}

// ============================================
// System prompt context
// ============================================

export type UserRole = 'admin' | 'owner' | 'manager' | 'kitchen' | 'bar' | 'waiter' | 'dj'

export interface PromptContext {
  userName: string
  role: UserRole
  language: string
  currentDate: string
  currentTime: string
  dynamicContext?: string
}

// ============================================
// Chat types (client-side)
// ============================================

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  tools_used?: string[]
  pending_action?: {
    id: string
    tool: string
    description: string
    parameters: Record<string, unknown>
  }
  activeTools?: string[]
  model_used?: string
  model_reason?: string
  artifacts?: Artifact[]
  attachments?: FileAttachment[]
  subAgentEvent?: SubAgentEvent
  timestamp: Date
}

export interface ChatResponse {
  response: string
  conversation_id: string
  tools_used: string[]
  stop_reason: string
  pending_action?: {
    id: string
    tool: string
    description: string
    parameters: Record<string, unknown>
  }
}

// ============================================
// Service input types
// ============================================

export interface SaveMessageInput {
  role: 'user' | 'assistant'
  content: string
  tools_used?: string[]
  pending_action_id?: string
  token_usage?: { input_tokens: number; output_tokens: number }
  metadata?: Record<string, unknown>
}

export interface CreatePendingActionInput {
  user_id: string
  conversation_id?: string
  tool_name: string
  parameters: Record<string, unknown>
  description: string
  expires_at: string
}

// ============================================
// Tool classification (shared between server & access control)
// ============================================

export const WRITE_TOOLS = new Set([
  'create_shift',
  'update_shift',
  'delete_shift',
  'approve_leave_request',
  'update_employee',
  'create_reservation',
  'update_reservation_status',
  'assign_table',
  'create_event',
  'update_event',
  'record_stock_movement',
  'create_purchase_order',
  'record_daily_sales',
  'record_expense',
  'close_register',
  'save_tax_declaration',
  'create_task_from_template',
  'create_task',
  'update_task_status',
  'create_leave_request',
  'batch_create_events',
  'batch_sync_schedule',
  'batch_sync_task_plan',
  'publish_schedule',
  'publish_task_plan',
  'export_schedule_excel',
  'export_task_plan_excel',
  'create_ad',
  'update_ad',
  'validate_coupon',
  'create_planned_task',
  'update_planned_task',
  'assign_zone',
  'export_task_plan',
])

export const READ_TOOLS = new Set([
  'query_sales',
  'get_stock_levels',
  'get_staff_schedule',
  'get_reservations',
  'generate_social_post',
  'draft_newsletter',
  'get_events',
  'query_financials',
  'get_reviews',
  'draft_review_reply',
  'suggest_schedule',
  'predict_demand',
  'analyze_trends',
  'compare_periods',
  'employee_performance',
  'profit_analysis',
  'query_tax_data',
  'generate_tax_form_url',
  'get_cocktail_recipe',
  'get_cocktail_cost',
  'search_cocktails_by_ingredient',
  'get_cocktail_preparation_guide',
  'suggest_cocktail',
  'get_training_guide',
  'get_training_compliance',
  'get_task_templates',
  'get_overdue_tasks',
  'get_business_resource',
  'generate_image',
  'get_employees',
  'get_employee_details',
  'get_leave_requests',
  'get_employee_availability',
  'get_schedule_plans',
  'export_to_excel',
  'get_ads',
  'get_coupons',
  'delegate_advertising_manager',
  'delegate_cocktail_specialist',
  'get_weekly_task_plan',
  'get_zone_assignments',
  'get_floor_sections',
])

/**
 * TTL for pending actions (5 minutes)
 */
export const PENDING_ACTION_TTL = 5 * 60 * 1000
