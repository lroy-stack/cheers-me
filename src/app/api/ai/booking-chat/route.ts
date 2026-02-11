import { NextResponse, type NextRequest } from 'next/server'

// Rate limiting: simple in-memory store per IP (10 req/min)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }

  if (entry.count >= 10) return false
  entry.count++
  return true
}

// Mock responses for when ANTHROPIC_API_KEY is not configured
const MOCK_RESPONSES: Record<string, { reply: string; suggestion?: Record<string, unknown> }> = {
  cocktail: {
    reply: "We have over 50 cocktails! Our bestsellers are the Cheers Sunset (mango, rum, passion fruit), Mallorca Mule, and the Beach Breeze. We also do amazing frozen daiquiris! 🍹",
  },
  dj: {
    reply: "DJ Winston Black plays every night from 22:00 until close! He spins a great mix of house, R&B, and party classics. Perfect for a night out! 🎵",
    suggestion: { start_time: '22:00' },
  },
  food: {
    reply: "Our World Kitchen menu is amazing! We've got gourmet burgers, fresh salads, sharing platters, and dishes from around the globe. Check our digital menu for the full selection!",
  },
  beer: {
    reply: "We have 22 craft beers on tap! Including local Mallorcan brews, Belgian classics, and IPAs. Plus bucket deals for groups. 🍺",
  },
  sport: {
    reply: "We have 15 screens showing all major sports! Premier League, La Liga, Champions League, F1, and more. Best sports bar on the strip!",
    suggestion: { occasion: 'sports' },
  },
  book: {
    reply: "I'd love to help you book! How about Saturday evening? We have great availability. I'll set up a table for 4 at 19:00 — you can adjust the details in the form above.",
    suggestion: { party_size: 4, start_time: '19:00' },
  },
  birthday: {
    reply: "Happy birthday! 🎉 We love hosting birthday parties! We can arrange decorations, a special cake, and reserved area. Just select 'Birthday' as your occasion and mention it in special requests!",
    suggestion: { occasion: 'birthday' },
  },
  group: {
    reply: "Groups are our specialty! For 6+ people, I recommend our terrace area with sea view. Book as 'Group Outing' and we'll make sure you're all seated together!",
    suggestion: { occasion: 'group', party_size: 8 },
  },
  price: {
    reply: "Great value! World Kitchen dishes from €9.95. Cocktails from €8. Beer from €3.50. And happy hour runs 17:00-19:00 with 2-for-1 cocktails!",
  },
  park: {
    reply: "Free street parking is available along Carrer de Cartago and nearby streets. There's also a public parking lot on Carrer de Trasimè, about a 3-minute walk. Easy to find! 🚗",
  },
  location: {
    reply: "We're at Carrer de Cartago 22, El Arenal (Platja de Palma), Mallorca 07600. Right on the beach strip! You can't miss us — look for the big Cheers sign! 📍",
  },
}

function getMockResponse(message: string): { reply: string; suggestion?: Record<string, unknown> } {
  const lower = message.toLowerCase()

  for (const [keyword, response] of Object.entries(MOCK_RESPONSES)) {
    if (lower.includes(keyword)) return response
  }

  return {
    reply: "Thanks for asking! GrandCafe Cheers is your go-to spot in El Arenal, Mallorca — we've got an amazing World Kitchen menu, 50+ cocktails, 22 beers on tap, 15 sports screens, and DJ Winston Black from 22:00. What would you like to know more about?",
  }
}

const SYSTEM_PROMPT = `You are the friendly AI assistant for GrandCafe Cheers, a beachfront bar and restaurant in El Arenal, Platja de Palma, Mallorca.

VENUE INFO:
- Address: Carrer de Cartago 22, El Arenal (Platja de Palma), Mallorca 07600
- Hours: 10:30 - 03:00 daily (April 1 - November 1)
- Phone: +34 971 XXX XXX
- Instagram: @cheersmallorca (5.4K followers)
- Google Rating: 4.8/5

HIGHLIGHTS:
- World Kitchen menu with dishes from around the globe
- 50+ cocktails (signature: Cheers Sunset, Mallorca Mule, Beach Breeze)
- 22 craft beers on tap
- 15 sports screens (all major leagues)
- DJ Winston Black from 22:00 nightly
- Beachfront terrace with sea view
- Free parking nearby

BRAND VOICE: Casual, friendly, energetic. Tagline: "Little bites, big fiesta!" Target audience: Dutch, German, British tourists.

RULES:
- Keep responses short (2-3 sentences max)
- Be enthusiastic but not pushy
- If you can suggest booking details (date, time, party size, occasion), include them in a special format
- To suggest booking details, end your response with: |||SUGGESTION:{"key":"value"}|||
- Valid suggestion keys: occasion (casual/birthday/group/cocktails/sports/party), party_size (number), start_time (HH:MM), reservation_date (YYYY-MM-DD)
- Only suggest what's relevant to the conversation`

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { reply: "You're sending too many messages. Please wait a moment and try again!" },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const { message, history } = body as {
      message: string
      history?: { role: string; content: string }[]
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { reply: 'Please send a message!' },
        { status: 400 }
      )
    }

    // If no ANTHROPIC_API_KEY, use mock responses
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      const mock = getMockResponse(message)
      return NextResponse.json(mock)
    }

    // Real AI response using Anthropic API
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey })

    const messages = [
      ...(history || []).slice(-10).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ]

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages,
    })

    const text = response.content
      .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
      .map((block) => block.text)
      .join('')

    // Extract suggestion if present
    let reply = text
    let suggestion: Record<string, unknown> | undefined

    const suggestionMatch = text.match(/\|\|\|SUGGESTION:(\{.*?\})\|\|\|/)
    if (suggestionMatch) {
      reply = text.replace(suggestionMatch[0], '').trim()
      try {
        suggestion = JSON.parse(suggestionMatch[1])
      } catch {
        // ignore parse errors
      }
    }

    return NextResponse.json({ reply, suggestion })
  } catch (error) {
    console.error('Booking chat error:', error)
    // Fallback to mock on any error
    const body = await request.clone().json().catch(() => ({ message: '' }))
    const mock = getMockResponse(body.message || '')
    return NextResponse.json(mock)
  }
}
