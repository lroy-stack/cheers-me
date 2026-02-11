import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const shiftCreateSchema = z.object({
  employee_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shift_type: z.enum(['morning', 'afternoon', 'night', 'split']),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  second_start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  second_end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  break_duration_minutes: z.number().min(0).default(0),
  is_day_off: z.boolean().default(false),
  notes: z.string().optional(),
})

const shiftUpdateSchema = z.object({
  id: z.string().uuid(),
  shift_type: z.enum(['morning', 'afternoon', 'night', 'split']).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  second_start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  second_end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  break_duration_minutes: z.number().min(0).optional(),
  is_day_off: z.boolean().optional(),
  notes: z.string().optional(),
})

const syncSchema = z.object({
  shifts_to_create: z.array(shiftCreateSchema),
  shifts_to_update: z.array(shiftUpdateSchema),
  shifts_to_delete: z.array(z.string().uuid()),
})

/**
 * POST /api/staff/schedule-plans/[id]/sync
 * Bulk sync all grid changes in a single request
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id: planId } = await params
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validation = syncSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.errors },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { shifts_to_create, shifts_to_update, shifts_to_delete } = validation.data

  // Verify plan exists
  const { data: plan, error: planError } = await supabase
    .from('schedule_plans')
    .select('id, status')
    .eq('id', planId)
    .single()

  if (planError && (planError.message?.includes('relation') || planError.code === '42P01')) {
    return NextResponse.json(
      { error: 'Schedule tables not configured. Run migration 017.' },
      { status: 503 }
    )
  }

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  const results = { created: 0, updated: 0, deleted: 0, errors: [] as string[] }

  // Delete shifts
  if (shifts_to_delete.length > 0) {
    const { error } = await supabase
      .from('shifts')
      .delete()
      .in('id', shifts_to_delete)
      .eq('schedule_plan_id', planId)

    if (error) {
      results.errors.push(`Delete error: ${error.message}`)
    } else {
      results.deleted = shifts_to_delete.length
    }
  }

  // Create shifts
  if (shifts_to_create.length > 0) {
    const toInsert = shifts_to_create.map((s) => ({
      ...s,
      schedule_plan_id: planId,
      status: 'scheduled',
    }))

    const { error } = await supabase.from('shifts').insert(toInsert)
    if (error) {
      results.errors.push(`Create error: ${error.message}`)
    } else {
      results.created = shifts_to_create.length
    }
  }

  // Update shifts
  for (const update of shifts_to_update) {
    const { id, ...fields } = update
    const { error } = await supabase
      .from('shifts')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('schedule_plan_id', planId)

    if (error) {
      results.errors.push(`Update error for ${id}: ${error.message}`)
    } else {
      results.updated++
    }
  }

  // Update plan timestamp
  await supabase
    .from('schedule_plans')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', planId)

  // Fetch updated shifts
  const { data: shifts } = await supabase
    .from('shifts')
    .select(`
      *,
      employee:employees(
        id,
        profile:profiles(id, full_name, role)
      )
    `)
    .eq('schedule_plan_id', planId)
    .order('date')
    .order('start_time')

  return NextResponse.json({ results, shifts: shifts || [] })
}
