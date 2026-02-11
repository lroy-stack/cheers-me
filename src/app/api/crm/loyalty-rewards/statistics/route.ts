import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'

/**
 * GET /api/crm/loyalty-rewards/statistics
 * Get comprehensive loyalty program statistics
 * - Total rewards issued/redeemed/pending
 * - Redemption rate
 * - Breakdown by milestone
 * - Average redemption time
 * - Monthly statistics
 */
export async function GET() {
  const authResult = await requireRole(['admin', 'manager', 'owner'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()

  // Call the database function
  const { data, error } = await supabase
    .rpc('get_loyalty_statistics')

  if (error) {
    return NextResponse.json(
      { error: `Failed to fetch loyalty statistics: ${error.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}
