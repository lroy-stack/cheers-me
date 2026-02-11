import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/ai/speech
 * Proxies text-to-speech requests to ElevenLabs streaming API.
 * Returns audio/mpeg stream.
 */

const VOICE_MAP: Record<string, string | undefined> = {
  es: process.env.ELEVENLABS_VOICE_ES,
  en: process.env.ELEVENLABS_VOICE_EN,
  nl: process.env.ELEVENLABS_VOICE_NL,
  de: process.env.ELEVENLABS_VOICE_DE,
}

const DEFAULT_VOICE = process.env.ELEVENLABS_VOICE_EN || 'EXAVITQu4vr4xnSDxMaL' // Rachel
const MAX_TEXT_LENGTH = 5000

export async function POST(request: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ElevenLabs not configured' }, { status: 501 })
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { text?: string; language?: string; voice_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  let { text } = body
  const { language = 'en', voice_id } = body

  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'text field is required' }, { status: 400 })
  }

  // Truncate if too long
  if (text.length > MAX_TEXT_LENGTH) {
    text = text.slice(0, MAX_TEXT_LENGTH) + '...'
  }

  // Strip markdown formatting for cleaner speech
  text = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (!text) {
    return NextResponse.json({ error: 'No speakable text after processing' }, { status: 400 })
  }

  const voiceId = voice_id || VOICE_MAP[language] || DEFAULT_VOICE

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('ElevenLabs error:', response.status, errorText)
      return NextResponse.json(
        { error: `ElevenLabs API error: ${response.status}` },
        { status: response.status }
      )
    }

    // Stream the audio back
    return new Response(response.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (error) {
    console.error('Speech API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Speech generation failed' },
      { status: 500 }
    )
  }
}
