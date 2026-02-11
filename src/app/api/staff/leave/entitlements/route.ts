import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createEntitlementSchema = z.object({
  employee_id: z.string().uuid(),
  year: z.number().min(2020).max(2030),
  leave_type: z.enum(['vacation', 'sick_leave', 'personal_day', 'maternity', 'unpaid']),
  total_days: z.number().min(0),
})

/**
 * GET /api/staff/leave/entitlements
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const employeeId = searchParams.get('employee_id')
  const year = searchParams.get('year')

  let query = supabase
    .from('leave_entitlements')
    .select(`
      *,
      employee:employees(
        id,
        profile:profiles(id, full_name, role)
      )
    `)
    .order('year', { ascending: false })

  if (employeeId) query = query.eq('employee_id', employeeId)
  if (year) query = query.eq('year', parseInt(year))

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * POST /api/staff/leave/entitlements
 * Create or update leave entitlement (managers/admins only)
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

  const validation = createEntitlementSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.errors },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leave_entitlements')
    .upsert(
      {
        ...validation.data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'employee_id,year,leave_type' }
    )
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
