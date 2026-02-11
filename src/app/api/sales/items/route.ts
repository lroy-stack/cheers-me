import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating sales items
const salesItemSchema = z.object({
  daily_sales_id: z.string().uuid(),
  menu_item_id: z.string().uuid().nullable().optional(),
  item_name: z.string().min(1).max(255),
  category: z.string().min(1).max(100),
  quantity: z.number().int().min(1),
  unit_price: z.number().min(0),
  total_price: z.number().min(0),
  recorded_at: z.string().datetime().optional(),
})

// Batch insert schema
const batchSalesItemsSchema = z.object({
  items: z.array(salesItemSchema).min(1).max(100), // Limit to 100 items per batch
})

/**
 * GET /api/sales/items
 * List sales items with optional filtering
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

  const dailySalesId = searchParams.get('daily_sales_id')
  const category = searchParams.get('category')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100

  let query = supabase
    .from('sales_items')
    .select('*')
    .order('recorded_at', { ascending: false })
    .limit(limit)

  if (dailySalesId) {
    query = query.eq('daily_sales_id', dailySalesId)
  }

  if (category) {
    query = query.eq('category', category)
  }

  if (startDate) {
    query = query.gte('recorded_at', `${startDate}T00:00:00`)
  }

  if (endDate) {
    query = query.lte('recorded_at', `${endDate}T23:59:59`)
  }

  const { data: items, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(items)
}

/**
 * POST /api/sales/items
 * Create sales items (single or batch)
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

  const supabase = await createClient()

  // Check if this is a batch insert or single item
  if (Array.isArray(body.items)) {
    // Batch insert
    const validation = batchSalesItemsSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { data: items, error } = await supabase
      .from('sales_items')
      .insert(validation.data.items)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      message: `${items.length} items created successfully`,
      items,
    }, { status: 201 })
  } else {
    // Single item insert
    const validation = salesItemSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { data: item, error } = await supabase
      .from('sales_items')
      .insert(validation.data)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(item, { status: 201 })
  }
}
