import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating daily sales
const updateDailySalesSchema = z.object({
  food_revenue: z.number().min(0).optional(),
  drinks_revenue: z.number().min(0).optional(),
  cocktails_revenue: z.number().min(0).optional(),
  desserts_revenue: z.number().min(0).optional(),
  other_revenue: z.number().min(0).optional(),
  tips: z.number().min(0).optional(),
  ticket_count: z.number().int().min(0).optional(),
})

/**
 * GET /api/sales/daily/[date]
 * Get daily sales record for specific date
 * Accessible by: admin, manager, owner
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { date } = await params

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: sales, error } = await supabase
    .from('daily_sales')
    .select('*')
    .eq('date', date)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Sales record not found for this date' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(sales)
}

/**
 * PATCH /api/sales/daily/[date]
 * Update daily sales record for specific date
 * Accessible by: admin, manager
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { date } = await params

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = updateDailySalesSchema.safeParse(body)
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

  // First, get the existing record to calculate new total if needed
  const { data: existingSales, error: fetchError } = await supabase
    .from('daily_sales')
    .select('*')
    .eq('date', date)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Sales record not found for this date' }, { status: 404 })
    }
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  // Calculate new total_revenue if any revenue fields are updated
  const updatedData: Record<string, unknown> = {
    ...validation.data,
    updated_at: new Date().toISOString(),
  }

  // Recalculate total if any revenue field changed
  if (
    validation.data.food_revenue !== undefined ||
    validation.data.drinks_revenue !== undefined ||
    validation.data.cocktails_revenue !== undefined ||
    validation.data.desserts_revenue !== undefined ||
    validation.data.other_revenue !== undefined
  ) {
    updatedData.total_revenue =
      (validation.data.food_revenue ?? existingSales.food_revenue) +
      (validation.data.drinks_revenue ?? existingSales.drinks_revenue) +
      (validation.data.cocktails_revenue ?? existingSales.cocktails_revenue) +
      (validation.data.desserts_revenue ?? existingSales.desserts_revenue) +
      (validation.data.other_revenue ?? existingSales.other_revenue)
  }

  const { data: updatedSales, error: updateError } = await supabase
    .from('daily_sales')
    .update(updatedData)
    .eq('date', date)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(updatedSales)
}

/**
 * DELETE /api/sales/daily/[date]
 * Delete daily sales record for specific date
 * Accessible by: admin
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const authResult = await requireRole(['admin'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { date } = await params

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
  }

  const supabase = await createClient()

  const { error } = await supabase.from('daily_sales').delete().eq('date', date)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Daily sales record deleted successfully' })
}
