import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { encryptString, decryptString } from '@/lib/utils/encryption'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating employee
const updateEmployeeSchema = z.object({
  hourly_rate: z.number().min(0).optional(),
  contract_type: z.enum(['full_time', 'part_time', 'casual', 'contractor', 'indefinido_ordinario', 'temporal_obra', 'fijo_discontinuo', 'formacion', 'practicas', 'relevo', 'interinidad']).optional(),
  date_hired: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  date_terminated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  weekly_hours_target: z.number().min(0).nullable().optional(),
  gross_salary: z.number().min(0).nullable().optional(),
  contract_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  employment_status: z.enum(['active', 'terminated', 'on_leave', 'suspended']).optional(),
  social_security_number: z.string().nullable().optional(),
  dni_nie: z.string().nullable().optional(),
  iban: z.string().nullable().optional(),
  convenio_colectivo: z.string().nullable().optional(),
  categoria_profesional: z.string().nullable().optional(),
  tipo_jornada: z.enum(['completa', 'parcial', 'flexible']).optional(),
  periodo_prueba_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  irpf_retention: z.number().min(0).max(100).nullable().optional(),
  job_title: z.string().nullable().optional(),
  address_street: z.string().nullable().optional(),
  address_postal_code: z.string().nullable().optional(),
  address_city: z.string().nullable().optional(),
  address_province: z.string().nullable().optional(),
  address_country: z.string().nullable().optional(),
  grupo_cotizacion: z.number().int().min(1).max(11).nullable().optional(),
  profile: z.object({
    full_name: z.string().optional(),
    phone: z.string().nullable().optional(),
    role: z.enum(['admin', 'manager', 'kitchen', 'bar', 'waiter', 'dj', 'owner']).optional(),
    emergency_contact: z.string().nullable().optional(),
    emergency_phone: z.string().nullable().optional(),
  }).optional(),
})

/** Decrypt SSN field in employee record */
function decryptEmployeeSSN<T extends { social_security_number?: string | null }>(
  employee: T
): T {
  if (employee.social_security_number) {
    return {
      ...employee,
      social_security_number: decryptString(employee.social_security_number),
    }
  }
  return employee
}

/**
 * GET /api/staff/employees/[id]
 * Get a specific employee by ID (managers/admins only)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'owner', 'manager'])

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
    return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 })
  }

  // Decrypt SSN before returning
  return NextResponse.json(decryptEmployeeSSN(employee))
}

/**
 * PATCH /api/staff/employees/[id]
 * Update an employee record (managers/admins only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'owner', 'manager'])

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

  // Prevent role escalation: only admin/owner can assign admin/owner roles
  if (profileData?.role && ['admin', 'owner'].includes(profileData.role)) {
    const callerRole = authResult.data.profile?.role
    if (!callerRole || !['admin', 'owner'].includes(callerRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to assign admin or owner role' },
        { status: 403 }
      )
    }
  }

  // Fetch current employee for change tracking
  const { data: currentEmployee } = await supabase
    .from('employees')
    .select('contract_type, gross_salary, profile:profiles(role)')
    .eq('id', id)
    .single()

  // Encrypt SSN if provided
  if ('social_security_number' in employeeData) {
    if (employeeData.social_security_number) {
      employeeData.social_security_number = encryptString(employeeData.social_security_number)
    }
  }

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
        return NextResponse.json({ error: 'Profile update failed' }, { status: 500 })
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
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 })
  }

  // Log sensitive field changes (role, gross_salary, contract_type)
  if (currentEmployee) {
    const adminSupabase = createAdminClient()
    const changedBy = authResult.data.user?.id
    const changeLogs: Array<{ employee_id: string; changed_by: string | undefined; field_name: string; old_value: string | null; new_value: string | null }> = []

    const currentProfile = currentEmployee.profile as { role?: string } | null

    if (profileData?.role && currentProfile?.role !== profileData.role) {
      changeLogs.push({ employee_id: id, changed_by: changedBy, field_name: 'role', old_value: currentProfile?.role ?? null, new_value: profileData.role })
    }
    if ('gross_salary' in employeeData && String(currentEmployee.gross_salary ?? '') !== String(employeeData.gross_salary ?? '')) {
      changeLogs.push({ employee_id: id, changed_by: changedBy, field_name: 'gross_salary', old_value: String(currentEmployee.gross_salary ?? ''), new_value: String(employeeData.gross_salary ?? '') })
    }
    if ('contract_type' in employeeData && currentEmployee.contract_type !== employeeData.contract_type) {
      changeLogs.push({ employee_id: id, changed_by: changedBy, field_name: 'contract_type', old_value: currentEmployee.contract_type, new_value: String(employeeData.contract_type ?? '') })
    }

    if (changeLogs.length > 0) {
      await adminSupabase.from('employee_changes').insert(changeLogs)
    }
  }

  // Decrypt SSN before returning
  return NextResponse.json(decryptEmployeeSSN(updatedEmployee))
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
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
