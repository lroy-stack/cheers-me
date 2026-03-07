import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/utils/auth'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const MANAGER_ROLES = ['admin', 'owner', 'manager']

const documentSchema = z.object({
  employee_id: z.string().uuid(),
  document_type: z.enum(['contract', 'payslip', 'id_document', 'tax_form', 'other']),
  file_name: z.string().min(1).max(255),
  file_url: z.string().url(),
  file_size: z.number().int().positive().optional(),
  mime_type: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
})

/**
 * GET /api/staff/documents
 * Employees see own documents; managers see all (or by employee_id)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }
  const { data: userData } = authResult
  const isManager = MANAGER_ROLES.includes(userData.profile?.role || '')

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const requestedEmployeeId = searchParams.get('employee_id')

  let effectiveEmployeeId: string | null = requestedEmployeeId

  if (!isManager) {
    const { data: myEmployee } = await supabase
      .from('employees')
      .select('id')
      .eq('profile_id', userData.user.id)
      .single()

    if (!myEmployee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 })
    }

    if (requestedEmployeeId && requestedEmployeeId !== myEmployee.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    effectiveEmployeeId = myEmployee.id
  }

  let query = supabase
    .from('staff_documents')
    .select('*')
    .order('created_at', { ascending: false })

  if (effectiveEmployeeId) {
    query = query.eq('employee_id', effectiveEmployeeId)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * POST /api/staff/documents
 * Managers can upload documents for any employee.
 * Employees can upload their own documents.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }
  const { data: userData } = authResult
  const isManager = MANAGER_ROLES.includes(userData.profile?.role || '')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = documentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { employee_id, ...docData } = parsed.data

  // Non-managers can only upload their own documents
  if (!isManager) {
    const supabase = await createClient()
    const { data: myEmployee } = await supabase
      .from('employees')
      .select('id')
      .eq('profile_id', userData.user.id)
      .single()

    if (!myEmployee || myEmployee.id !== employee_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('staff_documents')
    .insert({ ...docData, employee_id, uploaded_by: userData.user.id })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create document record' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
