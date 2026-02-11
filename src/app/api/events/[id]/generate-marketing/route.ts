import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { generateEventMarketing } from '@/lib/ai/event-marketing'

/**
 * POST /api/events/[id]/generate-marketing
 * Manually trigger marketing content generation for an event
 * Useful for:
 * - Events created before auto-marketing was implemented
 * - Re-generating marketing content with updated event details
 * - Retry if auto-generation failed
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'Claude API key not configured. Cannot generate marketing content.' },
      { status: 500 }
    )
  }

  const { id } = await params
  const supabase = await createClient()

  // Fetch event details with DJ information
  const { data: event, error: eventError } = await supabase
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
    .eq('id', id)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

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

    // Check if draft already exists
    const { data: existingDraft } = await supabase
      .from('event_marketing_drafts')
      .select('id')
      .eq('event_id', id)
      .single()

    let savedDraft

    if (existingDraft) {
      // Update existing draft
      const { data: updatedDraft, error: updateError } = await supabase
        .from('event_marketing_drafts')
        .update({
          social_caption: marketingContent.social_caption,
          social_hashtags: marketingContent.social_hashtags,
          suggested_platforms: marketingContent.suggested_platforms,
          newsletter_mention: marketingContent.newsletter_mention,
          generated_at: new Date().toISOString(),
          approved: false, // Reset approval status when regenerating
        })
        .eq('event_id', id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }
      savedDraft = updatedDraft
    } else {
      // Create new draft
      const { data: newDraft, error: insertError } = await supabase
        .from('event_marketing_drafts')
        .insert({
          event_id: id,
          social_caption: marketingContent.social_caption,
          social_hashtags: marketingContent.social_hashtags,
          suggested_platforms: marketingContent.suggested_platforms,
          newsletter_mention: marketingContent.newsletter_mention,
          approved: false,
          published: false,
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }
      savedDraft = newDraft
    }

    return NextResponse.json({
      success: true,
      message: 'Marketing content generated successfully',
      draft: savedDraft,
    })
  } catch (error) {
    console.error('Error generating marketing content:', error)

    return NextResponse.json(
      {
        error: 'Failed to generate marketing content',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
