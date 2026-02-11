import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/crm/insights
 * Get customer intelligence dashboard metrics
 * Returns aggregated CRM data:
 * - Total customers
 * - VIP customers count
 * - Average visit count
 * - Customers active this month
 * - Total reviews
 * - Average rating
 * - Sentiment breakdown (positive/neutral/negative)
 * - Pending review responses
 * - Upcoming birthdays (7 days)
 * - Loyalty rewards issued this month
 */
export async function GET(_request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()

  // Call the database function to get insights
  const { data, error } = await supabase
    .rpc('get_customer_insights')

  if (error) {
    return NextResponse.json(
      { error: `Failed to fetch insights: ${error.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}
