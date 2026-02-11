/**
 * Conversation Service
 * CRUD operations for AI conversations, messages, and pending actions.
 * Uses the service-role client for server-side operations.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type {
  Conversation,
  ConversationWithMessages,
  ConversationSummary,
  ConversationMessage,
  SaveMessageInput,
  CreatePendingActionInput,
  DBPendingAction,
} from './types'

export function createConversationService(supabase: SupabaseClient) {
  return {
    async createConversation(
      userId: string,
      title?: string
    ): Promise<Conversation> {
      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({ user_id: userId, title: title || null })
        .select()
        .single()

      if (error) throw new Error(`Failed to create conversation: ${error.message}`)
      return data as Conversation
    },

    async getConversation(
      id: string,
      messageLimit = 50
    ): Promise<ConversationWithMessages> {
      const { data: conv, error: convError } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('id', id)
        .single()

      if (convError) throw new Error(`Conversation not found: ${convError.message}`)

      const { data: messages, error: msgError } = await supabase
        .from('ai_conversation_messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true })
        .limit(messageLimit)

      if (msgError) throw new Error(`Failed to load messages: ${msgError.message}`)

      return {
        ...(conv as Conversation),
        messages: (messages || []) as ConversationMessage[],
      }
    },

    async listConversations(
      userId: string,
      opts: { limit: number; offset: number } = { limit: 20, offset: 0 }
    ): Promise<ConversationSummary[]> {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('id, title, message_count, last_message_at, created_at')
        .eq('user_id', userId)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .range(opts.offset, opts.offset + opts.limit - 1)

      if (error) throw new Error(`Failed to list conversations: ${error.message}`)
      return (data || []) as ConversationSummary[]
    },

    async saveMessage(
      conversationId: string,
      message: SaveMessageInput
    ): Promise<ConversationMessage> {
      const { data, error } = await supabase
        .from('ai_conversation_messages')
        .insert({
          conversation_id: conversationId,
          role: message.role,
          content: message.content,
          tools_used: message.tools_used || null,
          pending_action_id: message.pending_action_id || null,
          token_usage: message.token_usage || null,
          metadata: message.metadata || {},
        })
        .select()
        .single()

      if (error) throw new Error(`Failed to save message: ${error.message}`)

      // Update conversation last_message_at
      await supabase
        .from('ai_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)

      return data as ConversationMessage
    },

    async updateConversation(
      id: string,
      updates: Partial<Pick<Conversation, 'title' | 'summary' | 'metadata' | 'pinned'>>
    ): Promise<void> {
      const { error } = await supabase
        .from('ai_conversations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw new Error(`Failed to update conversation: ${error.message}`)
    },

    async deleteConversation(id: string): Promise<void> {
      const { error } = await supabase
        .from('ai_conversations')
        .delete()
        .eq('id', id)

      if (error) throw new Error(`Failed to delete conversation: ${error.message}`)
    },

    // ============================================
    // Pending Actions
    // ============================================

    async createPendingAction(
      input: CreatePendingActionInput
    ): Promise<DBPendingAction> {
      const { data, error } = await supabase
        .from('ai_pending_actions')
        .insert({
          user_id: input.user_id,
          conversation_id: input.conversation_id || null,
          tool_name: input.tool_name,
          parameters: input.parameters,
          description: input.description,
          expires_at: input.expires_at,
        })
        .select()
        .single()

      if (error) throw new Error(`Failed to create pending action: ${error.message}`)
      return data as DBPendingAction
    },

    async getPendingAction(actionId: string): Promise<DBPendingAction | null> {
      const { data, error } = await supabase
        .from('ai_pending_actions')
        .select('*')
        .eq('id', actionId)
        .eq('status', 'pending')
        .single()

      if (error) return null
      return data as DBPendingAction
    },

    async resolvePendingAction(
      actionId: string,
      status: 'confirmed' | 'rejected'
    ): Promise<void> {
      const { error } = await supabase
        .from('ai_pending_actions')
        .update({
          status,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', actionId)

      if (error) throw new Error(`Failed to resolve pending action: ${error.message}`)
    },

    async cleanupExpiredActions(): Promise<void> {
      await supabase
        .from('ai_pending_actions')
        .update({ status: 'expired', resolved_at: new Date().toISOString() })
        .eq('status', 'pending')
        .lt('expires_at', new Date().toISOString())
    },

    async getMessagesPaginated(
      conversationId: string,
      opts: { limit: number; offset: number } = { limit: 50, offset: 0 }
    ): Promise<ConversationMessage[]> {
      const { data, error } = await supabase
        .from('ai_conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .range(opts.offset, opts.offset + opts.limit - 1)

      if (error) throw new Error(`Failed to load messages: ${error.message}`)
      return (data || []) as ConversationMessage[]
    },
  }
}

export type ConversationService = ReturnType<typeof createConversationService>
