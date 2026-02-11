import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/crm/vip-customers
 * Get all VIP customers
 * Returns customers sorted by visit count (desc) and last visit (desc)
 */
export async function GET(_request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'waiter'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()

  // Call the database function
  const { data, error } = await supabase
    .rpc('get_vip_customers')

  if (error) {
    return NextResponse.json(
      { error: `Failed to fetch VIP customers: ${error.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({
    data,
    count: data?.length || 0,
  })
}
