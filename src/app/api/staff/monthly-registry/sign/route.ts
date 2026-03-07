import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const signSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
})

/**
 * POST /api/staff/monthly-registry/sign
 * Allows an authenticated employee to digitally acknowledge their monthly time record.
 * Stores a signature record in the digital_signatures table.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { data: userData } = authResult
  const supabase = await createClient()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = signSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid data', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { year, month } = parsed.data

  // Look up employee record for this user
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('id')
    .eq('profile_id', userData.user.id)
    .single()

  if (empError || !employee) {
    return NextResponse.json(
      { error: 'Employee record not found for this user' },
      { status: 404 }
    )
  }

  // Use a valid UUID for document_id (one per call; uniqueness enforced by partial index)
  const documentId = crypto.randomUUID()

  // Insert signature (upsert-style using document_type+user_id+year+month uniqueness)
  const { data: existing } = await supabase
    .from('digital_signatures')
    .select('id, signed_at')
    .eq('user_id', userData.user.id)
    .eq('document_type', 'monthly_registry')
    .eq('registry_year', year)
    .eq('registry_month', month)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      message: 'Already signed',
      signature: existing,
    })
  }

  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null

  const { data: signature, error: insertError } = await supabase
    .from('digital_signatures')
    .insert({
      user_id: userData.user.id,
      document_type: 'monthly_registry',
      document_id: documentId,
      signature_url: '',
      registry_year: year,
      registry_month: month,
      ip_address: ipAddress,
      user_agent: request.headers.get('user-agent') || null,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json(
      { error: 'Failed to store signature' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    message: 'Monthly time record signed successfully',
    signature,
    year,
    month,
    employee_id: employee.id,
  })
}

/**
 * GET /api/staff/monthly-registry/sign
 * Returns signature status for current user or (managers) for a specific employee.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { data: userData } = authResult
  const supabase = await createClient()

  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
  const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())
  const profileId = searchParams.get('profile_id') || userData.user.id

  // Only managers/admins can check other users' signatures
  if (profileId !== userData.user.id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()

    if (!profile || !['admin', 'owner', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { data: signature } = await supabase
    .from('digital_signatures')
    .select('id, signed_at, ip_address')
    .eq('user_id', profileId)
    .eq('document_type', 'monthly_registry')
    .eq('registry_year', year)
    .eq('registry_month', month)
    .maybeSingle()

  return NextResponse.json({
    signed: !!signature,
    signature: signature || null,
    year,
    month,
  })
}
