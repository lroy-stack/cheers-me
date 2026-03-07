import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  name: z.string().min(1).max(100),
  is_all_day: z.boolean().default(true),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
})

/**
 * GET /api/settings/holiday-closures
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const year = searchParams.get('year') || new Date().getFullYear().toString()

  const { data, error } = await supabase
    .from('holiday_closures')
    .select('*')
    .gte('date', `${year}-01-01`)
    .lte('date', `${year}-12-31`)
    .order('date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch closures' }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

/**
 * POST /api/settings/holiday-closures
 */
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
    .from('holiday_closures')
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create closure' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

/**
 * DELETE /api/settings/holiday-closures?id=xxx
 */
export async function DELETE(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
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
    .from('holiday_closures')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete closure' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
