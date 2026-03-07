import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const posUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  provider: z.string().min(1).max(50).optional(),
  api_url: z.string().url().optional(),
  api_key: z.string().optional(),
  is_active: z.boolean().optional(),
  sync_interval_minutes: z.number().int().min(1).max(1440).optional(),
  last_sync_at: z.string().datetime().optional(),
  settings: z.record(z.unknown()).optional(),
}).strict()

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pos_integrations')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validation = posUpdateSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.errors },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pos_integrations')
    .update(validation.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to update POS integration' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  const supabase = await createClient()

  const { error } = await supabase
    .from('pos_integrations')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
