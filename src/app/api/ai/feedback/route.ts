import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/ai/feedback
 * Records user feedback (thumbs up/down) on AI messages.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    message_id?: string
    conversation_id?: string
    rating?: string
    reason?: string
    comment?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { message_id, rating, reason, comment } = body

  if (!message_id || !rating) {
    return NextResponse.json({ error: 'message_id and rating are required' }, { status: 400 })
  }

  if (rating !== 'positive' && rating !== 'negative') {
    return NextResponse.json({ error: 'rating must be positive or negative' }, { status: 400 })
  }

  // Verify message belongs to user's conversation
  const { data: message } = await supabase
    .from('ai_conversation_messages')
    .select('id, conversation_id')
    .eq('id', message_id)
    .single()

  if (message) {
    const { data: conv } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('id', message.conversation_id)
      .eq('user_id', user.id)
      .single()

    if (!conv) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }
  }

  const { error: insertError } = await supabase
    .from('ai_message_feedback')
    .insert({
      message_id,
      user_id: user.id,
      rating,
      reason: reason || null,
      comment: comment || null,
    })

  if (insertError) {
    console.error('Feedback insert error:', insertError)
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
