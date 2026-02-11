import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/crm/customers/[id]/loyalty-rewards
 * Get unredeemed loyalty rewards for a specific customer
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'waiter'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params
  const supabase = await createClient()

  // Verify customer exists
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id, name, visit_count')
    .eq('id', id)
    .single()

  if (customerError || !customer) {
    return NextResponse.json(
      { error: 'Customer not found' },
      { status: 404 }
    )
  }

  // Get unredeemed rewards
  const { data: unredeemedRewards, error: unredeemedError } = await supabase
    .rpc('get_customer_unredeemed_rewards', {
      p_customer_id: id,
    })

  if (unredeemedError) {
    return NextResponse.json(
      { error: `Failed to fetch unredeemed rewards: ${unredeemedError.message}` },
      { status: 500 }
    )
  }

  // Get all rewards (for history)
  const { data: allRewards, error: allRewardsError } = await supabase
    .from('loyalty_rewards')
    .select(`
      *,
      redeemer:redeemed_by(
        id,
        name,
        email
      )
    `)
    .eq('customer_id', id)
    .order('reward_issued_at', { ascending: false })

  if (allRewardsError) {
    return NextResponse.json(
      { error: `Failed to fetch all rewards: ${allRewardsError.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({
    customer: {
      id: customer.id,
      name: customer.name,
      visit_count: customer.visit_count,
    },
    unredeemed: unredeemedRewards || [],
    all_rewards: allRewards || [],
    stats: {
      total_rewards: allRewards?.length || 0,
      unredeemed_count: unredeemedRewards?.length || 0,
      redeemed_count: allRewards?.filter((r: any) => r.redeemed_at).length || 0,
    },
  })
}
