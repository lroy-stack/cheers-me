import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'

// Validation schema for AI generation request
const aiGenerateSchema = z.object({
  type: z.enum(['post', 'reel_script', 'newsletter']),
  topic: z.string().min(1).max(500),
  language: z.enum(['nl', 'en', 'es']),
  platform: z.enum(['instagram', 'facebook', 'multi']).optional(),
  tone: z.enum(['casual', 'professional', 'playful', 'elegant']).default('casual'),
  include_hashtags: z.boolean().default(true),
  context: z.string().max(1000).optional(),
})

/**
 * POST /api/marketing/ai-generate
 * Generate social media content using Claude API (managers/admins only)
 *
 * Request body:
 * - type: post | reel_script | newsletter
 * - topic: what the content should be about
 * - language: nl | en | es
 * - platform: instagram | facebook | multi (for posts)
 * - tone: casual | professional | playful | elegant
 * - include_hashtags: boolean (for posts)
 * - context: additional context or requirements
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'Claude API key not configured' },
      { status: 500 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = aiGenerateSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: validation.error.errors,
      },
      { status: 400 }
    )
  }

  const { type, topic, language, platform, tone, include_hashtags, context } = validation.data

  // Initialize Anthropic client
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  // Build system prompt based on content type
  let systemPrompt = ''
  let userPrompt = ''

  const businessContext = `
You are a content creator for GrandCafe Cheers, a seasonal beachfront restaurant/bar in El Arenal, Mallorca.
- Location: Platja de Palma, Mallorca
- Concept: All-day grand cafe (breakfast → lunch → dinner → nightlife)
- Atmosphere: Casual, welcoming, beachfront vibes
- Clientele: Dutch, German, British, Spanish tourists and expats
- Features: 22 craft beers on tap, international menu, DJ nights (22:00-close)
- Instagram: @cheersmallorca (~5.4K followers)
`

  if (type === 'post') {
    systemPrompt = `${businessContext}

Create an engaging social media post in ${language.toUpperCase()}.
Tone: ${tone}
Platform: ${platform || 'general social media'}

${include_hashtags ? 'Include relevant hashtags at the end.' : 'Do not include hashtags.'}

Return ONLY valid JSON with this structure:
{
  "caption": "The post text",
  "hashtags": "space-separated hashtags (if applicable)",
  "image_suggestion": "Brief description of suggested image"
}
`
    userPrompt = `Topic: ${topic}\n${context ? `Additional context: ${context}` : ''}`
  } else if (type === 'reel_script') {
    systemPrompt = `${businessContext}

Create a short-form video script (Reel/TikTok style) in ${language.toUpperCase()}.
Tone: ${tone}
Duration: 15-30 seconds

Return ONLY valid JSON with this structure:
{
  "title": "Hook/title for the reel",
  "script": "Scene-by-scene script with timings",
  "music_suggestion": "Type of background music",
  "hashtags": "space-separated hashtags"
}
`
    userPrompt = `Video topic: ${topic}\n${context ? `Additional context: ${context}` : ''}`
  } else if (type === 'newsletter') {
    systemPrompt = `${businessContext}

Create an engaging email newsletter section in ${language.toUpperCase()}.
Tone: ${tone}

Return ONLY valid JSON with this structure:
{
  "subject": "Email subject line",
  "preview_text": "Preview text (50 chars)",
  "content": "Newsletter content in HTML format"
}
`
    userPrompt = `Newsletter topic: ${topic}\n${context ? `Additional context: ${context}` : ''}`
  }

  try {
    // Call Claude API with Haiku model for cost optimization
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      temperature: 0.8,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    // Extract text from response
    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : ''

    // Parse JSON response
    let generatedContent
    try {
      // Try to find JSON in the response (in case Claude adds explanation)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        generatedContent = JSON.parse(jsonMatch[0])
      } else {
        generatedContent = JSON.parse(responseText)
      }
    } catch (parseError) {
      // If parsing fails, return raw text
      generatedContent = {
        raw_text: responseText,
        error: 'Failed to parse structured response',
      }
    }

    return NextResponse.json({
      success: true,
      type,
      language,
      content: generatedContent,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
    })
  } catch (error) {
    console.error('Claude API error:', error)

    return NextResponse.json(
      {
        error: 'Failed to generate content',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
