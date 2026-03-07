import { createAdminClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const mergeSchema = z.object({
  source_id: z.string().uuid('Invalid source customer ID'),
  target_id: z.string().uuid('Invalid target customer ID'),
})

/**
 * POST /api/crm/customers/merge
 * Merge duplicate customers: transfer reviews, rewards, visits, reservations from source to target.
 * Source customer is soft-deleted after merge.
 * Requires admin or manager role.
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
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validation = mergeSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
  }

  const { source_id, target_id } = validation.data

  if (source_id === target_id) {
    return NextResponse.json({ error: 'Source and target must be different customers' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verify both customers exist
  const { data: source } = await supabase.from('customers').select('id, name, deleted_at').eq('id', source_id).single()
  const { data: target } = await supabase.from('customers').select('id, name').eq('id', target_id).single()

  if (!source) return NextResponse.json({ error: 'Source customer not found' }, { status: 404 })
  if (!target) return NextResponse.json({ error: 'Target customer not found' }, { status: 404 })
  if (source.deleted_at) return NextResponse.json({ error: 'Source customer is already deleted' }, { status: 400 })

  const results: Record<string, number> = {}

  // Transfer customer_reviews
  const { data: reviewsUpdated } = await supabase
    .from('customer_reviews')
    .update({ customer_id: target_id })
    .eq('customer_id', source_id)
    .select('id')
  results.reviews = reviewsUpdated?.length ?? 0

  // Transfer loyalty_rewards
  const { data: rewardsUpdated } = await supabase
    .from('loyalty_rewards')
    .update({ customer_id: target_id })
    .eq('customer_id', source_id)
    .select('id')
  results.rewards = rewardsUpdated?.length ?? 0

  // Transfer reservations
  const { data: reservationsUpdated } = await supabase
    .from('reservations')
    .update({ customer_id: target_id })
    .eq('customer_id', source_id)
    .select('id')
  results.reservations = reservationsUpdated?.length ?? 0

  // Transfer customer_visits if table exists
  // Transfer customer_visits if table exists (ignore errors if table doesn't exist)
  try {
    const visitsRes = await supabase
      .from('customer_visits')
      .update({ customer_id: target_id })
      .eq('customer_id', source_id)
      .select('id')
    results.visits = visitsRes.data?.length ?? 0
  } catch {
    results.visits = 0
  }

  // Transfer customer_tags if table exists (ignore errors if table doesn't exist)
  try {
    await supabase
      .from('customer_tags')
      .update({ customer_id: target_id })
      .eq('customer_id', source_id)
  } catch {
    // ignore
  }

  // Soft-delete source customer
  const { error: deleteError } = await supabase
    .from('customers')
    .update({ deleted_at: new Date().toISOString(), notes: `[Merged into customer ${target_id}]` })
    .eq('id', source_id)

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to soft-delete source customer' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    source_id,
    target_id,
    source_name: source.name,
    target_name: target.name,
    transferred: results,
  })
}
