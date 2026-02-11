import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { KioskEmployeeStatus } from '@/types'

const pinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
})

// In-memory rate limiting by IP
const rateLimitMap = new Map<string, { attempts: number; firstAt: number }>()
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function getRateLimitKey(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
}

function checkRateLimit(ip: string): { blocked: boolean; minutesRemaining?: number } {
  const entry = rateLimitMap.get(ip)
  if (!entry) return { blocked: false }

  const elapsed = Date.now() - entry.firstAt
  if (elapsed > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.delete(ip)
    return { blocked: false }
  }

  if (entry.attempts >= RATE_LIMIT_MAX) {
    const minutesRemaining = Math.ceil((RATE_LIMIT_WINDOW_MS - elapsed) / 60000)
    return { blocked: true, minutesRemaining }
  }

  return { blocked: false }
}

function incrementRateLimit(ip: string) {
  const entry = rateLimitMap.get(ip)
  if (!entry) {
    rateLimitMap.set(ip, { attempts: 1, firstAt: Date.now() })
  } else {
    entry.attempts++
  }
}

function resetRateLimit(ip: string) {
  rateLimitMap.delete(ip)
}

export async function POST(request: NextRequest) {
  const ip = getRateLimitKey(request)

  // Check rate limit
  const rateCheck = checkRateLimit(ip)
  if (rateCheck.blocked) {
    return NextResponse.json(
      { error: 'Too many attempts', minutes: rateCheck.minutesRemaining },
      { status: 429 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validation = pinSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid PIN format', details: validation.error.errors },
      { status: 400 }
    )
  }

  const { pin } = validation.data
  const supabase = createAdminClient()

  // Find active employee with this PIN
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select(`
      id,
      profile:profiles(
        id,
        full_name,
        role,
        avatar_url
      )
    `)
    .eq('kiosk_pin', pin)
    .eq('employment_status', 'active')
    .single()

  if (empError || !employee) {
    incrementRateLimit(ip)
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  // Reset rate limit on success
  resetRateLimit(ip)

  // Supabase .single() still returns joined profiles as an array — extract first element
  const profileRaw = employee.profile as unknown
  const profile = (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as { id: string; full_name: string | null; role: string; avatar_url: string | null }

  // Check for active clock record
  const { data: activeClock } = await supabase
    .from('clock_in_out')
    .select('id, clock_in_time')
    .eq('employee_id', employee.id)
    .is('clock_out_time', null)
    .single()

  let status: KioskEmployeeStatus['status'] = 'not_clocked_in'
  let activeBreakId: string | undefined
  let breakStartTime: string | undefined

  if (activeClock) {
    status = 'working'

    // Check for active break
    const { data: activeBreak } = await supabase
      .from('clock_breaks')
      .select('id, start_time')
      .eq('clock_record_id', activeClock.id)
      .is('end_time', null)
      .single()

    if (activeBreak) {
      status = 'on_break'
      activeBreakId = activeBreak.id
      breakStartTime = activeBreak.start_time
    }
  }

  // Get today's shift
  const today = new Date().toISOString().split('T')[0]
  const { data: todayShift } = await supabase
    .from('shifts')
    .select('id, shift_type, start_time, end_time')
    .eq('employee_id', employee.id)
    .eq('date', today)
    .single()

  const result: KioskEmployeeStatus = {
    employee_id: employee.id,
    full_name: profile.full_name || 'Employee',
    avatar_url: profile.avatar_url,
    role: profile.role as KioskEmployeeStatus['role'],
    status,
    clock_record_id: activeClock?.id,
    clock_in_time: activeClock?.clock_in_time,
    active_break_id: activeBreakId,
    break_start_time: breakStartTime,
    today_shift: todayShift ?? null,
  }

  return NextResponse.json(result)
}
