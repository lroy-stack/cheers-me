/**
 * Web Researcher Sub-Agent
 * Searches the web for relevant information (football, events, competition, weather).
 * Uses Anthropic's built-in web_search and web_fetch tools.
 */

import { anthropic, Anthropic } from '../claude'
import type { SubAgentResult, ProgressCallback } from './types'

const SYSTEM_PROMPT = `You are a web research specialist for GrandCafe Cheers, a beachfront restaurant in El Arenal, Mallorca.

Your job is to search the web and compile relevant information for the restaurant team. Common research tasks:
- Football/sports events this weekend (La Liga, Champions League, etc.)
- Local events in Mallorca / El Arenal / Platja de Palma
- Competitor analysis (other restaurants/bars in the area)
- Weather forecast for Mallorca
- Tourism trends and flight data
- Music/DJ events in the area

Always provide:
1. A clear summary of findings
2. Relevant dates/times
3. Actionable recommendations for the restaurant
4. Source attribution

Format your response clearly with headers and bullet points.`

export async function executeWebResearcher(
  params: Record<string, unknown>,
  _userId: string,
  supabase: unknown,
  progress: ProgressCallback
): Promise<SubAgentResult> {
  const startTime = Date.now()
  const query = (params.query || params.topic || '') as string
  const researchType = (params.research_type || 'general') as string

  progress(`Searching: ${query.slice(0, 50)}...`)

  try {
    // Check cache first
    const queryHash = Buffer.from(query.toLowerCase().trim()).toString('base64').slice(0, 64)
    const db = supabase as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { gt: (k: string, v: string) => { single: () => Promise<{ data: { results: unknown } | null }> } } } } }

    const cacheResult = await db
      .from('ai_search_cache')
      .select('results')
      .eq('query_hash', queryHash)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (cacheResult.data) {
      progress('Using cached results')
      const cached = cacheResult.data.results as { content: string }
      return {
        success: true,
        content: cached.content || JSON.stringify(cached),
        durationMs: Date.now() - startTime,
      }
    }

    // Call Claude with web search tools
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 5,
        } as unknown as Anthropic.Tool,
      ],
      messages: [
        {
          role: 'user',
          content: `Research the following for GrandCafe Cheers (Mallorca, Spain): ${query}
Research type: ${researchType}
Current date: ${new Date().toISOString().split('T')[0]}`,
        },
      ],
    })

    const textBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === 'text'
    )
    const content = textBlocks.map(b => b.text).join('\n')

    progress('Research complete')

    // Cache results
    const ttlMap: Record<string, number> = {
      sports: 60 * 60 * 1000, // 1h
      weather: 30 * 60 * 1000, // 30min
      events: 4 * 60 * 60 * 1000, // 4h
      general: 2 * 60 * 60 * 1000, // 2h
    }
    const ttl = ttlMap[researchType] || ttlMap.general
    const expiresAt = new Date(Date.now() + ttl).toISOString()

    try {
      const insertDb = supabase as { from: (t: string) => { insert: (d: unknown) => Promise<unknown> } }
      await insertDb.from('ai_search_cache').insert({
        query_hash: queryHash,
        research_type: researchType,
        query,
        results: { content },
        expires_at: expiresAt,
      })
    } catch {
      // Cache insert failure is non-critical
    }

    return {
      success: true,
      content,
      tokenUsage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      content: '',
      error: error instanceof Error ? error.message : 'Web research failed',
      durationMs: Date.now() - startTime,
    }
  }
}
