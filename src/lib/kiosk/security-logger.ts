/**
 * Kiosk Security Event Logger
 *
 * This module provides centralized logging for security-related events in the kiosk system.
 * Events are persisted to Supabase for audit trails and monitoring.
 *
 * Event types tracked:
 * - turnstile_failed: Cloudflare challenge verification failed
 * - turnstile_fallback: Cloudflare API unavailable, fail-open applied
 * - rate_limit_exceeded: Too many failed PIN attempts
 * - invalid_pin: Incorrect PIN entered
 * - invalid_session_token: Invalid or malformed session token
 * - session_token_expired: Session token has expired
 * - unauthorized_access: Employee ID mismatch or unauthorized action
 *
 * @see supabase/migrations/0071_kiosk_security_events.sql
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Security event types
 */
export type SecurityEventType =
  | 'turnstile_failed'
  | 'turnstile_fallback'
  | 'rate_limit_exceeded'
  | 'invalid_pin'
  | 'invalid_session_token'
  | 'session_token_expired'
  | 'unauthorized_access'

/**
 * Security event metadata (flexible JSON structure)
 */
export type SecurityEventMetadata = Record<string, unknown>

/**
 * Logs a security event to the database
 *
 * @param eventType - The type of security event
 * @param metadata - Additional contextual information about the event
 *
 * @example
 * ```typescript
 * // Log Turnstile failure
 * await logSecurityEvent('turnstile_failed', {
 *   ip: '192.168.1.1',
 *   errorCodes: ['timeout-or-duplicate']
 * })
 *
 * // Log rate limit exceeded
 * await logSecurityEvent('rate_limit_exceeded', {
 *   ip: '192.168.1.1',
 *   attempts: 5
 * })
 *
 * // Log unauthorized access attempt
 * await logSecurityEvent('unauthorized_access', {
 *   path: '/api/public/kiosk/clock-in',
 *   tokenEmployeeId: 'uuid-1',
 *   requestEmployeeId: 'uuid-2'
 * })
 * ```
 */
export async function logSecurityEvent(
  eventType: SecurityEventType,
  metadata: SecurityEventMetadata = {}
): Promise<void> {
  try {
    const supabase = await createClient()

    // Add timestamp to metadata if not present
    const enrichedMetadata = {
      ...metadata,
      timestamp: new Date().toISOString(),
    }

    const { error } = await supabase.from('kiosk_security_events').insert({
      event_type: eventType,
      metadata: enrichedMetadata,
    })

    if (error) {
      console.error('[Security Logger] Failed to log event:', {
        eventType,
        error,
      })
      // Don't throw - logging failures shouldn't break the main flow
    }
  } catch (error) {
    console.error('[Security Logger] Unexpected error:', {
      eventType,
      error,
    })
    // Don't throw - logging failures shouldn't break the main flow
  }
}

/**
 * Retrieves recent security events for monitoring
 *
 * @param limit - Maximum number of events to retrieve (default: 100)
 * @param eventType - Optional filter by event type
 * @returns Array of security events
 *
 * @example
 * ```typescript
 * // Get last 50 events
 * const events = await getRecentSecurityEvents(50)
 *
 * // Get last 20 rate limit events
 * const rateLimitEvents = await getRecentSecurityEvents(20, 'rate_limit_exceeded')
 * ```
 */
export async function getRecentSecurityEvents(
  limit = 100,
  eventType?: SecurityEventType
): Promise<Array<{ id: string; event_type: string; metadata: SecurityEventMetadata; created_at: string }>> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('kiosk_security_events')
      .select('id, event_type, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (eventType) {
      query = query.eq('event_type', eventType)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Security Logger] Failed to retrieve events:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('[Security Logger] Unexpected error retrieving events:', error)
    return []
  }
}

/**
 * Gets event count statistics by type for monitoring dashboard
 *
 * @param hours - Number of hours to look back (default: 24)
 * @returns Map of event types to counts
 *
 * @example
 * ```typescript
 * const stats = await getEventStatistics(24)
 * console.log(`Rate limit events in last 24h: ${stats.rate_limit_exceeded || 0}`)
 * ```
 */
export async function getEventStatistics(
  hours = 24
): Promise<Record<SecurityEventType, number>> {
  try {
    const supabase = await createClient()
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('kiosk_security_events')
      .select('event_type')
      .gte('created_at', since)

    if (error) {
      console.error('[Security Logger] Failed to get statistics:', error)
      return {} as Record<SecurityEventType, number>
    }

    // Count events by type
    const stats: Record<string, number> = {}
    for (const event of data || []) {
      stats[event.event_type] = (stats[event.event_type] || 0) + 1
    }

    return stats as Record<SecurityEventType, number>
  } catch (error) {
    console.error('[Security Logger] Unexpected error getting statistics:', error)
    return {} as Record<SecurityEventType, number>
  }
}

/**
 * Checks if there's an anomalous spike in security events
 * Useful for alerting/monitoring systems
 *
 * @param eventType - The event type to check
 * @param threshold - Number of events considered anomalous (default: 10)
 * @param minutes - Time window in minutes (default: 60)
 * @returns True if threshold exceeded
 *
 * @example
 * ```typescript
 * // Check if more than 10 rate limit events in last hour
 * const isAnomaly = await detectAnomaly('rate_limit_exceeded', 10, 60)
 * if (isAnomaly) {
 *   await sendAlert('High rate limit activity detected')
 * }
 * ```
 */
export async function detectAnomaly(
  eventType: SecurityEventType,
  threshold = 10,
  minutes = 60
): Promise<boolean> {
  try {
    const supabase = await createClient()
    const since = new Date(Date.now() - minutes * 60 * 1000).toISOString()

    const { count, error } = await supabase
      .from('kiosk_security_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', eventType)
      .gte('created_at', since)

    if (error) {
      console.error('[Security Logger] Failed to detect anomaly:', error)
      return false
    }

    return (count || 0) > threshold
  } catch (error) {
    console.error('[Security Logger] Unexpected error detecting anomaly:', error)
    return false
  }
}
