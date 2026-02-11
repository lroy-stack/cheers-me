import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating employee
const updateEmployeeSchema = z.object({
  hourly_rate: z.number().min(0).optional(),
  contract_type: z.enum(['full_time', 'part_time', 'casual', 'contractor']).optional(),
  date_hired: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  date_terminated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  weekly_hours_target: z.number().min(0).nullable().optional(),
  gross_salary: z.number().min(0).nullable().optional(),
  contract_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  employment_status: z.enum(['active', 'terminated', 'on_leave', 'suspended']).optional(),
  social_security_number: z.string().nullable().optional(),
  convenio_colectivo: z.string().nullable().optional(),
  categoria_profesional: z.string().nullable().optional(),
  tipo_jornada: z.enum(['completa', 'parcial', 'flexible']).optional(),
  periodo_prueba_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  irpf_retention: z.number().min(0).max(100).nullable().optional(),
  job_title: z.string().nullable().optional(),
  profile: z.object({
    full_name: z.string().optional(),
    phone: z.string().nullable().optional(),
    role: z.enum(['admin', 'manager', 'kitchen', 'bar', 'waiter', 'dj', 'owner']).optional(),
    emergency_contact: z.string().nullable().optional(),
    emergency_phone: z.string().nullable().optional(),
  }).optional(),
})

/**
 * GET /api/staff/employees/[id]
 * Get a specific employee by ID (managers/admins only)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params
  const supabase = await createClient()

  const { data: employee, error } = await supabase
    .from('employees')
    .select(`
      *,
      profile:profiles(
        id,
        email,
        full_name,
        role,
        phone,
        emergency_contact,
        emergency_phone,
        active,
        avatar_url,
        language
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(employee)
}

/**
 * PATCH /api/staff/employees/[id]
 * Update an employee record (managers/admins only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = updateEmployeeSchema.safeParse(body)
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

  // Extract profile data separately
  const { profile: profileData, ...employeeData } = validation.data

  // Update profile if provided
  if (profileData && Object.keys(profileData).length > 0) {
    // First get the employee's profile_id
    const { data: emp } = await supabase
      .from('employees')
      .select('profile_id')
      .eq('id', id)
      .single()

    if (emp?.profile_id) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          ...profileData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', emp.profile_id)

      if (profileError) {
        return NextResponse.json({ error: `Profile update failed: ${profileError.message}` }, { status: 500 })
      }
    }
  }

  // Update employee record
  const { data: updatedEmployee, error } = await supabase
    .from('employees')
    .update({
      ...employeeData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      *,
      profile:profiles(
        id,
        email,
        full_name,
        role,
        phone,
        emergency_contact,
        emergency_phone,
        active
      )
    `)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updatedEmployee)
}

/**
 * DELETE /api/staff/employees/[id]
 * Delete an employee record (admins only)
 * WARNING: This is a hard delete. Consider soft delete via date_terminated instead.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params
  const supabase = await createClient()

  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
