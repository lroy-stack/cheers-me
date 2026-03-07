import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/cron/cleanup-pending-coupons
 * Cleans up coupons stuck in 'pending_payment' status for more than 24 hours.
 * Called by a cron job (Vercel Cron or external scheduler).
 * Protected by CRON_SECRET bearer token.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('gift_coupons')
    .update({ status: 'expired' })
    .eq('status', 'pending_payment')
    .lt('created_at', cutoff)
    .select('id')

  if (error) {
    console.error('[cron/cleanup-pending-coupons] Error:', error.message)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }

  const count = data?.length ?? 0
  console.log(`[cron/cleanup-pending-coupons] Expired ${count} stale pending_payment coupons`)

  return NextResponse.json({
    success: true,
    expired: count,
    cutoff,
  })
}
