import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/ai/artifacts/[id]/versions — List all versions of an artifact
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get the artifact to find its root identifier
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

  // Find all versions: same identifier OR linked via parent_id chain
  const rootId = artifact.parent_id || artifact.id
  const { data: versions, error: queryError } = await supabase
    .from('ai_artifacts')
    .select('id, version, title, type, created_at')
    .or(`id.eq.${rootId},parent_id.eq.${rootId}`)
    .order('version', { ascending: true })

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  return NextResponse.json(versions || [])
}
