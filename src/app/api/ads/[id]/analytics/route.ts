import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const analyticsSchema = z.object({
  type: z.enum(['impression', 'click']),
})

/**
 * POST /api/ads/[id]/analytics — Record impression or click (public)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = analyticsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const supabase = await createClient()
  const column = parsed.data.type === 'impression' ? 'impressions' : 'clicks'

  // Read current value then increment
  const { data, error: readError } = await supabase
    .from('advertisements')
    .select(column)
    .eq('id', id)
    .single()

  if (readError || !data) {
    return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
  }

  const currentValue = (data as Record<string, number>)[column] ?? 0
  const { error: updateError } = await supabase
    .from('advertisements')
    .update({ [column]: currentValue + 1 })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to record analytics' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
