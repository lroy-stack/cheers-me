/**
 * Sports Events Sub-Agent
 * Searches for upcoming football/sports matches and manages the sports calendar end-to-end.
 * Fetches match schedules from the web, creates/updates events in the DB, and generates
 * a visual calendar artifact.
 */

import { anthropic, Anthropic } from '../claude'
import type { SubAgentResult, ProgressCallback, SubAgentContext, PendingWrite } from './types'
import { executeSubAgent } from './engine'

const SYSTEM_PROMPT = `You are a sports events specialist for GrandCafe Cheers, a beachfront sports bar & restaurant in El Arenal, Mallorca, Spain.

## Your Responsibilities
1. Search for upcoming football/sports matches relevant to the bar's clientele
2. Create events in the restaurant's calendar for matches worth screening
3. Generate a visual HTML calendar of upcoming sports events

## Target Leagues & Sports (priority order)
1. **La Liga** — Real Madrid, FC Barcelona, Atlético Madrid, RCD Mallorca (local!)
2. **Champions League / Europa League** — All matches
3. **Premier League** — Top 6 clubs (Arsenal, Man City, Liverpool, Chelsea, Man Utd, Tottenham)
4. **Bundesliga** — Bayern Munich, Dortmund
5. **Serie A** — Inter, Milan, Juventus, Napoli
6. **International** — Spain national team, World Cup qualifiers, Euro qualifiers
7. **Other sports** — Formula 1 (Spanish GP), Tennis (Mallorca Open, Roland Garros, Wimbledon), MotoGP
8. **UFC/Boxing** — Major PPV events

## RCD Mallorca Priority
RCD Mallorca is the local team. ALL their matches should be included, home and away. These get highest priority and should be marked as "featured" in the calendar.

## Event Details Format
For each match, include:
- **title**: e.g. "Real Madrid vs FC Barcelona — La Liga"
- **event_date**: YYYY-MM-DD
- **start_time**: HH:MM (Spain timezone, UTC+1/+2)
- **sport_name**: e.g. "Football", "Formula 1", "Tennis"
- **home_team** and **away_team** (for team sports)
- **broadcast_channel**: Movistar+, DAZN, La 1, etc.
- **match_info**: League, round, stakes context

## Calendar Output
After creating events, generate an HTML artifact showing a clean, styled calendar view with:
- Color-coded by sport/league
- RCD Mallorca matches highlighted
- Broadcast info shown
- Time in Spain timezone

Use the \`create_sports_event\` tool to add each event to the database.
Use the \`get_existing_events\` tool first to avoid duplicates.`

const TOOLS = [
  {
    name: 'web_search',
    description: 'Search the web for sports schedules, match fixtures, and broadcast information',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query for sports fixtures/schedule' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_existing_events',
    description: 'Check existing sports events in the restaurant calendar to avoid duplicates',
    input_schema: {
      type: 'object' as const,
      properties: {
        date_from: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        date_to: { type: 'string', description: 'End date (YYYY-MM-DD)' },
      },
      required: ['date_from', 'date_to'],
    },
  },
  {
    name: 'create_sports_event',
    description: 'Create a sports event in the restaurant calendar',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Event title, e.g. "Real Madrid vs Barcelona — La Liga"' },
        event_date: { type: 'string', description: 'Date (YYYY-MM-DD)' },
        start_time: { type: 'string', description: 'Start time (HH:MM)' },
        end_time: { type: 'string', description: 'End time (HH:MM), optional' },
        sport_name: { type: 'string', description: 'Sport name: Football, Formula 1, Tennis, UFC, etc.' },
        home_team: { type: 'string', description: 'Home team name' },
        away_team: { type: 'string', description: 'Away team name' },
        broadcast_channel: { type: 'string', description: 'TV channel: Movistar+, DAZN, La 1, etc.' },
        match_info: { type: 'string', description: 'Additional context: league, round, stakes' },
      },
      required: ['title', 'event_date', 'start_time', 'sport_name'],
    },
  },
]

function createToolHandler(collectedEvents: PendingWrite[]) {
  return async function toolHandler(
    toolName: string,
    toolInput: Record<string, unknown>,
    context: SubAgentContext
  ): Promise<unknown> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any

    switch (toolName) {
      case 'web_search': {
        // Use Anthropic's server-side web search
        try {
          const searchResponse = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 2048,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 } as any],
            messages: [{ role: 'user', content: `Search for: ${toolInput.query}. Return only factual match schedule data with dates, times, teams, and broadcast channels.` }],
          })
          const textBlocks = searchResponse.content.filter(
            (b): b is Anthropic.TextBlock => b.type === 'text'
          )
          return { results: textBlocks.map(b => b.text).join('\n') }
        } catch (err) {
          return { error: `Web search failed: ${err instanceof Error ? err.message : 'Unknown error'}` }
        }
      }

      case 'get_existing_events': {
        const { date_from, date_to } = toolInput as { date_from: string; date_to: string }
        const { data, error } = await db
          .from('events')
          .select('id, title, event_date, start_time, event_type, sport_name, home_team, away_team')
          .eq('event_type', 'sports')
          .gte('event_date', date_from)
          .lte('event_date', date_to)
          .order('event_date', { ascending: true })

        if (error) return { error: error.message }
        return { events: data || [], count: (data || []).length }
      }

      case 'create_sports_event': {
        const { title, event_date, start_time, end_time, sport_name, home_team, away_team, broadcast_channel, match_info } = toolInput as Record<string, string>

        // Check for duplicate in DB
        const { data: existing } = await db
          .from('events')
          .select('id')
          .eq('event_type', 'sports')
          .eq('event_date', event_date)
          .eq('title', title)
          .limit(1)

        if (existing && existing.length > 0) {
          return { skipped: true, reason: 'Event already exists', id: existing[0].id }
        }

        // Also check duplicates in already-collected events
        if (collectedEvents.some(e => e.parameters.title === title && e.parameters.event_date === event_date)) {
          return { skipped: true, reason: 'Event already queued for creation' }
        }

        // Collect for user confirmation — do NOT write directly
        collectedEvents.push({
          tool_name: 'create_event',
          parameters: {
            title,
            event_date,
            start_time,
            end_time: end_time || undefined,
            event_type: 'sports',
            sport_name: sport_name || undefined,
            home_team: home_team || undefined,
            away_team: away_team || undefined,
            broadcast_channel: broadcast_channel || undefined,
            match_info: match_info || undefined,
          },
          description: `${title} — ${event_date} ${start_time}`,
        })

        return { queued: true, message: 'Event queued for user confirmation', title, event_date, start_time }
      }

      default:
        return { error: `Unknown tool: ${toolName}` }
    }
  }
}

export async function executeSportsEvents(
  params: Record<string, unknown>,
  context: SubAgentContext,
  progress: ProgressCallback
): Promise<SubAgentResult> {
  const period = (params.period || 'this_week') as string
  const sport = (params.sport || 'all') as string
  const action = (params.action || 'sync') as string

  let userPrompt: string

  if (action === 'sync' || action === 'update') {
    userPrompt = `Search for upcoming sports events for ${period === 'this_week' ? 'this week' : period === 'this_month' ? 'this month' : 'the next 2 weeks'}.
${sport !== 'all' ? `Focus on: ${sport}` : 'Include all major sports: football (La Liga, Champions League, Premier League), Formula 1, Tennis, UFC.'}

Steps:
1. First, use get_existing_events to see what's already in the calendar
2. Then search the web for upcoming fixtures
3. Create events for matches not yet in the calendar
4. Finally, generate a styled HTML calendar artifact showing all sports events

Remember: RCD Mallorca matches are always priority. Include broadcast channel info.`
  } else if (action === 'calendar') {
    userPrompt = `Use get_existing_events to fetch all sports events for ${period}, then generate a beautiful styled HTML calendar artifact showing them all. Color-code by league/sport. Highlight RCD Mallorca matches.`
  } else {
    userPrompt = `${params.query || 'Search for upcoming sports events this week and add them to the calendar.'}`
  }

  progress('Searching for sports events...')

  // Collect write operations for user confirmation
  const collectedEvents: PendingWrite[] = []
  const toolHandler = createToolHandler(collectedEvents)

  const result = await executeSubAgent(
    {
      name: 'sports_events',
      model: 'claude-sonnet-4-5-20250929',
      systemPrompt: SYSTEM_PROMPT,
      maxIterations: 12,
      maxTokens: 8192,
      tools: TOOLS,
      toolHandler,
    },
    userPrompt,
    progress,
    context
  )

  // Attach collected events as pending writes for confirmation
  if (collectedEvents.length > 0) {
    result.pendingWrites = collectedEvents
  }

  return result
}
