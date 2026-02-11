/**
 * Kiosk Rate Limiter with Supabase Persistence
 *
 * This module implements rate limiting for kiosk PIN verification to prevent
 * brute-force attacks on 4-digit PINs.
 *
 * Strategy:
 * - 5 failed attempts per IP in 15-minute window
 * - Persistent storage in Supabase (survives cold starts)
 * - In-memory fallback if database is unavailable
 * - Auto-cleanup of old records via database trigger
 *
 * @see supabase/migrations/0070_kiosk_rate_limits.sql
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Rate limit configuration
 */
const MAX_ATTEMPTS = 5
const WINDOW_MINUTES = 15

/**
 * In-memory fallback store (used if database is unavailable)
 * Key: IP address, Value: array of attempt timestamps
 */
const memoryStore = new Map<string, number[]>()

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  blocked: boolean
  minutesRemaining?: number
  attemptsRemaining?: number
}

/**
 * Checks if an IP address is rate-limited for PIN verification
 *
 * @param ip - The client's IP address
 * @returns Rate limit status with remaining time if blocked
 *
 * @example
 * ```typescript
 * const rateCheck = await checkRateLimit(ip)
 * if (rateCheck.blocked) {
 *   return Response.json(
 *     { error: 'Too many attempts', minutes: rateCheck.minutesRemaining },
 *     { status: 429 }
 *   )
 * }
 * ```
 */
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  try {
    const supabase = await createClient()
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000)

    // Query recent attempts from database
    const { data, error } = await supabase
      .from('kiosk_rate_limits')
      .select('attempt_at, success')
      .eq('ip_address', ip)
      .gte('attempt_at', windowStart.toISOString())
      .order('attempt_at', { ascending: false })

    if (error) {
      console.error('[Rate Limiter] Database query failed:', error)
      // Fallback to in-memory check
      return checkRateLimitMemory(ip)
    }

    // Count failed attempts in window
    const failedAttempts = data?.filter((record) => !record.success) || []

    if (failedAttempts.length >= MAX_ATTEMPTS) {
      // Find oldest failed attempt to calculate remaining time
      const oldestAttempt = new Date(failedAttempts[failedAttempts.length - 1]!.attempt_at)
      const resetTime = new Date(oldestAttempt.getTime() + WINDOW_MINUTES * 60 * 1000)
      const minutesRemaining = Math.ceil((resetTime.getTime() - Date.now()) / 60000)

      return {
        blocked: true,
        minutesRemaining: Math.max(1, minutesRemaining),
      }
    }

    return {
      blocked: false,
      attemptsRemaining: MAX_ATTEMPTS - failedAttempts.length,
    }
  } catch (error) {
    console.error('[Rate Limiter] Unexpected error:', error)
    // Fallback to in-memory check
    return checkRateLimitMemory(ip)
  }
}

/**
 * Records a PIN verification attempt in the database
 *
 * @param ip - The client's IP address
 * @param success - Whether the PIN verification succeeded
 *
 * @example
 * ```typescript
 * // Record failed attempt
 * await recordAttempt(ip, false)
 *
 * // Record successful attempt
 * await recordAttempt(ip, true)
 * ```
 */
export async function recordAttempt(ip: string, success: boolean): Promise<void> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from('kiosk_rate_limits').insert({
      ip_address: ip,
      success,
      attempt_at: new Date().toISOString(),
    })

    if (error) {
      console.error('[Rate Limiter] Failed to record attempt:', error)
      // Fallback to in-memory recording
      recordAttemptMemory(ip)
    }
  } catch (error) {
    console.error('[Rate Limiter] Unexpected error recording attempt:', error)
    // Fallback to in-memory recording
    recordAttemptMemory(ip)
  }
}

/**
 * Resets the rate limit for an IP address after successful authentication
 *
 * @param ip - The client's IP address
 *
 * @example
 * ```typescript
 * // After successful PIN verification
 * await resetRateLimit(ip)
 * ```
 */
export async function resetRateLimit(ip: string): Promise<void> {
  try {
    const supabase = await createClient()

    // Delete all failed attempts for this IP
    const { error } = await supabase
      .from('kiosk_rate_limits')
      .delete()
      .eq('ip_address', ip)
      .eq('success', false)

    if (error) {
      console.error('[Rate Limiter] Failed to reset rate limit:', error)
    }

    // Also clear from memory store
    memoryStore.delete(ip)
  } catch (error) {
    console.error('[Rate Limiter] Unexpected error resetting rate limit:', error)
    // Clear from memory store as fallback
    memoryStore.delete(ip)
  }
}

/**
 * In-memory fallback: Check rate limit using local store
 */
function checkRateLimitMemory(ip: string): RateLimitResult {
  const now = Date.now()
  const windowStart = now - WINDOW_MINUTES * 60 * 1000

  // Get or initialize attempts array
  const attempts = memoryStore.get(ip) || []

  // Filter to only recent attempts
  const recentAttempts = attempts.filter((timestamp) => timestamp > windowStart)

  // Update store with filtered attempts
  if (recentAttempts.length > 0) {
    memoryStore.set(ip, recentAttempts)
  } else {
    memoryStore.delete(ip)
  }

  if (recentAttempts.length >= MAX_ATTEMPTS) {
    const oldestAttempt = recentAttempts[0]!
    const resetTime = oldestAttempt + WINDOW_MINUTES * 60 * 1000
    const minutesRemaining = Math.ceil((resetTime - now) / 60000)

    return {
      blocked: true,
      minutesRemaining: Math.max(1, minutesRemaining),
    }
  }

  return {
    blocked: false,
    attemptsRemaining: MAX_ATTEMPTS - recentAttempts.length,
  }
}

/**
 * In-memory fallback: Record attempt in local store
 */
function recordAttemptMemory(ip: string): void {
  const now = Date.now()
  const attempts = memoryStore.get(ip) || []
  attempts.push(now)
  memoryStore.set(ip, attempts)
}

/**
 * Cleanup function for in-memory store (called periodically)
 * Removes entries older than the rate limit window
 */
export function cleanupMemoryStore(): void {
  const now = Date.now()
  const windowStart = now - WINDOW_MINUTES * 60 * 1000

  for (const [ip, attempts] of memoryStore.entries()) {
    const recentAttempts = attempts.filter((timestamp) => timestamp > windowStart)
    if (recentAttempts.length > 0) {
      memoryStore.set(ip, recentAttempts)
    } else {
      memoryStore.delete(ip)
    }
  }
}

// Schedule periodic cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupMemoryStore, 5 * 60 * 1000)
}
