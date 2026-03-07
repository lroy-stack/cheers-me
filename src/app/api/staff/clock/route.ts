import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Restaurant location (Carrer de Cartago 22, El Arenal, Mallorca)
const RESTAURANT_LAT = 39.5021
const RESTAURANT_LNG = 2.7392
const GEOFENCE_RADIUS_METERS = 200

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000 // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Validation schema for clock-in (with optional geolocation)
const clockInSchema = z.object({
  shift_id: z.string().uuid().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
})

// Validation schema for clock-out
const clockOutSchema = z.object({
  clock_record_id: z.string().uuid(),
})

const MANAGER_ROLES = ['admin', 'owner', 'manager']

/**
 * GET /api/staff/clock
 * Get clock records.
 * - Staff (waiter/bar/kitchen/dj): can only query own records
 * - Manager+: can query any employee_id or all records
 * Query params: employee_id, start_date, end_date, format (csv)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { data: userData } = authResult
  const isManager = MANAGER_ROLES.includes(userData.profile?.role || '')

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const requestedEmployeeId = searchParams.get('employee_id')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const format = searchParams.get('format')

  // Get current user's employee record
  const { data: myEmployee } = await supabase
    .from('employees')
    .select('id')
    .eq('profile_id', userData.user.id)
    .single()

  // Role-scope: non-managers can only see their own records
  let effectiveEmployeeId: string | null = requestedEmployeeId

  if (!isManager) {
    if (!myEmployee) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 })
    }
    // If a non-manager requests a different employee_id, return 403
    if (requestedEmployeeId && requestedEmployeeId !== myEmployee.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    // Force filter to own employee_id
    effectiveEmployeeId = myEmployee.id
  }

  let query = supabase
    .from('clock_in_out')
    .select(`
      *,
      employee:employees(
        id,
        profile:profiles(
          id,
          full_name,
          role
        )
      ),
      shift:shifts(
        id,
        date,
        shift_type,
        start_time,
        end_time
      ),
      breaks:clock_breaks(*)
    `)
    .order('clock_in_time', { ascending: false })

  // Apply filters
  if (effectiveEmployeeId) {
    query = query.eq('employee_id', effectiveEmployeeId)
  }

  if (startDate) {
    query = query.gte('clock_in_time', startDate)
  }

  if (endDate) {
    query = query.lte('clock_in_time', endDate)
  }

  const { data: clockRecords, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch clock records' }, { status: 500 })
  }

  // CSV export format
  if (format === 'csv') {
    const rows = [
      ['Date', 'Clock In', 'Clock Out', 'Total Hours', 'Status'],
      ...(clockRecords || []).map((r) => {
        const clockIn = r.clock_in_time ? new Date(r.clock_in_time).toISOString() : ''
        const clockOut = r.clock_out_time ? new Date(r.clock_out_time).toISOString() : ''
        const hours =
          r.clock_in_time && r.clock_out_time
            ? ((new Date(r.clock_out_time).getTime() - new Date(r.clock_in_time).getTime()) / 3600000).toFixed(2)
            : ''
        const date = clockIn ? clockIn.slice(0, 10) : ''
        return [date, clockIn, clockOut, hours, r.status || '']
      }),
    ]
    const csv = rows.map((row) => row.map((v) => `"${v}"`).join(',')).join('\n')
    const timestamp = new Date().toISOString().slice(0, 10)
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="clock-records-${timestamp}.csv"`,
      },
    })
  }

  return NextResponse.json(clockRecords)
}

/**
 * POST /api/staff/clock
 * Clock in or clock out
 * Use action query param: ?action=in or ?action=out
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth()

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { data: userData } = authResult
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  // Get employee record for current user
  const { data: employeeRecord } = await supabase
    .from('employees')
    .select('id')
    .eq('profile_id', userData.user.id)
    .single()

  if (!employeeRecord) {
    return NextResponse.json(
      { error: 'Employee record not found' },
      { status: 404 }
    )
  }

  if (action === 'in') {
    // Clock in
    let body
    try {
      body = await request.json()
    } catch {
      body = {}
    }

    const validation = clockInSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    // Check if already clocked in (no clock_out_time yet)
    const { data: existingClock } = await supabase
      .from('clock_in_out')
      .select('id')
      .eq('employee_id', employeeRecord.id)
      .is('clock_out_time', null)
      .single()

    if (existingClock) {
      return NextResponse.json(
        { error: 'You are already clocked in' },
        { status: 400 }
      )
    }

    // Geolocation check (Feature S2.B1)
    let geolocationWarning: string | null = null
    let geolocationMetadata: Record<string, unknown> = {}

    if (validation.data.latitude !== undefined && validation.data.longitude !== undefined) {
      const distance = haversineDistance(
        validation.data.latitude,
        validation.data.longitude,
        RESTAURANT_LAT,
        RESTAURANT_LNG
      )
      geolocationMetadata = {
        latitude: validation.data.latitude,
        longitude: validation.data.longitude,
        distance_meters: Math.round(distance),
        within_geofence: distance <= GEOFENCE_RADIUS_METERS,
      }
      if (distance > GEOFENCE_RADIUS_METERS) {
        geolocationWarning = `Location is ${Math.round(distance)}m from the restaurant (max ${GEOFENCE_RADIUS_METERS}m)`
      }
    }

    // Create clock-in record with optional metadata
    const { data: clockRecord, error } = await supabase
      .from('clock_in_out')
      .insert({
        employee_id: employeeRecord.id,
        shift_id: validation.data.shift_id,
        clock_in_time: new Date().toISOString(),
        ...(Object.keys(geolocationMetadata).length > 0 ? { metadata: geolocationMetadata } : {}),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create clock record' }, { status: 500 })
    }

    return NextResponse.json(
      {
        ...clockRecord,
        ...(geolocationWarning ? { geolocation_warning: geolocationWarning } : {}),
      },
      { status: 201 }
    )
  } else if (action === 'out') {
    // Clock out
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const validation = clockOutSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const clockOutTime = new Date().toISOString()

    // Feature S2.B2: Auto-close any active breaks before clocking out
    const { data: activeBreaks } = await supabase
      .from('clock_breaks')
      .select('id')
      .eq('clock_record_id', validation.data.clock_record_id)
      .is('end_time', null)

    let closedBreaksCount = 0
    if (activeBreaks && activeBreaks.length > 0) {
      const breakIds = activeBreaks.map((b) => b.id)
      await supabase
        .from('clock_breaks')
        .update({ end_time: clockOutTime, updated_at: clockOutTime })
        .in('id', breakIds)
      closedBreaksCount = breakIds.length
    }

    // Update clock record with clock_out_time
    const { data: clockRecord, error } = await supabase
      .from('clock_in_out')
      .update({
        clock_out_time: clockOutTime,
        updated_at: clockOutTime,
      })
      .eq('id', validation.data.clock_record_id)
      .eq('employee_id', employeeRecord.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Clock record not found or already clocked out' },
          { status: 404 }
        )
      }
      return NextResponse.json({ error: 'Failed to update clock record' }, { status: 500 })
    }

    return NextResponse.json({
      ...clockRecord,
      closed_breaks: closedBreaksCount,
    })
  } else {
    return NextResponse.json(
      { error: 'Invalid action. Use ?action=in or ?action=out' },
      { status: 400 }
    )
  }
}
