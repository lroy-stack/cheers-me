import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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
