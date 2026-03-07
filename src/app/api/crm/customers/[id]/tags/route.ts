import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const addTagSchema = z.object({
  tag: z.string().min(1).max(50).trim(),
})

/**
 * GET /api/crm/customers/[id]/tags
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'waiter'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customer_tags')
    .select('id, tag, created_at')
    .eq('customer_id', id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

/**
 * POST /api/crm/customers/[id]/tags
 * Add a tag to a customer
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'waiter'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = addTagSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customer_tags')
    .insert({ customer_id: id, tag: parsed.data.tag })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Tag already exists for this customer' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to add tag' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

/**
 * DELETE /api/crm/customers/[id]/tags?tag=xxx
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'waiter'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const tag = searchParams.get('tag')

  if (!tag) {
    return NextResponse.json({ error: 'tag query param required' }, { status: 400 })
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('customer_tags')
    .delete()
    .eq('customer_id', id)
    .eq('tag', tag)

  if (error) {
    return NextResponse.json({ error: 'Failed to remove tag' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
