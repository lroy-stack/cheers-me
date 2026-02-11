import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/ai/artifacts/[id]/fork — Create a fork (new version branch)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { content, title } = body as { content?: string; title?: string }

  // Verify ownership
  const { data: artifact, error } = await supabase
    .from('ai_artifacts')
    .select('*, ai_conversations!inner(user_id)')
    .eq('id', id)
    .single()

  if (error || !artifact) {
    return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })
  }

  if ((artifact.ai_conversations as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fork creates a new artifact with a new identifier but linked via parent_id
  const { data: fork, error: insertError } = await supabase
    .from('ai_artifacts')
    .insert({
      conversation_id: artifact.conversation_id,
      message_id: artifact.message_id,
      type: artifact.type,
      identifier: crypto.randomUUID(),
      title: title || `${artifact.title} (Fork)`,
      content: content || artifact.content,
      version: 1,
      parent_id: artifact.id,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(fork, { status: 201 })
}
