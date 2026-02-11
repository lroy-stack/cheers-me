import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createConversationService } from '@/lib/ai/conversation-service'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createConversationService(supabase)
    const conversations = await service.listConversations(user.id)
    return NextResponse.json(conversations)
  } catch (error) {
    console.error('List conversations error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list conversations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const service = createConversationService(supabase)
    const conversation = await service.createConversation(user.id, body.title)
    return NextResponse.json(conversation, { status: 201 })
  } catch (error) {
    console.error('Create conversation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create conversation' },
      { status: 500 }
    )
  }
}
