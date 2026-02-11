import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/sales/top-sellers
 * Get top selling items by revenue for a date range
 * Accessible by: admin, manager, owner
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

  const period = searchParams.get('period') || 'daily' // daily, weekly, monthly, or custom
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10
  const category = searchParams.get('category') // Optional category filter

  let query

  // Use the appropriate view based on period
  if (period === 'weekly') {
    query = supabase.from('top_sellers_weekly').select('*')
  } else if (period === 'monthly') {
    query = supabase.from('top_sellers_monthly').select('*')
  } else if (period === 'custom' && startDate && endDate) {
    // Use the database function for custom date range
    const { data, error } = await supabase.rpc('get_top_sellers', {
      start_date: startDate,
      end_date: endDate,
      limit_count: limit,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter by category if specified
    const filteredData = category
      ? data?.filter((item: any) => item.category === category)
      : data

    return NextResponse.json({
      period: 'custom',
      start_date: startDate,
      end_date: endDate,
      limit,
      category: category || 'all',
      top_sellers: filteredData || [],
    })
  } else {
    // Default to daily view
    query = supabase.from('top_sellers_daily').select('*')
  }

  // Add date filtering for views
  if (startDate && period !== 'custom') {
    if (period === 'weekly') {
      query = query.gte('week_start', startDate)
    } else if (period === 'monthly') {
      query = query.gte('month_start', startDate)
    } else {
      query = query.gte('sale_date', startDate)
    }
  }

  if (endDate && period !== 'custom') {
    if (period === 'weekly') {
      query = query.lte('week_start', endDate)
    } else if (period === 'monthly') {
      query = query.lte('month_start', endDate)
    } else {
      query = query.lte('sale_date', endDate)
    }
  }

  // Category filter
  if (category) {
    query = query.eq('category', category)
  }

  // Apply limit and order
  query = query.order('total_revenue', { ascending: false }).limit(limit)

  const { data: topSellers, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    period,
    start_date: startDate || null,
    end_date: endDate || null,
    limit,
    category: category || 'all',
    top_sellers: topSellers || [],
  })
}
