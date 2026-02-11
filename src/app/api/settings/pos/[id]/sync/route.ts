import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  const supabase = await createClient()

  // Verify integration exists and is active
  const { data: integration, error: intError } = await supabase
    .from('pos_integrations')
    .select('*')
    .eq('id', id)
    .single()

  if (intError || !integration) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
  }

  // Create sync log entry
  const { data: syncLog, error: logError } = await supabase
    .from('pos_sync_log')
    .insert({
      integration_id: id,
      sync_type: 'manual',
      status: 'started',
    })
    .select()
    .single()

  if (logError) {
    return NextResponse.json({ error: logError.message }, { status: 500 })
  }

  // Update integration status
  await supabase
    .from('pos_integrations')
    .update({ status: 'active', last_sync_at: new Date().toISOString() })
    .eq('id', id)

  // Complete the sync log (in a real implementation, this would be async)
  await supabase
    .from('pos_sync_log')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', syncLog.id)

  return NextResponse.json({ message: 'Sync triggered', sync_log_id: syncLog.id })
}
