import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createLeaveSchema = z.object({
  employee_id: z.string().uuid(),
  leave_type: z.enum(['vacation', 'sick_leave', 'personal_day', 'maternity', 'unpaid']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  total_days: z.number().min(0.5),
  reason: z.string().optional(),
})

/**
 * GET /api/staff/leave
 * List leave requests
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const employeeId = searchParams.get('employee_id')
  const status = searchParams.get('status')
  const year = searchParams.get('year')

  let query = supabase
    .from('leave_requests')
    .select(`
      *,
      employee:employees(
        id,
        profile:profiles(id, full_name, role)
      )
    `)
    .order('start_date', { ascending: false })

  if (employeeId) query = query.eq('employee_id', employeeId)
  if (status) query = query.eq('status', status)
  if (year) {
    query = query.gte('start_date', `${year}-01-01`).lte('end_date', `${year}-12-31`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * POST /api/staff/leave
 * Create a leave request
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validation = createLeaveSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.errors },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  const { data: leaveRequest, error } = await supabase
    .from('leave_requests')
    .insert(validation.data)
    .select(`
      *,
      employee:employees(
        id,
        profile:profiles(id, full_name, role)
      )
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(leaveRequest, { status: 201 })
}
