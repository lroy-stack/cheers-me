/**
 * Sub-Agent Engine
 * Shared execution engine for all sub-agents.
 * Runs a tool loop with a specialized system prompt and tool set.
 */

import { anthropic, Anthropic } from '../claude'
import type { SubAgentConfig, SubAgentResult, ProgressCallback, SubAgentContext } from './types'

export async function executeSubAgent(
  config: SubAgentConfig,
  userMessage: string,
  progress: ProgressCallback,
  context?: SubAgentContext
): Promise<SubAgentResult> {
  const startTime = Date.now()
  let totalInput = 0
  let totalOutput = 0

  const tools: Anthropic.Tool[] = config.tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema as Anthropic.Tool.InputSchema,
  }))

  let messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userMessage },
  ]

  progress('Thinking...')

  try {
    for (let i = 0; i < config.maxIterations; i++) {
      const response = await anthropic.messages.create({
        model: config.model,
        max_tokens: config.maxTokens,
        system: config.systemPrompt,
        tools,
        messages,
      })

      totalInput += response.usage.input_tokens
      totalOutput += response.usage.output_tokens

      if (response.stop_reason === 'end_turn') {
        // Extract text content
        const textBlocks = response.content.filter(
          (b): b is Anthropic.TextBlock => b.type === 'text'
        )
        const content = textBlocks.map(b => b.text).join('\n')

        return {
          success: true,
          content,
          tokenUsage: { input_tokens: totalInput, output_tokens: totalOutput },
          durationMs: Date.now() - startTime,
        }
      }

      if (response.stop_reason === 'tool_use') {
        const toolBlocks = response.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
        )

        if (toolBlocks.length === 0) {
          const textBlocks = response.content.filter(
            (b): b is Anthropic.TextBlock => b.type === 'text'
          )
          return {
            success: true,
            content: textBlocks.map(b => b.text).join('\n'),
            tokenUsage: { input_tokens: totalInput, output_tokens: totalOutput },
            durationMs: Date.now() - startTime,
          }
        }

        // Process tool calls via injected toolHandler
        const toolResults: Anthropic.ToolResultBlockParam[] = []
        for (const block of toolBlocks) {
          progress(`Using ${block.name}...`)
          try {
            const result = config.toolHandler && context
              ? await Promise.race([
                  config.toolHandler(block.name, block.input as Record<string, unknown>, context),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Tool execution timeout (120s)')), 120_000)),
                ])
              : { error: `No tool handler configured for ${block.name}` }
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result),
            })
          } catch (error) {
            // Error context injection (Anthropic pattern)
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify({
                error: error instanceof Error ? error.message : 'Tool execution failed',
                suggestion: 'Try a different approach or simplify the request.',
              }),
            })
          }
        }

        messages = [
          ...messages,
          { role: 'assistant', content: response.content },
          { role: 'user', content: toolResults },
        ]
      }
    }

    return {
      success: false,
      content: 'Sub-agent reached maximum iterations.',
      error: 'Max iterations reached',
      tokenUsage: { input_tokens: totalInput, output_tokens: totalOutput },
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      content: '',
      error: error instanceof Error ? error.message : 'Unknown sub-agent error',
      tokenUsage: { input_tokens: totalInput, output_tokens: totalOutput },
      durationMs: Date.now() - startTime,
    }
  }
}
