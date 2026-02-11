import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/crm/loyalty-rewards
 * List all loyalty rewards with filtering and pagination
 * Query params:
 * - page: page number (default 1)
 * - limit: items per page (default 50, max 100)
 * - customer_id: filter by customer UUID
 * - milestone: filter by visit milestone (5, 10, 20, 50, 100)
 * - sort: sort by field (default 'reward_issued_at')
 * - order: sort order (asc/desc, default 'desc')
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

  // Pagination
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const from = (page - 1) * limit
  const to = from + limit - 1

  // Filters
  const customerIdFilter = searchParams.get('customer_id')
  const milestoneFilter = searchParams.get('milestone')

  // Sorting
  const sortField = searchParams.get('sort') || 'reward_issued_at'
  const sortOrder = (searchParams.get('order') || 'desc') as 'asc' | 'desc'

  let query = supabase
    .from('loyalty_rewards')
    .select(`
      *,
      customer:customers(
        id,
        name,
        email,
        phone,
        vip,
        visit_count
      )
    `, { count: 'exact' })
    .order(sortField, { ascending: sortOrder === 'asc' })
    .range(from, to)

  // Apply filters
  if (customerIdFilter) {
    query = query.eq('customer_id', customerIdFilter)
  }

  if (milestoneFilter) {
    query = query.eq('visit_milestone', parseInt(milestoneFilter))
  }

  const { data: rewards, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data: rewards,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  })
}
