import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/crm/customers/[id]/visit
 * Record a customer visit
 * - Increments visit_count
 * - Updates last_visit to today
 * - Automatically checks for loyalty milestones (5, 10, 20, 50, 100)
 * - Creates loyalty reward if milestone reached
 */
export async function POST(
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

  // Call the database function to record visit
  const { error: visitError } = await supabase
    .rpc('record_customer_visit', {
      p_customer_id: id,
    })

  if (visitError) {
    return NextResponse.json(
      { error: `Failed to record visit: ${visitError.message}` },
      { status: 500 }
    )
  }

  // Fetch updated customer data with any new loyalty rewards
  const { data: customer, error: fetchError } = await supabase
    .from('customers')
    .select(`
      *,
      loyalty_rewards(
        id,
        visit_milestone,
        reward_description,
        reward_issued_at,
        created_at
      )
    `)
    .eq('id', id)
    .single()

  if (fetchError) {
    return NextResponse.json(
      { error: `Failed to fetch customer: ${fetchError.message}` },
      { status: 500 }
    )
  }

  // Auto-promote to VIP if criteria met and not already VIP
  if (!customer.vip) {
    try {
      const adminSupabase = createAdminClient()
      const { data: vipSettings } = await adminSupabase
        .from('vip_settings')
        .select('visit_threshold, spent_threshold, auto_promote_enabled')
        .limit(1)
        .single()

      if (vipSettings?.auto_promote_enabled) {
        const meetsVisitThreshold = vipSettings.visit_threshold > 0 && customer.visit_count >= vipSettings.visit_threshold
        const meetsSpentThreshold = vipSettings.spent_threshold > 0
          ? (customer.total_spent ?? 0) >= vipSettings.spent_threshold
          : true

        if (meetsVisitThreshold && meetsSpentThreshold) {
          await adminSupabase
            .from('customers')
            .update({ vip: true })
            .eq('id', id)
          customer.vip = true
        }
      }
    } catch {
      // Non-critical: don't fail the visit record if VIP check fails
    }
  }

  // Check if a new reward was just issued (issued within last 10 seconds)
  const recentReward = customer.loyalty_rewards?.find((reward: any) => {
    const issuedAt = new Date(reward.reward_issued_at)
    const now = new Date()
    const diffInSeconds = (now.getTime() - issuedAt.getTime()) / 1000
    return diffInSeconds < 10
  })

  return NextResponse.json({
    customer,
    newReward: recentReward || null,
    message: recentReward
      ? `Visit recorded! Customer reached ${recentReward.visit_milestone} visits milestone.`
      : 'Visit recorded successfully.',
  })
}
