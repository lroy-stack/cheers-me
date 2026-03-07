/**
 * Kiosk Session Authentication Middleware
 *
 * This module provides middleware to authenticate kiosk requests using JWT session tokens.
 * After a successful PIN verification, a session token is issued that must be included
 * in the Authorization header for all subsequent kiosk requests.
 *
 * Usage in API routes:
 * ```typescript
 * const authResult = await requireKioskSession(request)
 * if (!authResult.success) {
 *   return authResult.response // 401 Unauthorized
 * }
 * const { employeeId, role } = authResult
 * ```
 *
 * @see src/lib/kiosk/session.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { extractTokenFromHeader, verifyKioskSessionToken } from './session'
import { logSecurityEvent } from './security-logger'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Successful authentication result
 */
export interface AuthSuccess {
  success: true
  employeeId: string
  role: string
}

/**
 * Failed authentication result with response to return
 */
export interface AuthFailure {
  success: false
  response: NextResponse
}

export type AuthResult = AuthSuccess | AuthFailure

/**
 * Middleware to require a valid kiosk session token
 *
 * @param request - The Next.js request object
 * @returns Authentication result with employee info or error response
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const authResult = await requireKioskSession(request)
 *   if (!authResult.success) {
 *     return authResult.response
 *   }
 *
 *   const { employeeId, role } = authResult
 *   // Proceed with authenticated request
 * }
 * ```
 */
export async function requireKioskSession(request: NextRequest): Promise<AuthResult> {
  // Extract token: prefer httpOnly cookie, fall back to Authorization header
  let token: string | null = null

  // 1. Try httpOnly cookie first (more secure)
  const cookieToken = request.cookies.get('kiosk_session')?.value
  if (cookieToken) {
    token = cookieToken
  } else {
    // 2. Fall back to Authorization header (for backward compatibility)
    const authHeader = request.headers.get('Authorization')
    token = extractTokenFromHeader(authHeader)
  }

  if (!token) {
    await logSecurityEvent('invalid_session_token', {
      path: request.nextUrl.pathname,
      error: 'missing_token',
    })
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Authorization required', code: 'MISSING_AUTH' },
        { status: 401 }
      ),
    }
  }

  // Check token blacklist before verifying
  try {
    const supabase = createAdminClient()
    const { data: blacklisted } = await supabase
      .from('kiosk_session_blacklist')
      .select('id')
      .eq('session_token', token)
      .maybeSingle()

    if (blacklisted) {
      await logSecurityEvent('invalid_session_token', {
        path: request.nextUrl.pathname,
        error: 'blacklisted',
      })
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Session has been revoked', code: 'SESSION_REVOKED' },
          { status: 401 }
        ),
      }
    }
  } catch {
    // Non-fatal: if blacklist check fails, continue with token verification
  }

  // Verify token signature and expiration
  const verifyResult = verifyKioskSessionToken(token)
  if (!verifyResult.success) {
    // Log specific error type
    if (verifyResult.error === 'expired') {
      await logSecurityEvent('session_token_expired', {
        path: request.nextUrl.pathname,
      })
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Session expired. Please log in again.', code: 'SESSION_EXPIRED' },
          { status: 401 }
        ),
      }
    }

    await logSecurityEvent('invalid_session_token', {
      path: request.nextUrl.pathname,
      error: verifyResult.error,
      message: verifyResult.message,
    })

    return {
      success: false,
      response: NextResponse.json(
        { error: 'Invalid session token', code: 'INVALID_SESSION_TOKEN' },
        { status: 401 }
      ),
    }
  }

  // Success - return employee info
  return {
    success: true,
    employeeId: verifyResult.payload.employee_id,
    role: verifyResult.payload.role,
  }
}

/**
 * Validates that the authenticated employee matches the request employee_id
 *
 * @param tokenEmployeeId - The employee_id from the session token
 * @param requestEmployeeId - The employee_id from the request body
 * @param request - The Next.js request object (for logging)
 * @returns Null if valid, NextResponse if invalid
 *
 * @example
 * ```typescript
 * const validation = await validateEmployeeMatch(
 *   authResult.employeeId,
 *   body.employee_id,
 *   request
 * )
 * if (validation) {
 *   return validation // 403 Forbidden
 * }
 * ```
 */
export async function validateEmployeeMatch(
  tokenEmployeeId: string,
  requestEmployeeId: string,
  request: NextRequest
): Promise<NextResponse | null> {
  if (tokenEmployeeId !== requestEmployeeId) {
    await logSecurityEvent('unauthorized_access', {
      path: request.nextUrl.pathname,
      tokenEmployeeId,
      requestEmployeeId,
    })

    return NextResponse.json(
      { error: 'Employee ID mismatch. Unauthorized action.', code: 'EMPLOYEE_MISMATCH' },
      { status: 403 }
    )
  }

  return null
}
