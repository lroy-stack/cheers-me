import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

/**
 * POST /api/crm/reviews/[id]/generate-response
 * Generate an AI-powered response draft for a review using Claude API
 * - Fetches the review and customer info
 * - Calls Claude API to generate a professional, friendly response
 * - Stores the draft in response_draft field
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

  const { id } = await params
  const supabase = await createClient()

  // Fetch the review
  const { data: review, error: fetchError } = await supabase
    .from('customer_reviews')
    .select(`
      *,
      customer:customers(
        id,
        name,
        vip
      )
    `)
    .eq('id', id)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  // Build prompt for Claude API
  const systemPrompt = `You are the manager of GrandCafe Cheers, a beachfront restaurant in El Arenal, Mallorca. You respond to customer reviews professionally, warmly, and authentically.

Key guidelines:
- Thank the customer for their feedback
- Address specific points mentioned in the review
- Be warm and genuine (avoid corporate language)
- Keep it 2-3 sentences maximum
- For negative reviews: acknowledge the issue and offer to make it right
- For positive reviews: express gratitude and invite them back
- Match the tone to the rating (enthusiastic for 5 stars, apologetic for 1-2 stars)`

  const userPrompt = `Generate a professional response to this customer review:

Platform: ${review.platform}
Rating: ${review.rating ? `${review.rating} / 5 stars` : 'No rating'}
Sentiment: ${review.sentiment}
Review: "${review.review_text}"
${review.customer?.vip ? '\n(Note: This is a VIP customer)' : ''}

Write a response that matches the tone of the review and rating. Return ONLY the response text, no preamble.`

  try {
    // Call Claude API
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    })

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    // Extract the text response
    const responseDraft = response.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('\n')
      .trim()

    if (!responseDraft) {
      return NextResponse.json(
        { error: 'Failed to generate response' },
        { status: 500 }
      )
    }

    // Store the draft using database function
    const { error: updateError } = await supabase
      .rpc('generate_review_response_draft', {
        p_review_id: id,
        p_response_draft: responseDraft,
      })

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to save draft: ${updateError.message}` },
        { status: 500 }
      )
    }

    // Fetch updated review
    const { data: updatedReview } = await supabase
      .from('customer_reviews')
      .select(`
        *,
        customer:customers(
          id,
          name,
          email,
          vip
        )
      `)
      .eq('id', id)
      .single()

    return NextResponse.json({
      review: updatedReview,
      draft: responseDraft,
      message: 'Response draft generated successfully',
    })
  } catch (error) {
    console.error('Claude API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate response with AI',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
