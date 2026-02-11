import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const mappingSchema = z.object({
  menu_item_id: z.string().uuid(),
  external_item_id: z.string().min(1),
  external_item_name: z.string().optional(),
})

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
    .from('pos_item_mappings')
    .select('*, menu_item:menu_items(id, name_en, price)')
    .eq('integration_id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  const body = await request.json()
  const validation = mappingSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pos_item_mappings')
    .insert({ integration_id: id, ...validation.data })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const mappingId = searchParams.get('mapping_id')

  if (!mappingId) {
    return NextResponse.json({ error: 'mapping_id required' }, { status: 400 })
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('pos_item_mappings')
    .delete()
    .eq('id', mappingId)
    .eq('integration_id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
