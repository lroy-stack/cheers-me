import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating review
const createReviewSchema = z.object({
  customer_id: z.string().uuid().optional().nullable(),
  platform: z.string().min(1).max(100),
  rating: z.number().min(0).max(5).optional().nullable(),
  review_text: z.string(),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
})

/**
 * GET /api/crm/reviews
 * List all reviews with filtering and pagination
 * Query params:
 * - page: page number (default 1)
 * - limit: items per page (default 50, max 100)
 * - platform: filter by platform (TripAdvisor, Google, Restaurant Guru)
 * - sentiment: filter by sentiment (positive, neutral, negative)
 * - pending: filter by pending response (true/false)
 * - sort: sort by field (default 'created_at')
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
  const platformFilter = searchParams.get('platform')
  const sentimentFilter = searchParams.get('sentiment')
  const pendingFilter = searchParams.get('pending')

  // Sorting
  const sortField = searchParams.get('sort') || 'created_at'
  const sortOrder = (searchParams.get('order') || 'desc') as 'asc' | 'desc'

  let query = supabase
    .from('customer_reviews')
    .select(`
      *,
      customer:customers(
        id,
        name,
        email,
        vip
      )
    `, { count: 'exact' })
    .order(sortField, { ascending: sortOrder === 'asc' })
    .range(from, to)

  // Apply filters
  if (platformFilter) {
    query = query.eq('platform', platformFilter)
  }

  if (sentimentFilter) {
    query = query.eq('sentiment', sentimentFilter)
  }

  if (pendingFilter === 'true') {
    query = query.is('response_sent', null)
  }

  const { data: reviews, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data: reviews,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  })
}

/**
 * POST /api/crm/reviews
 * Create a new review (manual import from review platforms)
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = createReviewSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: validation.error.errors,
      },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // If customer_id provided, verify it exists
  if (validation.data.customer_id) {
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', validation.data.customer_id)
      .single()

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }
  }

  // Create review record
  const { data: newReview, error } = await supabase
    .from('customer_reviews')
    .insert({
      customer_id: validation.data.customer_id,
      platform: validation.data.platform,
      rating: validation.data.rating,
      review_text: validation.data.review_text,
      sentiment: validation.data.sentiment,
    })
    .select(`
      *,
      customer:customers(
        id,
        name,
        email,
        vip
      )
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(newReview, { status: 201 })
}
