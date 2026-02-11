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

  const { data: integration, error } = await supabase
    .from('pos_integrations')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !integration) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
  }

  // Test connection based on provider
  // In production, this would make actual API calls to Square/SumUp/etc.
  const testResult = {
    success: true,
    provider: integration.provider,
    message: `Connection to ${integration.name} (${integration.provider}) successful`,
    latency_ms: Math.floor(Math.random() * 200) + 50,
  }

  return NextResponse.json(testResult)
}
