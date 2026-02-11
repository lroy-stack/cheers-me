import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updatePlanSchema = z.object({
  notes: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
})

/**
 * GET /api/staff/schedule-plans/[id]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  const supabase = await createClient()

  const { data: plan, error } = await supabase
    .from('schedule_plans')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }
    if (error.message?.includes('relation') || error.code === '42P01') {
      return NextResponse.json({ plan: null, shifts: [] })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: shifts } = await supabase
    .from('shifts')
    .select(`
      *,
      employee:employees(
        id,
        profile:profiles(id, full_name, role)
      )
    `)
    .eq('schedule_plan_id', id)
    .order('date')
    .order('start_time')

  return NextResponse.json({ plan, shifts: shifts || [] })
}

/**
 * PATCH /api/staff/schedule-plans/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validation = updatePlanSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.errors },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  const { data: plan, error } = await supabase
    .from('schedule_plans')
    .update({
      ...validation.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }
    if (error.message?.includes('relation') || error.code === '42P01') {
      return NextResponse.json(
        { error: 'Schedule tables not configured. Run migration 017.' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ plan })
}

/**
 * DELETE /api/staff/schedule-plans/[id]
 * Only draft plans can be deleted
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  const supabase = await createClient()

  // Check it's draft
  const { data: plan } = await supabase
    .from('schedule_plans')
    .select('status')
    .eq('id', id)
    .single()

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  if (plan.status !== 'draft') {
    return NextResponse.json({ error: 'Only draft plans can be deleted' }, { status: 400 })
  }

  // Delete associated shifts first
  await supabase.from('shifts').delete().eq('schedule_plan_id', id)

  const { error } = await supabase.from('schedule_plans').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
