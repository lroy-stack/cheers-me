import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * POST /api/crm/loyalty-rewards/[id]/redeem
 * Redeem a loyalty reward
 * Body:
 * - notes: optional notes about the redemption
 */

const redeemSchema = z.object({
  notes: z.string().optional(),
})

export async function POST(
  request: NextRequest,
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

  // Parse request body
  let body
  try {
    body = await request.json()
    redeemSchema.parse(body)
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }

  const { notes } = body

  // Call the database function to redeem the reward
  const { data, error } = await supabase
    .rpc('redeem_loyalty_reward', {
      p_reward_id: id,
      p_redeemed_by: authResult.data.user.id,
      p_notes: notes || null,
    })

  if (error) {
    return NextResponse.json(
      { error: `Failed to redeem reward: ${error.message}` },
      { status: 500 }
    )
  }

  // Check if redemption was successful
  if (!data.success) {
    return NextResponse.json(
      { error: data.error },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    reward: data.reward,
    message: 'Reward redeemed successfully',
  })
}
