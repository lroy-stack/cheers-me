import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PUT /api/ai/artifacts/[id] — Update artifact content/title (creates new version)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { content, title } = body as { content?: string; title?: string }

  if (!content && !title) {
    return NextResponse.json({ error: 'content or title required' }, { status: 400 })
  }

  // Verify ownership via conversation
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

  // Create new version (insert with parent_id pointing to original)
  const { data: newVersion, error: insertError } = await supabase
    .from('ai_artifacts')
    .insert({
      conversation_id: artifact.conversation_id,
      message_id: artifact.message_id,
      type: artifact.type,
      identifier: artifact.identifier,
      title: title || artifact.title,
      content: content || artifact.content,
      version: (artifact.version || 1) + 1,
      parent_id: artifact.parent_id || artifact.id,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(newVersion)
}
