/**
 * AI-powered marketing content generation for events
 * Uses Claude API to auto-generate social posts and newsletter mentions
 */

import Anthropic from '@anthropic-ai/sdk'

export interface EventMarketingInput {
  eventTitle: string
  eventType: 'dj_night' | 'sports' | 'themed_night' | 'private_event' | 'other'
  eventDate: string // YYYY-MM-DD
  startTime: string // HH:MM
  description?: string
  djName?: string
  djGenre?: string
  sportName?: string
  homeTeam?: string
  awayTeam?: string
  broadcastChannel?: string
}

export interface EventMarketingOutput {
  social_caption: string
  social_hashtags: string
  suggested_platforms: string[]
  newsletter_mention: string
}

/**
 * Generate marketing content for an event using Claude API
 * Returns content in NL, EN, and ES
 */
export async function generateEventMarketing(
  input: EventMarketingInput
): Promise<EventMarketingOutput> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  // Build context based on event type
  let eventContext = ''

  if (input.eventType === 'dj_night' && input.djName) {
    eventContext = `DJ Night featuring ${input.djName}${input.djGenre ? ` (${input.djGenre})` : ''}`
  } else if (input.eventType === 'sports' && input.homeTeam && input.awayTeam) {
    eventContext = `${input.sportName || 'Sports'} Event: ${input.homeTeam} vs ${input.awayTeam}${input.broadcastChannel ? ` on ${input.broadcastChannel}` : ''}`
  } else if (input.eventType === 'themed_night') {
    eventContext = `Themed Night: ${input.eventTitle}`
  } else if (input.eventType === 'private_event') {
    eventContext = `Private Event: ${input.eventTitle}`
  } else {
    eventContext = input.eventTitle
  }

  const systemPrompt = `
You are a multilingual social media content creator for GrandCafe Cheers, a popular beachfront restaurant/bar in El Arenal, Mallorca.

Business Context:
- Location: Platja de Palma, El Arenal, Mallorca
- Concept: All-day grand cafe (breakfast → lunch → dinner → nightlife)
- Atmosphere: Welcoming, beachfront, vibrant nightlife
- Clientele: Dutch, German, British, Spanish tourists and expats
- Features: 22 craft beers on tap, international menu, DJ nights every night (22:00-close), sports broadcasts
- Instagram: @cheersmallorca (~5.4K followers)
- Facebook: Grandcafe Cheers Mallorca

Task: Generate promotional content for an upcoming event. Create content that is:
1. Engaging and enthusiastic
2. Appropriate for the event type
3. Inclusive of our multilingual audience
4. Optimized for social media engagement

Event Details:
- Title: ${input.eventTitle}
- Type: ${input.eventType}
- Date: ${input.eventDate}
- Time: ${input.startTime}
- Context: ${eventContext}
${input.description ? `- Description: ${input.description}` : ''}

Return ONLY valid JSON with this exact structure:
{
  "social_caption_nl": "Instagram/Facebook post in Dutch (max 2200 chars, engaging, with emojis)",
  "social_caption_en": "Instagram/Facebook post in English (max 2200 chars, engaging, with emojis)",
  "social_caption_es": "Instagram/Facebook post in Spanish (max 2200 chars, engaging, with emojis)",
  "hashtags": "Relevant hashtags (language-agnostic, space-separated)",
  "suggested_platforms": ["instagram", "facebook"],
  "newsletter_mention_nl": "Brief newsletter mention in Dutch (1-2 sentences)",
  "newsletter_mention_en": "Brief newsletter mention in English (1-2 sentences)",
  "newsletter_mention_es": "Brief newsletter mention in Spanish (1-2 sentences)"
}

Guidelines:
- Use appropriate emojis (🎵 for DJ nights, ⚽ for sports, 🎉 for themed nights, etc.)
- Include call-to-action (e.g., "See you there!", "Don't miss it!", "Reserve your spot!")
- Mention the date and time clearly
- Keep hashtags relevant to Mallorca, nightlife, and the event type
- Newsletter mentions should be concise and enticing
`

  const userPrompt = `Generate marketing content for this event.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 2048,
      temperature: 0.8,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    // Extract text response
    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : ''

    // Parse JSON (extract from markdown code blocks if present)
    let parsedContent
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0])
      } else {
        parsedContent = JSON.parse(responseText)
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response:', responseText)
      throw new Error('Failed to parse AI response as JSON')
    }

    // Default to English if multilingual content not provided
    const socialCaption =
      parsedContent.social_caption_en ||
      parsedContent.social_caption ||
      'Check out our upcoming event!'

    const newsletterMention =
      parsedContent.newsletter_mention_en ||
      parsedContent.newsletter_mention ||
      'Join us for an exciting event!'

    // Combine multilingual captions (store primary in EN, can be edited later)
    const multilingualCaption = [
      parsedContent.social_caption_en || socialCaption,
      parsedContent.social_caption_nl && `\n\n🇳🇱 ${parsedContent.social_caption_nl}`,
      parsedContent.social_caption_es && `\n\n🇪🇸 ${parsedContent.social_caption_es}`,
    ]
      .filter(Boolean)
      .join('')

    return {
      social_caption: multilingualCaption,
      social_hashtags: parsedContent.hashtags || '#CheersMallorca #ElArenal #Mallorca',
      suggested_platforms: parsedContent.suggested_platforms || ['instagram', 'facebook'],
      newsletter_mention: newsletterMention,
    }
  } catch (error) {
    console.error('Claude API error in generateEventMarketing:', error)
    throw error
  }
}

/**
 * Simplified version that generates single-language content
 * Useful for testing or if API quota is limited
 */
export async function generateEventMarketingSimple(
  input: EventMarketingInput,
  language: 'nl' | 'en' | 'es' = 'en'
): Promise<EventMarketingOutput> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const languageMap = {
    nl: 'Dutch',
    en: 'English',
    es: 'Spanish',
  }

  let eventContext = ''
  if (input.eventType === 'dj_night' && input.djName) {
    eventContext = `DJ Night with ${input.djName}${input.djGenre ? ` (${input.djGenre})` : ''}`
  } else if (input.eventType === 'sports' && input.homeTeam && input.awayTeam) {
    eventContext = `${input.sportName || 'Match'}: ${input.homeTeam} vs ${input.awayTeam}`
  } else {
    eventContext = input.eventTitle
  }

  const systemPrompt = `You are writing promotional content for GrandCafe Cheers, a beachfront bar/restaurant in Mallorca.
Create engaging ${languageMap[language]} content for social media and newsletter.

Event: ${eventContext}
Date: ${input.eventDate} at ${input.startTime}

Return ONLY valid JSON:
{
  "caption": "Social media post with emojis",
  "hashtags": "space-separated hashtags",
  "newsletter": "Brief 1-2 sentence mention"
}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      temperature: 0.8,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Generate the content.' }],
    })

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '{}'
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(jsonMatch?.[0] || '{}')

    return {
      social_caption: parsed.caption || 'Join us for an amazing event!',
      social_hashtags: parsed.hashtags || '#CheersMallorca #Mallorca',
      suggested_platforms: ['instagram', 'facebook'],
      newsletter_mention: parsed.newsletter || 'Don\'t miss our upcoming event!',
    }
  } catch (error) {
    console.error('Claude API error:', error)
    throw error
  }
}
