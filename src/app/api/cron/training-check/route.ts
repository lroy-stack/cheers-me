import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/cron/training-check
 * Detects overdue training assignments and marks them as overdue.
 * Called by Vercel Cron or external scheduler.
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'Cron endpoint not configured' }, { status: 503 })
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  // Mark pending assignments as overdue if due_date has passed
  const { data: updated, error } = await supabase
    .from('training_assignments')
    .update({ status: 'overdue' })
    .eq('status', 'pending')
    .lt('due_date', today)
    .select('id, guide_code, assigned_to')

  if (error) {
    return NextResponse.json({ error: 'Failed to check training assignments' }, { status: 500 })
  }

  return NextResponse.json({
    marked_overdue: updated?.length ?? 0,
    checked_at: new Date().toISOString(),
  })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
