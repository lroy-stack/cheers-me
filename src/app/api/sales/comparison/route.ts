import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/sales/comparison
 * Get sales comparison with historical data (week/month/year ago)
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

  // Default to today if no date specified
  const targetDate = searchParams.get('date') || new Date().toISOString().split('T')[0]

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
  }

  // Use the database function to get comparison
  const { data, error } = await supabase.rpc('get_sales_comparison', {
    target_date: targetDate,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If no data found, return zeros
  if (!data || data.length === 0) {
    return NextResponse.json({
      date: targetDate,
      current: {
        revenue: 0,
        tickets: 0,
      },
      week_ago: {
        revenue: 0,
        tickets: 0,
        variance_pct: 0,
      },
      month_ago: {
        revenue: 0,
        tickets: 0,
        variance_pct: 0,
      },
      year_ago: {
        revenue: 0,
        tickets: 0,
        variance_pct: 0,
      },
    })
  }

  const comparison = data[0]

  return NextResponse.json({
    date: targetDate,
    current: {
      revenue: comparison.current_revenue || 0,
      tickets: comparison.current_tickets || 0,
    },
    week_ago: {
      revenue: comparison.week_ago_revenue || 0,
      tickets: comparison.week_ago_tickets || 0,
      variance_pct: comparison.week_variance_pct || 0,
    },
    month_ago: {
      revenue: comparison.month_ago_revenue || 0,
      tickets: comparison.month_ago_tickets || 0,
      variance_pct: comparison.month_variance_pct || 0,
    },
    year_ago: {
      revenue: comparison.year_ago_revenue || 0,
      tickets: comparison.year_ago_tickets || 0,
      variance_pct: comparison.year_variance_pct || 0,
    },
  })
}
