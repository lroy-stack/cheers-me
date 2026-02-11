import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function chat(
  messages: Anthropic.MessageParam[],
  systemPrompt: string,
  tools: Anthropic.Tool[]
) {
  // Use prompt caching for cost optimization (system prompt ~4000 tokens)
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: systemPrompt,
        // @ts-expect-error - cache_control is supported by API but not yet in SDK types
        cache_control: { type: "ephemeral" }
      }
    ],
    tools,
    messages,
  })

  return response
}

/**
 * Build cached message params for streaming with prompt caching.
 * Uses up to 4 cache breakpoints:
 * 1. System prompt (stable per role/session)
 * 2. Dynamic context (semi-stable, from context resolvers) — only if > 1024 chars
 * 3. Tool definitions (stable per role)
 * 4. Conversation prefix (grows per turn)
 */
export function buildCachedParams(
  systemPrompt: string,
  tools: Anthropic.Tool[],
  messages: Anthropic.MessageParam[],
  model?: string,
  dynamicContext?: string
): {
  model: string
  max_tokens: number
  system: Anthropic.MessageCreateParams['system']
  tools: Anthropic.Tool[]
  messages: Anthropic.MessageParam[]
} {
  const system: Anthropic.MessageCreateParams['system'] = []

  // Cache breakpoint 1: system prompt (stable per session)
  system.push({
    type: "text",
    text: systemPrompt,
    // @ts-expect-error - cache_control is supported by API but not yet in SDK types
    cache_control: { type: "ephemeral" }
  })

  // Cache breakpoint 2: dynamic context (only if substantial)
  if (dynamicContext && dynamicContext.length > 1024) {
    system.push({
      type: "text",
      text: dynamicContext,
      // @ts-expect-error - cache_control on content blocks
      cache_control: { type: "ephemeral" }
    })
  } else if (dynamicContext) {
    system.push({ type: "text", text: dynamicContext })
  }

  // Cache breakpoint 3: last tool in array
  const cachedTools = tools.length > 0
    ? [
        ...tools.slice(0, -1),
        {
          ...tools[tools.length - 1],
          cache_control: { type: "ephemeral" } as Record<string, string>,
        },
      ]
    : tools

  // Cache breakpoint 4: conversation prefix (all messages except the last user turn)
  let cachedMessages = messages
  if (messages.length > 2) {
    const prefixEnd = messages.length - 1
    const prefix = messages.slice(0, prefixEnd)
    const lastMsg = messages[prefixEnd]

    // Add cache_control to last message in prefix
    const lastPrefixMsg = prefix[prefix.length - 1]
    if (typeof lastPrefixMsg.content === 'string') {
      prefix[prefix.length - 1] = {
        ...lastPrefixMsg,
        content: [
          {
            type: 'text',
            text: lastPrefixMsg.content,
            // @ts-expect-error - cache_control on content blocks
            cache_control: { type: 'ephemeral' },
          },
        ],
      }
    }

    cachedMessages = [...prefix, lastMsg]
  }

  const selectedModel = model || "claude-haiku-4-5-20251001"
  const maxTokens = selectedModel.includes('sonnet') ? 8192 : 4096

  return {
    model: selectedModel,
    max_tokens: maxTokens,
    system,
    tools: cachedTools,
    messages: cachedMessages,
  }
}

export { anthropic, Anthropic }
