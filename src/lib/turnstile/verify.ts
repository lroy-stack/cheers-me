/**
 * Cloudflare Turnstile Token Verification
 *
 * This module handles server-side verification of Turnstile challenge tokens.
 * Implements timeout protection, error handling, and fail-open strategy for resilience.
 *
 * @see https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

import { z } from 'zod'

/**
 * Cloudflare Turnstile API response schema
 */
const TurnstileResponseSchema = z.object({
  success: z.boolean(),
  'error-codes': z.array(z.string()).optional(),
  challenge_ts: z.string().optional(),
  hostname: z.string().optional(),
})

/**
 * Error codes returned by Cloudflare Turnstile
 */
export type TurnstileErrorCode =
  | 'missing-input-secret'
  | 'invalid-input-secret'
  | 'missing-input-response'
  | 'invalid-input-response'
  | 'bad-request'
  | 'timeout-or-duplicate'
  | 'internal-error'

/**
 * Verification result types
 */
export interface TurnstileVerifySuccess {
  success: true
  hostname?: string
  challenge_ts?: string
}

export interface TurnstileVerifyFailure {
  success: false
  error: 'timeout' | 'internal-error' | 'invalid-token' | 'network-error'
  errorCodes?: string[]
  message?: string
}

export type TurnstileVerifyResult = TurnstileVerifySuccess | TurnstileVerifyFailure

/**
 * Verifies a Turnstile challenge token with Cloudflare's API
 *
 * @param token - The turnstile response token from the client widget
 * @param remoteIp - The IP address of the client (optional but recommended)
 * @returns Verification result with success status and error details
 *
 * @example
 * ```typescript
 * const result = await verifyTurnstileToken(token, request.ip)
 * if (!result.success) {
 *   if (result.error === 'timeout' || result.error === 'internal-error') {
 *     // Fail-open: allow access but log the event
 *     await logSecurityEvent('turnstile_fallback', { error: result.error })
 *   } else {
 *     // Fail-closed: reject the request
 *     return Response.json({ error: 'Security verification failed' }, { status: 403 })
 *   }
 * }
 * ```
 */
export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string
): Promise<TurnstileVerifyResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  // Validate environment configuration
  if (!secretKey) {
    console.error('[Turnstile] TURNSTILE_SECRET_KEY not configured')
    return {
      success: false,
      error: 'internal-error',
      message: 'Turnstile secret key not configured',
    }
  }

  // Prepare request payload
  const formData = new URLSearchParams()
  formData.append('secret', secretKey)
  formData.append('response', token)
  if (remoteIp) {
    formData.append('remoteip', remoteIp)
  }

  try {
    // Call Cloudflare Turnstile verification endpoint with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    // Handle non-200 responses
    if (!response.ok) {
      console.error('[Turnstile] API returned non-200 status:', response.status)
      return {
        success: false,
        error: 'network-error',
        message: `Turnstile API returned status ${response.status}`,
      }
    }

    // Parse and validate response
    const data: unknown = await response.json()
    const parsed = TurnstileResponseSchema.safeParse(data)

    if (!parsed.success) {
      console.error('[Turnstile] Invalid API response schema:', parsed.error)
      return {
        success: false,
        error: 'internal-error',
        message: 'Invalid response from Turnstile API',
      }
    }

    const result = parsed.data

    // Handle verification failure
    if (!result.success) {
      const errorCodes = result['error-codes'] || []
      console.warn('[Turnstile] Verification failed:', errorCodes)

      // Determine error type
      if (errorCodes.includes('timeout-or-duplicate')) {
        return {
          success: false,
          error: 'timeout',
          errorCodes,
        }
      }

      if (errorCodes.includes('internal-error')) {
        return {
          success: false,
          error: 'internal-error',
          errorCodes,
        }
      }

      return {
        success: false,
        error: 'invalid-token',
        errorCodes,
      }
    }

    // Success
    return {
      success: true,
      hostname: result.hostname,
      challenge_ts: result.challenge_ts,
    }
  } catch (error) {
    // Handle timeout
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[Turnstile] Verification timeout after 10s')
      return {
        success: false,
        error: 'timeout',
        message: 'Turnstile verification timeout',
      }
    }

    // Handle other errors
    console.error('[Turnstile] Verification error:', error)
    return {
      success: false,
      error: 'network-error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Helper to extract rate limit key from Next.js request
 */
export function getRateLimitKey(request: Request): string {
  // Try x-forwarded-for (Vercel provides this)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }

  // Try x-real-ip
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Fallback
  return 'unknown'
}
