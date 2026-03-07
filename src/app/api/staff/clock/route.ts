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

/**
 * GET /api/staff/clock
 * Get clock records for the current user or all (if manager)
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

  const employeeId = searchParams.get('employee_id')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')

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
  if (employeeId) {
    query = query.eq('employee_id', employeeId)
  }

  if (startDate) {
    query = query.gte('clock_in_time', startDate)
  }

  if (endDate) {
    query = query.lte('clock_in_time', endDate)
  }

  const { data: clockRecords, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
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
