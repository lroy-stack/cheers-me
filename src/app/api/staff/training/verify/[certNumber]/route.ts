import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import { format } from 'date-fns'

/**
 * GET /api/staff/training/verify/[certNumber]
 * Public endpoint — no auth required.
 * Verifies a GrandCafe Cheers training certificate number (format: GCC-YYYY-XXXXXXXX)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ certNumber: string }> }
) {
  const { certNumber } = await params

  // Validate format: GCC-YYYY-XXXXXXXX
  const match = certNumber.match(/^GCC-(\d{4})-([A-F0-9]{8})$/i)
  if (!match) {
    return NextResponse.json({ valid: false, error: 'Invalid certificate number format' }, { status: 400 })
  }

  const certYear = parseInt(match[1])
  const certHash = match[2].toUpperCase()

  const supabase = createAdminClient()

  // Fetch test_passed records from the matching year
  const { data: records } = await supabase
    .from('training_records')
    .select(`
      id, employee_id, guide_code, score, created_at,
      employees!inner(id, first_name, last_name, employee_number,
        profiles(full_name, role))
    `)
    .eq('action', 'test_passed')
    .gte('created_at', `${certYear}-01-01T00:00:00Z`)
    .lt('created_at', `${certYear + 1}-01-01T00:00:00Z`)

  if (!records) {
    return NextResponse.json({ valid: false, error: 'Certificate not found' }, { status: 404 })
  }

  // Find matching record by recomputing hash
  const matched = records.find((r) => {
    const hash = crypto
      .createHash('sha256')
      .update(`${r.employee_id}-${r.guide_code}-${r.created_at}`)
      .digest('hex')
      .substring(0, 8)
      .toUpperCase()
    return hash === certHash
  })

  if (!matched) {
    return NextResponse.json({ valid: false, error: 'Certificate not found' }, { status: 404 })
  }

  const empRaw = matched.employees as unknown
  const emp = (Array.isArray(empRaw) ? empRaw[0] : empRaw) as {
    id: string
    first_name: string
    last_name: string
    employee_number: string
    profiles: { full_name: string; role: string } | null
  } | null

  return NextResponse.json({
    valid: true,
    certificate: {
      number: certNumber,
      employee_name: emp?.profiles?.full_name ?? `${emp?.first_name ?? ''} ${emp?.last_name ?? ''}`.trim(),
      employee_number: emp?.employee_number,
      role: emp?.profiles?.role,
      guide_code: matched.guide_code,
      score: matched.score,
      issued_at: format(new Date(matched.created_at), 'yyyy-MM-dd'),
      year: certYear,
    },
  })
}
