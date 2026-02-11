/**
 * Kiosk PIN Verification Endpoint
 *
 * This endpoint verifies employee PINs for kiosk access with multiple security layers:
 * 1. Cloudflare Turnstile (anti-bot protection)
 * 2. Rate limiting (5 attempts per 15 minutes)
 * 3. PIN verification against database
 * 4. Session token generation (12-hour JWT)
 *
 * @see src/lib/turnstile/verify.ts
 * @see src/lib/kiosk/rate-limiter.ts
 * @see src/lib/kiosk/session.ts
 * @see src/lib/kiosk/security-logger.ts
 */

import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { KioskEmployeeStatus } from '@/types'
import { verifyTurnstileToken, getRateLimitKey } from '@/lib/turnstile/verify'
import { checkRateLimit, recordAttempt, resetRateLimit } from '@/lib/kiosk/rate-limiter'
import { generateKioskSessionToken } from '@/lib/kiosk/session'
import { logSecurityEvent } from '@/lib/kiosk/security-logger'

const pinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
  turnstile_token: z.string().min(1, 'Turnstile token required'),
})

export async function POST(request: NextRequest) {
  const ip = getRateLimitKey(request)

  // Parse and validate request body
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const validation = pinSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request format', details: validation.error.errors },
      { status: 400 }
    )
  }

  const { pin, turnstile_token } = validation.data

  // ============================================================================
  // STEP 1: Verify Turnstile token (anti-bot protection)
  // ============================================================================
  const turnstileResult = await verifyTurnstileToken(turnstile_token, ip)

  if (!turnstileResult.success) {
    // Fail-open strategy: Allow on timeout/internal-error but log
    if (turnstileResult.error === 'timeout' || turnstileResult.error === 'internal-error') {
      console.warn('[Kiosk] Turnstile verification unavailable, applying fail-open:', turnstileResult.error)
      await logSecurityEvent('turnstile_fallback', {
        ip,
        error: turnstileResult.error,
        message: turnstileResult.message,
      })
    } else {
      // Fail-closed: Reject on invalid token
      console.warn('[Kiosk] Turnstile verification failed:', turnstileResult.error)
      await logSecurityEvent('turnstile_failed', {
        ip,
        error: turnstileResult.error,
        errorCodes: turnstileResult.errorCodes,
      })
      return NextResponse.json(
        { error: 'Security verification failed', code: 'TURNSTILE_FAILED' },
        { status: 403 }
      )
    }
  }

  // ============================================================================
  // STEP 2: Check rate limit (5 attempts per 15 minutes)
  // ============================================================================
  const rateCheck = await checkRateLimit(ip)
  if (rateCheck.blocked) {
    await logSecurityEvent('rate_limit_exceeded', {
      ip,
      minutesRemaining: rateCheck.minutesRemaining,
    })
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.', minutes: rateCheck.minutesRemaining },
      { status: 429 }
    )
  }

  // ============================================================================
  // STEP 3: Verify PIN against database
  // ============================================================================
  const supabase = createAdminClient()

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
    // Record failed attempt for rate limiting
    await recordAttempt(ip, false)
    await logSecurityEvent('invalid_pin', { ip })
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  // ============================================================================
  // STEP 4: Success - Reset rate limit and generate session token
  // ============================================================================
  await resetRateLimit(ip)
  await recordAttempt(ip, true)

  // Extract profile (handle Supabase array quirk)
  const profileRaw = employee.profile as unknown
  const profile = (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as {
    id: string
    full_name: string | null
    role: string
    avatar_url: string | null
  }

  // Generate session token (12-hour JWT)
  let sessionToken: string
  try {
    sessionToken = generateKioskSessionToken(employee.id, profile.role)
  } catch (error) {
    console.error('[Kiosk] Failed to generate session token:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'SESSION_TOKEN_ERROR' },
      { status: 500 }
    )
  }

  // ============================================================================
  // STEP 5: Fetch employee status
  // ============================================================================

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

  const result: KioskEmployeeStatus & { session_token: string } = {
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
    session_token: sessionToken, // NEW: Session token for authenticated requests
  }

  return NextResponse.json(result)
}
