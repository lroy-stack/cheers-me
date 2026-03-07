import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createSchema = z.object({
  guide_code: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  passing_score: z.number().int().min(1).max(100).default(70),
  category: z.string().max(50).optional().nullable(),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  passing_score: z.number().int().min(1).max(100).optional(),
  category: z.string().max(50).optional().nullable(),
})

export async function GET() {
  const authResult = await requireAuth()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const supabase = await createClient()

  const { data: materials, error } = await supabase
    .from('training_materials')
    .select('*')
    .order('guide_code')

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 })
  }

  return NextResponse.json(materials || [])
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('training_materials')
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Guide code already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create material' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 })
  }

  const { id, ...updates } = parsed.data
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('training_materials')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to update material' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireRole(['admin', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id query param required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('training_materials')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete material' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
