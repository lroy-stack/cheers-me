import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/crm/loyalty-rewards/top-customers
 * Get top customers by loyalty program participation
 * Query params:
 * - limit: number of customers to return (default 10, max 50)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  // Get limit parameter (default 10, max 50)
  const limit = Math.min(
    parseInt(searchParams.get('limit') || '10'),
    50
  )

  // Call the database function
  const { data, error } = await supabase
    .rpc('get_top_loyalty_customers', {
      p_limit: limit,
    })

  if (error) {
    return NextResponse.json(
      { error: `Failed to fetch top loyalty customers: ${error.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({
    data,
    count: data?.length || 0,
  })
}
