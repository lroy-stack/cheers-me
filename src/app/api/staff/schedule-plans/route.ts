import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createPlanSchema = z.object({
  week_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
})

/**
 * GET /api/staff/schedule-plans
 * Get schedule plan for a specific week (with shifts)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const weekStartDate = searchParams.get('week_start_date')

  if (!weekStartDate) {
    return NextResponse.json({ error: 'week_start_date is required' }, { status: 400 })
  }

  // Fetch all plans for this week (newest first)
  const { data: plans, error } = await supabase
    .from('schedule_plans')
    .select('*')
    .eq('week_start_date', weekStartDate)
    .order('version', { ascending: false })

  if (error) {
    if (error.message?.includes('relation') || error.code === '42P01') {
      return NextResponse.json({ plan: null, shifts: [] })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!plans || plans.length === 0) {
    return NextResponse.json({ plan: null, shifts: [] })
  }

  // Strategy: find the best plan to show
  // 1. Draft (newest version) — this is the "working copy"
  // 2. If no draft, the newest published version
  const draftPlan = plans.find((p) => p.status === 'draft')
  const publishedPlan = plans.find((p) => p.status === 'published')
  const activePlan = draftPlan || publishedPlan || plans[0]

  // Fetch shifts for the active plan
  const { data: activeShifts, error: shiftsError } = await supabase
    .from('shifts')
    .select(`
      *,
      employee:employees(
        id,
        profile:profiles(
          id,
          full_name,
          role
        )
      )
    `)
    .eq('schedule_plan_id', activePlan.id)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  if (shiftsError) {
    return NextResponse.json({ error: shiftsError.message }, { status: 500 })
  }

  let shifts = activeShifts || []

  // If active plan is a draft with 0 shifts AND there's a published version,
  // load published shifts as the base (so the grid isn't empty)
  if (activePlan.status === 'draft' && shifts.length === 0 && publishedPlan) {
    const { data: publishedShifts } = await supabase
      .from('shifts')
      .select(`
        *,
        employee:employees(
          id,
          profile:profiles(
            id,
            full_name,
            role
          )
        )
      `)
      .eq('schedule_plan_id', publishedPlan.id)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    shifts = publishedShifts || []
  }

  return NextResponse.json({ plan: activePlan, shifts })
}

/**
 * POST /api/staff/schedule-plans
 * Create a new schedule plan (managers/admins only)
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validation = createPlanSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.errors },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Get next version for this week
  const { data: existing, error: existingError } = await supabase
    .from('schedule_plans')
    .select('version')
    .eq('week_start_date', validation.data.week_start_date)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingError && (existingError.message?.includes('relation') || existingError.code === '42P01')) {
    return NextResponse.json(
      { error: 'Schedule tables not configured. Run migration 017.' },
      { status: 503 }
    )
  }

  const nextVersion = existing ? existing.version + 1 : 1

  const { data: plan, error } = await supabase
    .from('schedule_plans')
    .insert({
      week_start_date: validation.data.week_start_date,
      notes: validation.data.notes,
      created_by: authResult.data.user.id,
      version: nextVersion,
    })
    .select('*')
    .single()

  if (error) {
    if (error.message?.includes('relation') || error.code === '42P01') {
      return NextResponse.json(
        { error: 'Schedule tables not configured. Run migration 017.' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ plan, shifts: [] }, { status: 201 })
}
