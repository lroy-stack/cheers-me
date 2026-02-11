import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateEventMarketing } from '@/lib/ai/event-marketing'

// Validation schema for creating/updating event
const eventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (HH:MM or HH:MM:SS)'),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (HH:MM or HH:MM:SS)').optional(),
  event_type: z.enum(['dj_night', 'sports', 'themed_night', 'private_event', 'other']),
  dj_id: z.string().uuid().optional().nullable(),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
  // Sports-specific fields
  sport_name: z.string().max(100).optional().nullable(),
  home_team: z.string().max(255).optional().nullable(),
  away_team: z.string().max(255).optional().nullable(),
  broadcast_channel: z.string().max(100).optional().nullable(),
  match_info: z.string().optional().nullable(),
})

/**
 * GET /api/events
 * List all events with optional filters
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'dj', 'bar', 'waiter'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  // Optional filters
  const eventType = searchParams.get('event_type')
  const status = searchParams.get('status')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const djId = searchParams.get('dj_id')

  let query = supabase
    .from('events')
    .select(`
      *,
      dj:djs(
        id,
        name,
        genre,
        fee
      )
    `)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (eventType) {
    query = query.eq('event_type', eventType)
  }

  if (status) {
    query = query.eq('status', status)
  }

  if (startDate) {
    query = query.gte('event_date', startDate)
  }

  if (endDate) {
    query = query.lte('event_date', endDate)
  }

  if (djId) {
    query = query.eq('dj_id', djId)
  }

  const { data: events, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(events)
}

/**
 * POST /api/events
 * Create a new event (managers/admins only)
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = eventSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: validation.error.errors,
      },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Verify DJ exists if dj_id is provided
  if (validation.data.dj_id) {
    const { data: dj } = await supabase
      .from('djs')
      .select('id')
      .eq('id', validation.data.dj_id)
      .single()

    if (!dj) {
      return NextResponse.json(
        { error: 'DJ not found' },
        { status: 400 }
      )
    }
  }

  // Create event
  const { data: newEvent, error } = await supabase
    .from('events')
    .insert({
      ...validation.data,
      status: validation.data.status || 'pending',
    })
    .select(`
      *,
      dj:djs(
        id,
        name,
        genre,
        fee
      )
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // AUTO-MARKETING: Generate marketing draft for the new event
  // This runs asynchronously - we don't wait for it to complete
  // If it fails, the event is still created successfully
  if (process.env.ANTHROPIC_API_KEY) {
    // Fire and forget - don't block event creation
    generateEventMarketingDraft(newEvent, supabase).catch((err) => {
      console.error('Failed to auto-generate marketing draft:', err)
      // Silently fail - the draft can be generated manually later
    })
  } else {
    console.warn('ANTHROPIC_API_KEY not set - skipping auto-marketing generation')
  }

  return NextResponse.json(newEvent, { status: 201 })
}

/**
 * Helper function to generate marketing draft for a newly created event
 * Runs asynchronously after event creation
 */
async function generateEventMarketingDraft(
  event: any,
  supabase: any
): Promise<void> {
  try {
    // Prepare input for AI generation
    const marketingInput = {
      eventTitle: event.title,
      eventType: event.event_type,
      eventDate: event.event_date,
      startTime: event.start_time,
      description: event.description,
      djName: event.dj?.name,
      djGenre: event.dj?.genre,
      sportName: event.sport_name,
      homeTeam: event.home_team,
      awayTeam: event.away_team,
      broadcastChannel: event.broadcast_channel,
    }

    // Generate marketing content using Claude
    const marketingContent = await generateEventMarketing(marketingInput)

    // Store the generated draft in the database
    const { error: insertError } = await supabase
      .from('event_marketing_drafts')
      .insert({
        event_id: event.id,
        social_caption: marketingContent.social_caption,
        social_hashtags: marketingContent.social_hashtags,
        suggested_platforms: marketingContent.suggested_platforms,
        newsletter_mention: marketingContent.newsletter_mention,
        approved: false,
        published: false,
      })

    if (insertError) {
      console.error('Failed to save marketing draft:', insertError)
      throw insertError
    }

    console.log(`✅ Auto-generated marketing draft for event: ${event.id}`)
  } catch (error) {
    console.error('Error in generateEventMarketingDraft:', error)
    throw error
  }
}
