import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const surveySchema = z.object({
  clock_record_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(500).optional(),
  anomaly_type: z.string().max(50).optional(),
  anomaly_reason: z.string().max(100).optional(),
  anomaly_comment: z.string().max(500).optional(),
  worked_minutes: z.number().int().optional(),
  scheduled_minutes: z.number().int().optional(),
  variance_minutes: z.number().int().optional(),
  break_variance_minutes: z.number().int().optional(),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is manager/admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'manager', 'owner'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Parse query params
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const ratingMax = searchParams.get('rating_max')
  const employeeId = searchParams.get('employee_id')
  const unreviewed = searchParams.get('unreviewed') === 'true'

  // Build query
  let query = supabase
    .from('shift_survey_responses')
    .select(`
      *,
      employee:employees!inner(
        id,
        profile:profiles!inner(
          id,
          full_name,
          role
        )
      )
    `)
    .order('responded_at', { ascending: false })

  if (from) {
    query = query.gte('responded_at', from)
  }
  if (to) {
    query = query.lte('responded_at', to)
  }
  if (ratingMax) {
    query = query.lte('rating', parseInt(ratingMax))
  }
  if (employeeId) {
    query = query.eq('employee_id', employeeId)
  }
  if (unreviewed) {
    query = query.eq('manager_reviewed', false)
  }

  const { data: surveys, error } = await query

  if (error) {
    console.error('Error fetching surveys:', error)
    return NextResponse.json({ error: 'Failed to fetch surveys' }, { status: 500 })
  }

  // Calculate stats
  const stats = {
    total: surveys?.length || 0,
    avgRating: surveys?.length
      ? Math.round((surveys.reduce((sum, s) => sum + s.rating, 0) / surveys.length) * 10) / 10
      : 0,
    flagged: surveys?.filter((s) => s.rating <= 2).length || 0,
    unreviewed: surveys?.filter((s) => !s.manager_reviewed).length || 0,
  }

  return NextResponse.json({ surveys, stats })
}

/**
 * POST /api/staff/surveys
 * Submit post-shift feedback (any authenticated employee for their own clock records)
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

  const validation = surveySchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.errors },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Get employee record for current user
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('profile_id', authResult.data.user.id)
    .single()

  if (!employee) {
    return NextResponse.json({ error: 'Employee record not found' }, { status: 404 })
  }

  // Verify clock record belongs to this employee
  const { data: clockRecord } = await supabase
    .from('clock_in_out')
    .select('id, employee_id')
    .eq('id', validation.data.clock_record_id)
    .eq('employee_id', employee.id)
    .single()

  if (!clockRecord) {
    return NextResponse.json({ error: 'Clock record not found or access denied' }, { status: 404 })
  }

  // Check for duplicate survey
  const { data: existing } = await supabase
    .from('shift_survey_responses')
    .select('id')
    .eq('clock_record_id', validation.data.clock_record_id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Survey already submitted for this shift' }, { status: 409 })
  }

  // Insert survey
  const { data: survey, error } = await supabase
    .from('shift_survey_responses')
    .insert({
      clock_record_id: validation.data.clock_record_id,
      employee_id: employee.id,
      rating: validation.data.rating,
      feedback: validation.data.feedback ?? null,
      anomaly_type: validation.data.anomaly_type ?? null,
      anomaly_reason: validation.data.anomaly_reason ?? null,
      anomaly_comment: validation.data.anomaly_comment ?? null,
      worked_minutes: validation.data.worked_minutes ?? null,
      scheduled_minutes: validation.data.scheduled_minutes ?? null,
      variance_minutes: validation.data.variance_minutes ?? null,
      break_variance_minutes: validation.data.break_variance_minutes ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating survey:', error)
    return NextResponse.json({ error: 'Failed to submit survey' }, { status: 500 })
  }

  return NextResponse.json(survey, { status: 201 })
}
