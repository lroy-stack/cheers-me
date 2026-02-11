import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating/updating daily sales
const dailySalesSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  food_revenue: z.number().min(0).default(0),
  drinks_revenue: z.number().min(0).default(0),
  cocktails_revenue: z.number().min(0).default(0),
  desserts_revenue: z.number().min(0).default(0),
  other_revenue: z.number().min(0).default(0),
  tips: z.number().min(0).default(0),
  ticket_count: z.number().int().min(0).default(0),
})

/**
 * GET /api/sales/daily
 * List daily sales records with optional date range filtering
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

  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 30

  let query = supabase
    .from('daily_sales')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit)

  if (startDate) {
    query = query.gte('date', startDate)
  }

  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data: sales, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(sales)
}

/**
 * POST /api/sales/daily
 * Create or update daily sales record (upsert by date)
 * Accessible by: admin, manager
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
  const validation = dailySalesSchema.safeParse(body)
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

  // Calculate total_revenue
  const totalRevenue =
    validation.data.food_revenue +
    validation.data.drinks_revenue +
    validation.data.cocktails_revenue +
    validation.data.desserts_revenue +
    validation.data.other_revenue

  // Upsert daily sales record (update if date exists, insert if not)
  const { data: dailySales, error } = await supabase
    .from('daily_sales')
    .upsert(
      {
        date: validation.data.date,
        food_revenue: validation.data.food_revenue,
        drinks_revenue: validation.data.drinks_revenue,
        cocktails_revenue: validation.data.cocktails_revenue,
        desserts_revenue: validation.data.desserts_revenue,
        other_revenue: validation.data.other_revenue,
        tips: validation.data.tips,
        total_revenue: totalRevenue,
        ticket_count: validation.data.ticket_count,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'date',
      }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(dailySales, { status: 201 })
}
