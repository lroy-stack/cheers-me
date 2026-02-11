import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for financial targets
const targetSchema = z.object({
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  target_food_cost_ratio: z.number().min(0).max(100).optional(),
  target_beverage_cost_ratio: z.number().min(0).max(100).optional(),
  target_labor_cost_ratio: z.number().min(0).max(100).optional(),
  target_revenue: z.number().positive().optional(),
  target_profit_margin: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
})

/**
 * GET /api/finance/targets
 * Get financial targets
 * Query params: date (get active target for date), all (get all targets)
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

  const date = searchParams.get('date')
  const all = searchParams.get('all') === 'true'

  if (date) {
    // Get target for specific date
    const { data: target, error } = await supabase
      .from('financial_targets')
      .select('*')
      .lte('period_start', date)
      .gte('period_end', date)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      date,
      target: target || null,
    })
  }

  if (all) {
    // Get all targets
    const { data: targets, error } = await supabase
      .from('financial_targets')
      .select('*')
      .order('period_start', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      targets: targets || [],
      count: targets?.length || 0,
    })
  }

  // Get current active target
  const today = new Date().toISOString().split('T')[0]
  const { data: currentTarget, error } = await supabase
    .from('financial_targets')
    .select('*')
    .lte('period_start', today)
    .gte('period_end', today)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    current_target: currentTarget || null,
  })
}

/**
 * POST /api/finance/targets
 * Create a new financial target
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

  const supabase = await createClient()

  try {
    const body = await request.json()

    // Validate request body
    const validatedData = targetSchema.parse(body)

    // Ensure period_end is after period_start
    if (validatedData.period_end <= validatedData.period_start) {
      return NextResponse.json(
        { error: 'period_end must be after period_start' },
        { status: 400 }
      )
    }

    // Insert target
    const { data: target, error } = await supabase
      .from('financial_targets')
      .insert(validatedData)
      .select()
      .single()

    if (error) {
      console.error('Failed to create financial target:', error)
      return NextResponse.json(
        { error: 'Failed to create target', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Financial target created successfully',
        target,
      },
      { status: 201 }
    )
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: err.errors },
        { status: 400 }
      )
    }
    console.error('Error in targets POST:', err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
