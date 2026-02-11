import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, Anthropic, buildCachedParams } from '@/lib/ai/claude'
import { executeTool } from '@/lib/ai/tools'
import { executeWriteTool } from '@/lib/ai/write-tools'
import { validateWriteToolInput } from '@/lib/ai/write-tool-validation'
import { buildSystemPrompt } from '@/lib/ai/system-prompt-builder'
import { getToolsForRole, isToolAllowed } from '@/lib/ai/tool-access'
import { resolveContext } from '@/lib/ai/context-resolvers'
import { createConversationService } from '@/lib/ai/conversation-service'
import { selectModel } from '@/lib/ai/model-router'
import { executeSubAgentTool } from '@/lib/ai/sub-agents'
import type { PendingWrite } from '@/lib/ai/sub-agents/types'
import { WRITE_TOOLS, PENDING_ACTION_TTL } from '@/lib/ai/types'
import type { UserRole, PromptContext, ModelId, FileAttachment } from '@/lib/ai/types'
import { calculateCost, calculateCacheHitRate, formatCost } from '@/lib/ai/cost-calculator'
import { parseArtifacts } from '@/lib/ai/artifact-parser'

// Vercel timeout config for long-running AI streaming
export const maxDuration = 60 // seconds

const SUB_AGENT_TOOLS = new Set([
  'delegate_document_generator', 'delegate_web_researcher', 'delegate_schedule_optimizer',
  'delegate_compliance_auditor', 'delegate_financial_reporter', 'delegate_marketing_campaign',
  'delegate_sports_events', 'delegate_advertising_manager', 'delegate_cocktail_specialist',
])

// ============================================
// Rate limiter (in-memory, per-user)
// ============================================
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60_000 // 1 minute
const RATE_LIMIT_MAX = 20 // 20 req/min for chat
// Phase 6: DELEGATION_RATE_LIMIT_MAX = 5 req/min for delegation tools

function checkRateLimit(userId: string, limit: number = RATE_LIMIT_MAX): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

function sseEncode(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Rate limit check
  if (!checkRateLimit(user.id)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again in a minute.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    })
  }

  const cookie = request.headers.get('cookie') || ''

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const {
    message,
    conversation_id: existingConvId,
    confirm_action,
    reject_action,
    model_override,
    attachments: rawAttachments,
  } = body as {
    message?: string
    conversation_id?: string
    confirm_action?: string
    reject_action?: string
    model_override?: string
    attachments?: FileAttachment[]
  }

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

  // ============================================
  // Handle confirm/reject (non-streaming)
  // ============================================
  if (confirm_action || reject_action) {
    return handleActionResponse(
      confirm_action || reject_action || '',
      !!confirm_action,
      user.id,
      existingConvId || '',
      service,
      supabase,
      cookie
    )
  }

  // ============================================
  // Streaming message flow
  // ============================================
  if (!message || typeof message !== 'string') {
    return new Response(JSON.stringify({ error: 'Message is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Verify conversation ownership if existing ID provided
  let conversationId = existingConvId
  if (conversationId) {
    const { data: convCheck } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (!convCheck) {
      // Not found or not owned — create new
      conversationId = undefined
    }
  }

  if (!conversationId) {
    const conv = await service.createConversation(user.id, message.slice(0, 100))
    conversationId = conv.id
  }

  // Save user message
  await service.saveMessage(conversationId, { role: 'user', content: message })

  // Load conversation history from DB
  const convData = await service.getConversation(conversationId, 40)
  const historyMessages: Anthropic.MessageParam[] = convData.messages
    .slice(0, -1)
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

  // Build current user message content (may include file attachments)
  type InputBlock =
    | { type: 'text'; text: string }
    | { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'; data: string } }
  const userContent: InputBlock[] = []

  // Add image attachments as vision content blocks
  if (rawAttachments && rawAttachments.length > 0) {
    for (const att of rawAttachments) {
      if (att.base64 && att.mimeType.startsWith('image/')) {
        userContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: att.mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
            data: att.base64,
          },
        })
      } else if (att.processedContent) {
        userContent.push({
          type: 'text',
          text: `[Attached file: ${att.filename}]\n${att.processedContent}`,
        })
      }
    }
  }

  userContent.push({ type: 'text', text: message })
  historyMessages.push({ role: 'user', content: userContent })

  // Model selection
  const modelSelection = selectModel(message, model_override as ModelId | undefined)
  const selectedModel = modelSelection.model

  // Build role-specific tools and prompt
  const tools = getToolsForRole(userRole)
  const now = new Date()
  const madridDate = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
  const madridTimeOnly = now.toLocaleTimeString('en-GB', { timeZone: 'Europe/Madrid', hour12: false })

  // Resolve dynamic context
  const dynamicContext = await resolveContext(message, userRole, supabase)

  const promptCtx: PromptContext = {
    userName,
    role: userRole,
    language: userLang,
    currentDate: madridDate,
    currentTime: madridTimeOnly,
    // Dynamic context is now passed separately to buildCachedParams for its own cache breakpoint
  }
  const systemPrompt = buildSystemPrompt(promptCtx)

  // Final conversationId for use in closure
  const finalConvId = conversationId

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      console.log('[SSE] Stream opened', {
        conversationId: finalConvId,
        model: selectedModel,
        userId: user.id
      })

      try {
        controller.enqueue(encoder.encode(
          sseEncode('message_start', {
            conversation_id: finalConvId,
            model: selectedModel,
            model_reason: modelSelection.reason,
          })
        ))

        let messages = historyMessages
        const toolsUsed: string[] = []
        let iterationCount = 0
        const MAX_ITERATIONS = 5
        let pendingActionId: string | undefined
        let pendingActionPayload: Record<string, unknown> | null = null
        let totalInputTokens = 0
        let totalOutputTokens = 0
        let totalCacheWriteTokens = 0
        let totalCacheReadTokens = 0
        // Accumulate ALL text across iterations
        let fullAssistantText = ''

        let continueLoop = true
        while (continueLoop && iterationCount <= MAX_ITERATIONS) {
          iterationCount++

          const params = buildCachedParams(systemPrompt, tools, messages, selectedModel, dynamicContext || undefined)

          const streamResponse = anthropic.messages.stream({
            ...params,
            model: params.model as 'claude-haiku-4-5-20251001',
          })

          const finalMessage = await new Promise<Anthropic.Message>((resolve, reject) => {
            streamResponse.on('text', (text) => {
              fullAssistantText += text
              controller.enqueue(encoder.encode(
                sseEncode('content_delta', { text })
              ))
            })

            streamResponse.on('message', (msg) => {
              resolve(msg)
            })

            streamResponse.on('error', (err) => {
              reject(err)
            })
          })

          totalInputTokens += finalMessage.usage.input_tokens
          totalOutputTokens += finalMessage.usage.output_tokens
          totalCacheWriteTokens += (finalMessage.usage as unknown as Record<string, number>).cache_creation_input_tokens || 0
          totalCacheReadTokens += (finalMessage.usage as unknown as Record<string, number>).cache_read_input_tokens || 0

          if (finalMessage.stop_reason === 'tool_use') {
            const toolBlocks = finalMessage.content.filter(
              (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
            )

            if (toolBlocks.length === 0) {
              continueLoop = false
              break
            }

            const toolResults = await Promise.all(
              toolBlocks.map(async (block) => {
                if (!isToolAllowed(userRole, block.name)) {
                  return {
                    type: 'tool_result' as const,
                    tool_use_id: block.id,
                    content: JSON.stringify({ error: `Access denied: ${block.name}` }),
                  }
                }

                toolsUsed.push(block.name)

                controller.enqueue(encoder.encode(
                  sseEncode('tool_use', { tool: block.name, status: 'calling' })
                ))

                try {
                  // Sub-agent tools
                  if (SUB_AGENT_TOOLS.has(block.name)) {
                    const agentName = block.name.replace('delegate_', '')
                    const toolParams = block.input as Record<string, unknown>

                    controller.enqueue(encoder.encode(
                      sseEncode('subagent_start', { agent: agentName, task: toolParams.task || block.name })
                    ))

                    const result = await executeSubAgentTool(
                      agentName,
                      toolParams,
                      user.id,
                      finalConvId,
                      supabase,
                      (step: string) => {
                        controller.enqueue(encoder.encode(
                          sseEncode('subagent_progress', { agent: agentName, step })
                        ))
                      }
                    )

                    controller.enqueue(encoder.encode(
                      sseEncode('subagent_done', {
                        agent: agentName,
                        success: !result.error,
                        artifacts: result.artifacts || [],
                        error: result.error,
                      })
                    ))

                    // Also emit individual artifact events so the client can render them
                    if (result.artifacts?.length) {
                      for (const artifact of result.artifacts) {
                        controller.enqueue(encoder.encode(
                          sseEncode('artifact', {
                            id: artifact.id || crypto.randomUUID(),
                            type: artifact.type,
                            title: artifact.title,
                            content: artifact.content,
                          })
                        ))
                      }
                    }

                    // If sub-agent has pending writes, create pending actions
                    if (result.pendingWrites && result.pendingWrites.length > 0) {
                      const expiresAt = new Date(Date.now() + PENDING_ACTION_TTL).toISOString()

                      // Group writes by tool_name for batch handling
                      const groupedWrites = new Map<string, PendingWrite[]>()
                      for (const pw of result.pendingWrites) {
                        const existing = groupedWrites.get(pw.tool_name) || []
                        existing.push(pw)
                        groupedWrites.set(pw.tool_name, existing)
                      }

                      for (const [toolName, writes] of groupedWrites) {
                        let actionParams: Record<string, unknown>
                        let description: string

                        if (toolName === 'batch_create_events') {
                          // Legacy sports-events format: batch all events together
                          actionParams = {
                            events: writes.map(w => w.parameters),
                            descriptions: writes.map(w => w.description),
                          }
                          description = `${agentName}: ${writes.length} event(s) to create`
                        } else if (writes.length === 1) {
                          // Single write — use parameters directly
                          actionParams = writes[0].parameters
                          description = writes[0].description
                        } else {
                          // Multiple writes of same type — wrap in array
                          actionParams = {
                            items: writes.map(w => w.parameters),
                            descriptions: writes.map(w => w.description),
                          }
                          description = `${agentName}: ${writes.length} ${toolName} operation(s)`
                        }

                        const pending = await service.createPendingAction({
                          user_id: user.id,
                          conversation_id: finalConvId,
                          tool_name: toolName,
                          parameters: actionParams,
                          description,
                          expires_at: expiresAt,
                        })

                        pendingActionId = pending.id
                        pendingActionPayload = {
                          id: pending.id,
                          tool: toolName,
                          description,
                          parameters: actionParams,
                        }

                        controller.enqueue(encoder.encode(
                          sseEncode('pending_action', pendingActionPayload)
                        ))
                      }
                    }

                    controller.enqueue(encoder.encode(
                      sseEncode('tool_result', { tool: block.name, status: result.error ? 'error' : 'done' })
                    ))

                    return {
                      type: 'tool_result' as const,
                      tool_use_id: block.id,
                      content: JSON.stringify(result),
                    }
                  }

                  if (WRITE_TOOLS.has(block.name)) {
                    const toolParams = block.input as Record<string, unknown>
                    const validation = validateWriteToolInput(block.name, toolParams)
                    if (!validation.valid) {
                      controller.enqueue(encoder.encode(
                        sseEncode('tool_result', { tool: block.name, status: 'error' })
                      ))
                      return {
                        type: 'tool_result' as const,
                        tool_use_id: block.id,
                        content: JSON.stringify({ error: `Validation: ${validation.error}` }),
                      }
                    }

                    const expiresAt = new Date(Date.now() + PENDING_ACTION_TTL).toISOString()
                    const pending = await service.createPendingAction({
                      user_id: user.id,
                      conversation_id: finalConvId,
                      tool_name: block.name,
                      parameters: toolParams,
                      description: block.name.replace(/_/g, ' '),
                      expires_at: expiresAt,
                    })

                    pendingActionId = pending.id
                    pendingActionPayload = {
                      id: pending.id,
                      tool: pending.tool_name,
                      description: pending.description || '',
                      parameters: toolParams,
                    }

                    controller.enqueue(encoder.encode(
                      sseEncode('pending_action', pendingActionPayload)
                    ))

                    return {
                      type: 'tool_result' as const,
                      tool_use_id: block.id,
                      content: JSON.stringify({
                        requires_confirmation: true,
                        action_id: pending.id,
                        description: pending.description,
                        message: 'This action requires user confirmation.',
                      }),
                    }
                  }

                  // Read tool
                  const toolStart = Date.now()
                  const result = await executeTool(block.name, block.input as Record<string, unknown>)
                  controller.enqueue(encoder.encode(
                    sseEncode('tool_result', { tool: block.name, status: 'done' })
                  ))

                  // Audit log (fire-and-forget)
                  void supabase.from('ai_tool_executions').insert({
                    user_id: user.id,
                    conversation_id: finalConvId,
                    tool_name: block.name,
                    status: 'success',
                    duration_ms: Date.now() - toolStart,
                  })

                  return {
                    type: 'tool_result' as const,
                    tool_use_id: block.id,
                    content: JSON.stringify(result),
                  }
                } catch (error) {
                  console.error(`Tool error ${block.name}:`, error)
                  controller.enqueue(encoder.encode(
                    sseEncode('tool_result', { tool: block.name, status: 'error' })
                  ))
                  return {
                    type: 'tool_result' as const,
                    tool_use_id: block.id,
                    content: JSON.stringify({
                      error: error instanceof Error ? error.message : 'Unknown error',
                    }),
                  }
                }
              })
            )

            // Add to messages for next iteration
            messages = [
              ...messages,
              { role: 'assistant' as const, content: finalMessage.content },
              { role: 'user' as const, content: toolResults },
            ]

            // If pending action was created, stop — wait for user confirmation
            if (pendingActionPayload) {
              continueLoop = false
            }
          } else {
            // Normal end_turn
            continueLoop = false
          }
        }

        // Save assistant message to DB
        if (fullAssistantText || toolsUsed.length > 0) {
          const savedMsg = await service.saveMessage(finalConvId, {
            role: 'assistant',
            content: fullAssistantText,
            tools_used: toolsUsed.length > 0 ? [...new Set(toolsUsed)] : undefined,
            pending_action_id: pendingActionId,
            token_usage: { input_tokens: totalInputTokens, output_tokens: totalOutputTokens },
            metadata: { model_used: selectedModel },
          })

          // Parse and emit artifact events (server-side detection)
          try {
            const artifacts = parseArtifacts(fullAssistantText)
            for (const artifact of artifacts) {
              controller.enqueue(encoder.encode(
                sseEncode('artifact', {
                  id: artifact.identifier,
                  type: artifact.type,
                  title: artifact.title,
                  content: artifact.content,
                  message_id: savedMsg?.id,
                })
              ))
            }
          } catch (err) {
            console.error('[artifact-parse] Failed to parse artifacts:', err)
          }

          // Increment message_count using actual count from DB
          const { count } = await supabase
            .from('ai_conversation_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', finalConvId)

          // Update conversation with token totals
          const totalTokens = totalInputTokens + totalOutputTokens
          const estimatedCost = calculateCost(
            { input_tokens: totalInputTokens, output_tokens: totalOutputTokens, cache_write_tokens: totalCacheWriteTokens, cache_read_tokens: totalCacheReadTokens },
            selectedModel
          )

          await supabase
            .from('ai_conversations')
            .update({
              message_count: count || 0,
              last_message_at: new Date().toISOString(),
              total_tokens: totalTokens,
              estimated_cost_usd: estimatedCost,
            })
            .eq('id', finalConvId)

          // Persist daily usage (fire-and-forget)
          const today = new Date().toISOString().split('T')[0]
          void supabase.rpc('upsert_daily_usage', {
            p_user_id: user.id,
            p_date: today,
            p_model: selectedModel,
            p_input: totalInputTokens,
            p_output: totalOutputTokens,
            p_cache_write: totalCacheWriteTokens,
            p_cache_read: totalCacheReadTokens,
            p_cost: estimatedCost,
          })
        }

        // Calculate cost for message_done event
        const fullUsage = {
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
          cache_write_tokens: totalCacheWriteTokens,
          cache_read_tokens: totalCacheReadTokens,
        }
        const costEstimate = calculateCost(fullUsage, selectedModel)
        const cacheHitRate = calculateCacheHitRate(fullUsage)

        controller.enqueue(encoder.encode(
          sseEncode('message_done', {
            conversation_id: finalConvId,
            tools_used: [...new Set(toolsUsed)],
            token_usage: {
              input_tokens: totalInputTokens,
              output_tokens: totalOutputTokens,
              cache_write_tokens: totalCacheWriteTokens,
              cache_read_tokens: totalCacheReadTokens,
            },
            cost_estimate: formatCost(costEstimate),
            cache_hit_rate: Math.round(cacheHitRate * 100),
            pending_action: pendingActionPayload,
            model: selectedModel,
          })
        ))

        controller.close()
      } catch (error) {
        console.error('[SSE] Stream error', {
          error: error instanceof Error ? error.message : 'Unknown',
          stack: error instanceof Error ? error.stack : undefined,
          conversationId: finalConvId,
          userId: user.id
        })
        try {
          controller.enqueue(encoder.encode(
            sseEncode('error', {
              message: error instanceof Error ? error.message : 'Stream error',
            })
          ))
        } catch {
          // controller may already be closed
        }
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Transfer-Encoding': 'chunked',
    },
  })
}

// ============================================
// Confirm/reject handler (non-streaming)
// ============================================
async function handleActionResponse(
  actionId: string,
  isConfirm: boolean,
  userId: string,
  conversationId: string,
  service: ReturnType<typeof createConversationService>,
  supabase: Awaited<ReturnType<typeof createClient>>,
  cookie: string
) {
  const pending = await service.getPendingAction(actionId)
  if (!pending) {
    return new Response(
      JSON.stringify({
        response: 'This action has expired or was already processed.',
        conversation_id: conversationId,
        tools_used: [],
        stop_reason: 'end_turn',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (pending.user_id !== userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (isConfirm) {
    const result = await executeWriteTool(pending.tool_name, pending.parameters as Record<string, unknown>, cookie)
    await service.resolvePendingAction(actionId, 'confirmed')

    try {
      await supabase.from('ai_audit_log').insert({
        user_id: userId,
        tool_name: pending.tool_name,
        parameters: pending.parameters,
        result,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
    } catch (e) {
      console.error('Audit log error:', e)
    }

    const hasError = result && typeof result === 'object' && 'error' in (result as Record<string, unknown>)
    const response = hasError
      ? `The action failed: ${(result as Record<string, unknown>).error}`
      : `Action completed successfully. ${pending.description} has been executed.`

    if (conversationId) {
      await service.saveMessage(conversationId, {
        role: 'assistant',
        content: response,
        tools_used: [pending.tool_name],
      })
    }

    return new Response(JSON.stringify({
      response,
      conversation_id: conversationId,
      tools_used: [pending.tool_name],
      stop_reason: 'end_turn',
      action_result: result,
    }), { headers: { 'Content-Type': 'application/json' } })
  } else {
    await service.resolvePendingAction(actionId, 'rejected')

    try {
      await supabase.from('ai_audit_log').insert({
        user_id: userId,
        tool_name: pending.tool_name,
        parameters: pending.parameters,
        result: null,
        status: 'rejected',
      })
    } catch (e) {
      console.error('Audit log error:', e)
    }

    const response = 'Action cancelled. Let me know if you\'d like to modify the request.'

    if (conversationId) {
      await service.saveMessage(conversationId, { role: 'assistant', content: response })
    }

    return new Response(JSON.stringify({
      response,
      conversation_id: conversationId,
      tools_used: [],
      stop_reason: 'end_turn',
    }), { headers: { 'Content-Type': 'application/json' } })
  }
}
