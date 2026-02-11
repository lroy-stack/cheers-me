import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const createComplianceRecordSchema = z.object({
  ficha_type_code: z.string().min(1, 'Ficha type code is required'),
  values: z.record(z.unknown()),
  notes: z.string().nullable().optional(),
  status: z.enum(['completed', 'flagged', 'requires_review']).optional(),
  recorded_at: z.string().optional(),
})

const RECORD_SELECT = `
  *,
  ficha_type:compliance_ficha_types(*),
  recorded_by_employee:employees!compliance_records_recorded_by_fkey(
    id,
    profile:profiles(id, full_name, role)
  ),
  reviewer:profiles!compliance_records_reviewed_by_fkey(id, full_name)
`

/**
 * GET /api/staff/compliance
 * List compliance records with filters
 * Auth: any authenticated user
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const typeCode = searchParams.get('type_code')
  const category = searchParams.get('category')
  const status = searchParams.get('status')
  const recordedBy = searchParams.get('recorded_by')
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  let query = supabase
    .from('compliance_records')
    .select(RECORD_SELECT)
    .order('recorded_at', { ascending: false })

  if (typeCode) {
    query = query.eq('ficha_type_code', typeCode)
  }

  if (category) {
    query = query.eq('ficha_type.category', category)
  }

  if (status) {
    query = query.eq('status', status)
  }

  if (recordedBy) {
    query = query.eq('recorded_by', recordedBy)
  }

  if (dateFrom) {
    query = query.gte('recorded_at', dateFrom)
  }

  if (dateTo) {
    query = query.lte('recorded_at', dateTo)
  }

  query = query.range(offset, offset + limit - 1)

  const { data: records, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(records || [])
}

/**
 * POST /api/staff/compliance
 * Create a new compliance record
 * Auth: any authenticated user
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth()

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

  const validation = createComplianceRecordSchema.safeParse(body)
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
  const { data: userData } = authResult

  // Look up ficha type by code
  const { data: fichaType, error: fichaError } = await supabase
    .from('compliance_ficha_types')
    .select('*')
    .eq('code', validation.data.ficha_type_code)
    .eq('is_active', true)
    .single()

  if (fichaError || !fichaType) {
    return NextResponse.json(
      { error: 'Ficha type not found or inactive' },
      { status: 404 }
    )
  }

  // Validate required fields from fields_schema are present in values
  const fieldsSchema = fichaType.fields_schema as Array<{
    key: string
    required: boolean
  }>
  const missingFields: string[] = []

  if (Array.isArray(fieldsSchema)) {
    for (const field of fieldsSchema) {
      if (
        field.required &&
        (validation.data.values[field.key] === undefined ||
          validation.data.values[field.key] === null ||
          validation.data.values[field.key] === '')
      ) {
        missingFields.push(field.key)
      }
    }
  }

  if (missingFields.length > 0) {
    return NextResponse.json(
      {
        error: 'Missing required fields',
        details: missingFields,
      },
      { status: 400 }
    )
  }

  // Look up employee ID from profile_id
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('id')
    .eq('profile_id', userData.user.id)
    .single()

  if (employeeError || !employee) {
    return NextResponse.json(
      { error: 'Employee record not found for current user' },
      { status: 404 }
    )
  }

  // Insert record
  const { data: newRecord, error: insertError } = await supabase
    .from('compliance_records')
    .insert({
      ficha_type_id: fichaType.id,
      ficha_type_code: validation.data.ficha_type_code,
      values: validation.data.values,
      notes: validation.data.notes ?? null,
      status: validation.data.status ?? 'completed',
      recorded_by: employee.id,
      recorded_at: validation.data.recorded_at ?? new Date().toISOString(),
    })
    .select(RECORD_SELECT)
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(newRecord, { status: 201 })
}
