import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating employee
const createEmployeeSchema = z.object({
  profile_id: z.string().uuid(),
  hourly_rate: z.number().min(0),
  contract_type: z.enum(['full_time', 'part_time', 'casual', 'contractor']),
  date_hired: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  job_title: z.string().nullable().optional(),
  gross_salary: z.number().min(0).nullable().optional(),
  weekly_hours_target: z.number().min(0).nullable().optional(),
  contract_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  irpf_retention: z.number().min(0).max(100).nullable().optional(),
  social_security_number: z.string().nullable().optional(),
  convenio_colectivo: z.string().nullable().optional(),
  categoria_profesional: z.string().nullable().optional(),
  tipo_jornada: z.enum(['completa', 'parcial', 'flexible']).optional(),
  periodo_prueba_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})

/**
 * GET /api/staff/employees
 * List all employees (managers/admins only)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  // Optional filter: active employees only
  const activeOnly = searchParams.get('active') === 'true'

  let query = supabase
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
        active
      )
    `)
    .order('created_at', { ascending: false })

  if (activeOnly) {
    query = query.is('date_terminated', null)
  }

  const { data: employees, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(employees)
}

/**
 * POST /api/staff/employees
 * Create a new employee record (managers/admins only)
 * Note: The profile must already exist
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

  // Validate request body
  const validation = createEmployeeSchema.safeParse(body)
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

  // Verify profile exists and is not already an employee
  const { data: existingEmployee } = await supabase
    .from('employees')
    .select('id')
    .eq('profile_id', validation.data.profile_id)
    .single()

  if (existingEmployee) {
    return NextResponse.json(
      { error: 'Profile already has an employee record' },
      { status: 400 }
    )
  }

  // Create employee record
  const { data: newEmployee, error } = await supabase
    .from('employees')
    .insert({
      profile_id: validation.data.profile_id,
      hourly_rate: validation.data.hourly_rate,
      contract_type: validation.data.contract_type,
      date_hired: validation.data.date_hired || new Date().toISOString().split('T')[0],
      job_title: validation.data.job_title ?? null,
      gross_salary: validation.data.gross_salary ?? null,
      weekly_hours_target: validation.data.weekly_hours_target ?? null,
      contract_end_date: validation.data.contract_end_date ?? null,
      irpf_retention: validation.data.irpf_retention ?? null,
      social_security_number: validation.data.social_security_number ?? null,
      convenio_colectivo: validation.data.convenio_colectivo ?? null,
      categoria_profesional: validation.data.categoria_profesional ?? null,
      tipo_jornada: validation.data.tipo_jornada ?? 'completa',
      periodo_prueba_end: validation.data.periodo_prueba_end ?? null,
    })
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(newEmployee, { status: 201 })
}
