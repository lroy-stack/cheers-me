import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/crm/anniversaries
 * Get customers with upcoming anniversaries
 * Query params:
 * - days_ahead: number of days to look ahead (default 7, max 365)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'waiter'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  // Get days_ahead parameter (default 7, max 365)
  const daysAhead = Math.min(
    parseInt(searchParams.get('days_ahead') || '7'),
    365
  )

  // Call the database function
  const { data, error } = await supabase
    .rpc('get_upcoming_anniversaries', {
      days_ahead: daysAhead,
    })

  if (error) {
    return NextResponse.json(
      { error: `Failed to fetch anniversaries: ${error.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({
    data,
    days_ahead: daysAhead,
    count: data?.length || 0,
  })
}
