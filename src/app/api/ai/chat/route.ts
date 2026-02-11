import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chat, Anthropic } from '@/lib/ai/claude'
import { executeTool } from '@/lib/ai/tools'
import { buildSystemPrompt } from '@/lib/ai/system-prompt-builder'
import { getToolsForRole, isToolAllowed } from '@/lib/ai/tool-access'
import { createConversationService } from '@/lib/ai/conversation-service'
import { WRITE_TOOLS, PENDING_ACTION_TTL } from '@/lib/ai/types'
import type { UserRole, PromptContext } from '@/lib/ai/types'
import { executeWriteTool } from '@/lib/ai/write-tools'
import { validateWriteToolInput } from '@/lib/ai/write-tool-validation'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get cookie string for forwarding to internal API calls
    const cookie = request.headers.get('cookie') || ''

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role, language')
      .eq('id', user.id)
      .single()

    const userRole = (profile?.role || 'waiter') as UserRole
    const userName = profile?.full_name || 'User'
    const userLang = profile?.language || 'en'

    const service = createConversationService(supabase)
    service.cleanupExpiredActions().catch(() => {})

    // Parse request body
    const body = await request.json()
    const {
      message,
      conversation_id,
      messages: conversationHistory,
      confirm_action,
      reject_action,
    } = body

    // ============================================
    // Handle action confirmation (DB-based)
    // ============================================
    if (confirm_action) {
      const pending = await service.getPendingAction(confirm_action)
      if (!pending) {
        return NextResponse.json({
          response: 'This action has expired or was already processed. Please try again.',
          conversation_id: conversation_id || crypto.randomUUID(),
          tools_used: [],
          stop_reason: 'end_turn',
        })
      }

      if (pending.user_id !== user.id) {
        return NextResponse.json({ error: 'Unauthorized action' }, { status: 403 })
      }

      const result = await executeWriteTool(pending.tool_name, pending.parameters as Record<string, unknown>, cookie)
      await service.resolvePendingAction(confirm_action, 'confirmed')

      try {
        await supabase.from('ai_audit_log').insert({
          user_id: user.id,
          tool_name: pending.tool_name,
          parameters: pending.parameters,
          result,
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
      } catch (auditError) {
        console.error('Audit log error:', auditError)
      }

      const hasError = result && typeof result === 'object' && 'error' in (result as Record<string, unknown>)

      return NextResponse.json({
        response: hasError
          ? `The action failed: ${(result as Record<string, unknown>).error}. Please check the details and try again.`
          : `Action completed successfully. ${pending.description} has been executed.`,
        conversation_id: conversation_id || crypto.randomUUID(),
        tools_used: [pending.tool_name],
        stop_reason: 'end_turn',
        action_result: result,
      })
    }

    // ============================================
    // Handle action rejection (DB-based)
    // ============================================
    if (reject_action) {
      const pending = await service.getPendingAction(reject_action)
      if (pending) {
        await service.resolvePendingAction(reject_action, 'rejected')
        try {
          await supabase.from('ai_audit_log').insert({
            user_id: user.id,
            tool_name: pending.tool_name,
            parameters: pending.parameters,
            result: null,
            status: 'rejected',
          })
        } catch (auditError) {
          console.error('Audit log error:', auditError)
        }
      }

      return NextResponse.json({
        response: 'Action cancelled. Let me know if you\'d like to modify the request or do something else.',
        conversation_id: conversation_id || crypto.randomUUID(),
        tools_used: [],
        stop_reason: 'end_turn',
      })
    }

    // ============================================
    // Normal message flow
    // ============================================
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      )
    }

    // Build role-specific system prompt
    const now = new Date()
    const madridDate = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
    const madridTime = now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' })
    const madridTimeOnly = new Date(madridTime).toLocaleTimeString('en-US', { hour12: false })

    const promptCtx: PromptContext = {
      userName,
      role: userRole,
      language: userLang,
      currentDate: madridDate,
      currentTime: madridTimeOnly,
    }
    const systemPrompt = buildSystemPrompt(promptCtx)
    const tools = getToolsForRole(userRole)

    // Build messages array with conversation history (last 20 messages)
    const messages: Anthropic.MessageParam[] = []

    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-20)
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content,
          })
        }
      }
    }

    // Add the current user message
    messages.push({ role: 'user', content: message })

    // Call Claude with role-specific tools
    let response = await chat(messages, systemPrompt, tools)

    // Handle tool use loop
    const toolsUsed: string[] = []
    let iterationCount = 0
    const MAX_ITERATIONS = 5
    let pendingActionResponse: { id: string; tool: string; description: string; parameters: Record<string, unknown> } | null = null

    while (response.stop_reason === 'tool_use' && iterationCount < MAX_ITERATIONS) {
      iterationCount++

      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      )

      if (toolUseBlocks.length === 0) break

      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block) => {
          // Check role access
          if (!isToolAllowed(userRole, block.name)) {
            return {
              type: 'tool_result' as const,
              tool_use_id: block.id,
              content: JSON.stringify({ error: `Access denied for tool: ${block.name}` }),
            }
          }

          toolsUsed.push(block.name)

          try {
            if (WRITE_TOOLS.has(block.name)) {
              const params = block.input as Record<string, unknown>

              const validation = validateWriteToolInput(block.name, params)
              if (!validation.valid) {
                return {
                  type: 'tool_result' as const,
                  tool_use_id: block.id,
                  content: JSON.stringify({
                    error: `Validation failed: ${validation.error}`,
                    requires_confirmation: false,
                  }),
                }
              }

              // Create pending action in DB
              const expiresAt = new Date(Date.now() + PENDING_ACTION_TTL).toISOString()
              const pending = await service.createPendingAction({
                user_id: user.id,
                conversation_id: conversation_id,
                tool_name: block.name,
                parameters: params,
                description: `${block.name.replace(/_/g, ' ')}`,
                expires_at: expiresAt,
              })

              pendingActionResponse = {
                id: pending.id,
                tool: pending.tool_name,
                description: pending.description || '',
                parameters: params,
              }

              return {
                type: 'tool_result' as const,
                tool_use_id: block.id,
                content: JSON.stringify({
                  requires_confirmation: true,
                  action_id: pending.id,
                  description: pending.description,
                  parameters: params,
                  message: 'This action requires user confirmation before it can be executed.',
                }),
              }
            }

            // Read tool - execute normally
            const result = await executeTool(block.name, block.input as Record<string, unknown>)
            return {
              type: 'tool_result' as const,
              tool_use_id: block.id,
              content: JSON.stringify(result),
            }
          } catch (error) {
            console.error(`Tool execution error for ${block.name}:`, error)
            return {
              type: 'tool_result' as const,
              tool_use_id: block.id,
              content: JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error'
              }),
            }
          }
        })
      )

      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: toolResults })

      response = await chat(messages, systemPrompt, tools)
    }

    // Extract text response
    const textContent = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n')

    console.log('Claude API usage:', {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      tools_used: toolsUsed,
    })

    // Build response
    const jsonResponse: Record<string, unknown> = {
      response: textContent,
      conversation_id: conversation_id || crypto.randomUUID(),
      tools_used: toolsUsed,
      stop_reason: response.stop_reason,
    }

    if (pendingActionResponse) {
      jsonResponse.pending_action = pendingActionResponse
    }

    return NextResponse.json(jsonResponse)

  } catch (error) {
    console.error('AI chat error:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
