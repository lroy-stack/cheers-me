import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { validateSchedule } from '@/lib/utils/schedule-validation'
import { addDays, format } from 'date-fns'

/**
 * POST /api/staff/schedule-plans/[id]/validate
 * Validate a schedule plan against labor constraints
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id: planId } = await params
  const supabase = await createClient()

  // Get plan
  const { data: plan } = await supabase
    .from('schedule_plans')
    .select('*')
    .eq('id', planId)
    .single()

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  const weekStart = plan.week_start_date
  const weekEnd = format(addDays(new Date(weekStart), 6), 'yyyy-MM-dd')

  // Fetch all needed data in parallel (including labor_constraints from settings)
  const [shiftsResult, employeesResult, leaveResult, availabilityResult, settingsResult] = await Promise.all([
    supabase
      .from('shifts')
      .select(`
        *,
        employee:employees(
          id,
          profile:profiles(id, full_name, role)
        )
      `)
      .eq('schedule_plan_id', planId),
    supabase
      .from('employees')
      .select(`
        *,
        profile:profiles(*)
      `)
      .eq('profile.active', true),
    supabase
      .from('leave_requests')
      .select('*')
      .eq('status', 'approved')
      .lte('start_date', weekEnd)
      .gte('end_date', weekStart),
    supabase
      .from('availability')
      .select('*')
      .gte('date', weekStart)
      .lte('date', weekEnd),
    supabase
      .from('restaurant_settings')
      .select('value')
      .eq('key', 'labor_constraints')
      .maybeSingle(),
  ])

  const laborConstraints = settingsResult.data?.value || undefined

  const result = validateSchedule(
    shiftsResult.data || [],
    employeesResult.data || [],
    leaveResult.data || [],
    availabilityResult.data || [],
    laborConstraints
  )

  return NextResponse.json(result)
}
