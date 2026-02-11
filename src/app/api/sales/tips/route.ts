import { createClient } from '@/lib/supabase/server'
import { requireRole, requireAuth } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for recording tips
const shiftTipSchema = z.object({
  shift_id: z.string().uuid(),
  employee_id: z.string().uuid(),
  amount: z.number().min(0),
})

// Batch tips schema
const batchTipsSchema = z.object({
  tips: z.array(shiftTipSchema).min(1).max(50),
})

/**
 * GET /api/sales/tips
 * List shift tips with optional filtering
 * Staff can see their own tips, managers can see all
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { data: userData } = authResult
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const employeeId = searchParams.get('employee_id')
  const shiftId = searchParams.get('shift_id')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50

  // Get current user's employee record
  const { data: currentEmployee } = await supabase
    .from('employees')
    .select('id')
    .eq('profile_id', userData.user.id)
    .single()

  const isManager = ['admin', 'manager', 'owner'].includes(userData.profile.role)

  let query = supabase
    .from('shift_tips')
    .select(`
      *,
      shift:shifts(
        id,
        date,
        shift_type,
        start_time,
        end_time
      ),
      employee:employees(
        id,
        profile:profiles(
          full_name
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  // Staff can only see their own tips unless they're a manager
  if (!isManager && currentEmployee) {
    query = query.eq('employee_id', currentEmployee.id)
  }

  if (employeeId && isManager) {
    query = query.eq('employee_id', employeeId)
  }

  if (shiftId) {
    query = query.eq('shift_id', shiftId)
  }

  // Date filtering via shift join
  if (startDate || endDate) {
    const { data: shifts } = await supabase
      .from('shifts')
      .select('id')
      .gte('date', startDate || '1970-01-01')
      .lte('date', endDate || '2100-12-31')

    if (shifts && shifts.length > 0) {
      const shiftIds = shifts.map(s => s.id)
      query = query.in('shift_id', shiftIds)
    } else {
      // No shifts in date range
      return NextResponse.json([])
    }
  }

  const { data: tips, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(tips)
}

/**
 * POST /api/sales/tips
 * Record shift tips (single or batch)
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

  // Check if this is a batch insert or single tip
  if (Array.isArray(body.tips)) {
    // Batch insert
    const validation = batchTipsSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { data: tips, error } = await supabase
      .from('shift_tips')
      .insert(validation.data.tips)
      .select(`
        *,
        shift:shifts(
          id,
          date,
          shift_type
        ),
        employee:employees(
          id,
          profile:profiles(
            full_name
          )
        )
      `)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      message: `${tips.length} tips recorded successfully`,
      tips,
    }, { status: 201 })
  } else {
    // Single tip insert
    const validation = shiftTipSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    // Verify shift and employee exist and are related
    const { data: shift } = await supabase
      .from('shifts')
      .select('id, employee_id')
      .eq('id', validation.data.shift_id)
      .single()

    if (!shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    if (shift.employee_id !== validation.data.employee_id) {
      return NextResponse.json(
        { error: 'Employee is not assigned to this shift' },
        { status: 400 }
      )
    }

    const { data: tip, error } = await supabase
      .from('shift_tips')
      .insert(validation.data)
      .select(`
        *,
        shift:shifts(
          id,
          date,
          shift_type
        ),
        employee:employees(
          id,
          profile:profiles(
            full_name
          )
        )
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(tip, { status: 201 })
  }
}
