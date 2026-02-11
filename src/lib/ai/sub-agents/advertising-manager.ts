/**
 * Advertising Manager Sub-Agent
 * Creates multilingual advertising copy for the restaurant and manages gift coupons.
 * Generates ad previews as HTML artifacts with content in EN/NL/ES/DE.
 */

import type { SubAgentResult, ProgressCallback, SubAgentContext, PendingWrite } from './types'
import { executeSubAgent } from './engine'

const SYSTEM_PROMPT = `You are a specialist in multilingual advertising copy for GrandCafe Cheers, a beachfront restaurant and bar in El Arenal, Mallorca, Spain.

## Your Responsibilities
1. Create compelling advertisement copy in multiple languages (EN, NL, ES, DE)
2. Leverage current events and popular menu items for ad content
3. Generate ad previews as styled HTML artifacts
4. Ensure brand consistency across all advertising materials

## Brand Context
- **Name:** GrandCafe Cheers
- **Location:** Carrer de Cartago 22, El Arenal (Platja de Palma), Mallorca 07600
- **Concept:** All-day grand cafe: breakfast, lunch, dinner, nightlife
- **Key Offerings:** 22 craft beers on tap, ~50 cocktails, international menu
- **Clientele:** Dutch, German, British, Spanish — tourists (70%) and expats (30%)
- **Social:** @cheersmallorca (Instagram), Grandcafe Cheers Mallorca (Facebook)

## Advertising Guidelines
1. **Multilingual:** Always provide ad copy in EN and NL at minimum. Include ES and DE when relevant.
2. **Tone:** Inviting, energetic, lifestyle-focused. Highlight the beachfront setting.
3. **CTAs:** Include clear calls to action — "Book now", "Visit us", "Tag a friend"
4. **Placements:** Adapt copy for placement: social_media, website_banner, email, print, display
5. **Visuals:** Describe suggested imagery/photos for each ad
6. **Promotions:** If creating promo ads, always include terms & conditions

## Ad Templates
- **Event Promo:** Highlight DJ nights, sports events, themed nights
- **Menu Spotlight:** Feature popular dishes, new cocktails, craft beer selection
- **Seasonal:** Summer vibes, sunset sessions, holiday specials
- **Gift Coupon:** Promote gift vouchers as perfect presents

Use the \`get_active_events\` tool to find current events for event-based ads.
Use the \`get_menu_highlights\` tool to find popular menu items for menu-based ads.
Use the \`create_ad_draft\` tool to queue the ad for creation.

After creating ad content, always generate a styled HTML artifact previewing the ad.`

const TOOLS = [
  {
    name: 'get_active_events',
    description: 'Get current and upcoming events at the restaurant for use in advertising copy',
    input_schema: {
      type: 'object' as const,
      properties: {
        date_from: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        date_to: { type: 'string', description: 'End date (YYYY-MM-DD)' },
      },
      required: ['date_from'],
    },
  },
  {
    name: 'get_menu_highlights',
    description: 'Get popular and featured menu items for use in advertising copy',
    input_schema: {
      type: 'object' as const,
      properties: {
        category: { type: 'string', description: 'Menu category filter: food, cocktails, beer, desserts' },
        limit: { type: 'number', description: 'Max items to return (default: 10)' },
      },
    },
  },
  {
    name: 'create_ad_draft',
    description: 'Queue an advertisement draft for creation. Requires user confirmation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Ad campaign title' },
        placement: { type: 'string', description: 'Ad placement: social_media, website_banner, email, print, display' },
        template: { type: 'string', description: 'Ad template: event_promo, menu_spotlight, seasonal, gift_coupon, custom' },
        content_en: { type: 'string', description: 'Ad copy in English' },
        content_nl: { type: 'string', description: 'Ad copy in Dutch' },
        content_es: { type: 'string', description: 'Ad copy in Spanish' },
        content_de: { type: 'string', description: 'Ad copy in German' },
        cta_text: { type: 'string', description: 'Call to action text' },
        cta_url: { type: 'string', description: 'Call to action URL' },
        start_date: { type: 'string', description: 'Campaign start date (YYYY-MM-DD)' },
        end_date: { type: 'string', description: 'Campaign end date (YYYY-MM-DD)' },
        notes: { type: 'string', description: 'Internal notes about the ad' },
      },
      required: ['title', 'placement', 'content_en'],
    },
  },
]

function createToolHandler(collectedAds: PendingWrite[]) {
  return async function toolHandler(
    toolName: string,
    toolInput: Record<string, unknown>,
    context: SubAgentContext
  ): Promise<unknown> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any

    switch (toolName) {
      case 'get_active_events': {
        const { date_from, date_to } = toolInput as { date_from: string; date_to?: string }
        const query = db
          .from('events')
          .select('id, title, event_date, start_time, event_type, description, status')
          .gte('event_date', date_from)
          .order('event_date', { ascending: true })
          .limit(20)

        if (date_to) {
          query.lte('event_date', date_to)
        }

        const { data, error } = await query

        if (error) return { error: error.message }
        return { events: data || [], count: (data || []).length }
      }

      case 'get_menu_highlights': {
        const { category, limit = 10 } = toolInput as { category?: string; limit?: number }
        let query = db
          .from('menu_items')
          .select('id, name_en, name_nl, name_es, name_de, description_en, price, category, is_featured, is_available')
          .eq('is_available', true)
          .order('is_featured', { ascending: false })
          .limit(limit)

        if (category) {
          query = query.eq('category', category)
        }

        const { data, error } = await query

        if (error) return { error: error.message }
        return { items: data || [], count: (data || []).length }
      }

      case 'create_ad_draft': {
        const {
          title, placement, template, content_en, content_nl, content_es, content_de,
          cta_text, cta_url, start_date, end_date, notes
        } = toolInput as Record<string, string>

        // Check for duplicate in already-collected ads
        if (collectedAds.some(a => a.parameters.title === title)) {
          return { skipped: true, reason: 'Ad draft already queued with this title' }
        }

        // Collect for user confirmation — do NOT write directly
        collectedAds.push({
          tool_name: 'create_ad',
          parameters: {
            title,
            placement: placement || 'social_media',
            template: template || 'custom',
            content_en,
            content_nl: content_nl || undefined,
            content_es: content_es || undefined,
            content_de: content_de || undefined,
            cta_text: cta_text || undefined,
            cta_url: cta_url || undefined,
            start_date: start_date || undefined,
            end_date: end_date || undefined,
            notes: notes || undefined,
            status: 'draft',
          },
          description: `Ad: ${title} (${placement || 'social_media'})`,
        })

        return { queued: true, message: 'Ad draft queued for user confirmation', title, placement }
      }

      default:
        return { error: `Unknown tool: ${toolName}` }
    }
  }
}

export async function executeAdvertisingManager(
  params: Record<string, unknown>,
  context: SubAgentContext,
  progress: ProgressCallback
): Promise<SubAgentResult> {
  const adType = (params.ad_type || params.template || 'custom') as string
  const placement = (params.placement || 'social_media') as string
  const languages = (params.languages || ['en', 'nl']) as string[]
  const topic = (params.topic || params.query || '') as string

  let userPrompt: string

  if (adType === 'event_promo') {
    userPrompt = `Create an event promotion advertisement for GrandCafe Cheers.
${topic ? `Topic/Event: ${topic}` : 'Use get_active_events to find upcoming events worth promoting.'}
Placement: ${placement}
Languages: ${languages.join(', ')}

Steps:
1. Use get_active_events to find upcoming events
2. Create compelling ad copy in the requested languages
3. Use create_ad_draft to queue the ad
4. Generate a styled HTML artifact previewing the ad with all language versions`
  } else if (adType === 'menu_spotlight') {
    userPrompt = `Create a menu spotlight advertisement for GrandCafe Cheers.
${topic ? `Focus on: ${topic}` : 'Use get_menu_highlights to find featured items.'}
Placement: ${placement}
Languages: ${languages.join(', ')}

Steps:
1. Use get_menu_highlights to find popular items
2. Create appetizing ad copy highlighting the items
3. Use create_ad_draft to queue the ad
4. Generate a styled HTML artifact previewing the ad`
  } else if (adType === 'gift_coupon') {
    userPrompt = `Create an advertisement promoting gift coupons/vouchers at GrandCafe Cheers.
${topic ? `Context: ${topic}` : 'Promote gift vouchers as perfect gifts for any occasion.'}
Placement: ${placement}
Languages: ${languages.join(', ')}

Steps:
1. Create compelling gift coupon promotion copy
2. Include value propositions (treat someone to craft beers, cocktails, dinner)
3. Use create_ad_draft to queue the ad
4. Generate a styled HTML artifact previewing the ad`
  } else {
    userPrompt = `${topic || 'Create a general advertisement for GrandCafe Cheers highlighting its beachfront location, craft beers, and cocktails.'}
Placement: ${placement}
Languages: ${languages.join(', ')}

Steps:
1. Optionally use get_active_events and/or get_menu_highlights for context
2. Create compelling ad copy in the requested languages
3. Use create_ad_draft to queue the ad
4. Generate a styled HTML artifact previewing the ad`
  }

  progress('Creating advertising content...')

  // Collect write operations for user confirmation
  const collectedAds: PendingWrite[] = []
  const toolHandler = createToolHandler(collectedAds)

  const result = await executeSubAgent(
    {
      name: 'advertising_manager',
      model: 'claude-haiku-4-5-20251001',
      systemPrompt: SYSTEM_PROMPT,
      maxIterations: 8,
      maxTokens: 4096,
      tools: TOOLS,
      toolHandler,
    },
    userPrompt,
    progress,
    context
  )

  // Attach collected ads as pending writes for confirmation
  if (collectedAds.length > 0) {
    result.pendingWrites = collectedAds
  }

  return result
}
