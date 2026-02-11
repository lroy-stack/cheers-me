import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const copySchema = z.object({
  target_week_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

/**
 * POST /api/staff/schedule-plans/[id]/copy
 * Copy a plan's shifts to a new week
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id: sourcePlanId } = await params
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validation = copySchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.errors },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Get source plan and shifts
  const { data: sourcePlan } = await supabase
    .from('schedule_plans')
    .select('*')
    .eq('id', sourcePlanId)
    .single()

  if (!sourcePlan) {
    return NextResponse.json({ error: 'Source plan not found' }, { status: 404 })
  }

  const { data: sourceShifts } = await supabase
    .from('shifts')
    .select('*')
    .eq('schedule_plan_id', sourcePlanId)

  // Get next version for target week
  const { data: existing } = await supabase
    .from('schedule_plans')
    .select('version')
    .eq('week_start_date', validation.data.target_week_start_date)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextVersion = existing ? existing.version + 1 : 1

  // Create new plan
  const { data: newPlan, error: planError } = await supabase
    .from('schedule_plans')
    .insert({
      week_start_date: validation.data.target_week_start_date,
      status: 'draft',
      created_by: authResult.data.user.id,
      copied_from_plan_id: sourcePlanId,
      version: nextVersion,
      notes: `Copied from week ${sourcePlan.week_start_date}`,
    })
    .select('*')
    .single()

  if (planError) {
    return NextResponse.json({ error: planError.message }, { status: 500 })
  }

  // Copy shifts with adjusted dates
  if (sourceShifts && sourceShifts.length > 0) {
    const sourceWeekStart = new Date(sourcePlan.week_start_date)
    const targetWeekStart = new Date(validation.data.target_week_start_date)
    const dayDiff = Math.round((targetWeekStart.getTime() - sourceWeekStart.getTime()) / (1000 * 60 * 60 * 24))

    const newShifts = sourceShifts.map((shift) => {
      const shiftDate = new Date(shift.date)
      shiftDate.setDate(shiftDate.getDate() + dayDiff)
      const newDate = shiftDate.toISOString().split('T')[0]

      return {
        employee_id: shift.employee_id,
        date: newDate,
        shift_type: shift.shift_type,
        start_time: shift.start_time,
        end_time: shift.end_time,
        break_duration_minutes: shift.break_duration_minutes,
        is_day_off: shift.is_day_off,
        notes: shift.notes,
        schedule_plan_id: newPlan.id,
        status: 'scheduled',
      }
    })

    await supabase.from('shifts').insert(newShifts)
  }

  // Fetch new shifts with employee data
  const { data: shifts } = await supabase
    .from('shifts')
    .select(`
      *,
      employee:employees(
        id,
        profile:profiles(id, full_name, role)
      )
    `)
    .eq('schedule_plan_id', newPlan.id)
    .order('date')
    .order('start_time')

  return NextResponse.json({ plan: newPlan, shifts: shifts || [] }, { status: 201 })
}
