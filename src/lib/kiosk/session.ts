/**
 * Kiosk Session Token Management
 *
 * This module handles JWT-based session tokens for the kiosk system.
 * After a successful PIN verification, a session token is issued that authenticates
 * subsequent requests without requiring the PIN again.
 *
 * Security features:
 * - HMAC-SHA256 signatures
 * - 12-hour expiration (covers full shifts)
 * - Includes employee_id and role for authorization
 * - Type-tagged to prevent token confusion
 */

import jwt from 'jsonwebtoken'

/**
 * Session token payload structure
 */
export interface KioskSessionPayload {
  employee_id: string
  role: string
  type: 'kiosk_session'
  iat: number
  exp: number
}

/**
 * Token verification success result
 */
export interface VerifySuccess {
  success: true
  payload: KioskSessionPayload
}

/**
 * Token verification failure result
 */
export interface VerifyFailure {
  success: false
  error: 'invalid' | 'expired' | 'malformed' | 'missing-secret'
  message: string
}

export type VerifyResult = VerifySuccess | VerifyFailure

/**
 * Session token TTL (Time To Live) in seconds
 * 12 hours = 43200 seconds (covers full shifts)
 */
const SESSION_TTL = 12 * 60 * 60

/**
 * Generates a signed JWT session token for a kiosk employee
 *
 * @param employeeId - The employee's UUID
 * @param role - The employee's role (kitchen, bar, waiter, etc.)
 * @returns Signed JWT token string
 * @throws Error if KIOSK_SESSION_SECRET is not configured
 *
 * @example
 * ```typescript
 * const token = generateKioskSessionToken(employee.id, employee.role)
 * return Response.json({
 *   ...status,
 *   session_token: token
 * })
 * ```
 */
export function generateKioskSessionToken(employeeId: string, role: string): string {
  const secret = process.env.KIOSK_SESSION_SECRET

  if (!secret) {
    console.error('[Kiosk Session] KIOSK_SESSION_SECRET not configured')
    throw new Error('Session secret not configured')
  }

  const payload: Omit<KioskSessionPayload, 'iat' | 'exp'> = {
    employee_id: employeeId,
    role,
    type: 'kiosk_session',
  }

  const token = jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: SESSION_TTL,
  })

  return token
}

/**
 * Verifies and decodes a kiosk session token
 *
 * @param token - The JWT token to verify
 * @returns Verification result with payload or error details
 *
 * @example
 * ```typescript
 * const result = verifyKioskSessionToken(token)
 * if (!result.success) {
 *   return Response.json(
 *     { error: 'Invalid session', code: result.error },
 *     { status: 401 }
 *   )
 * }
 * const { employee_id, role } = result.payload
 * ```
 */
export function verifyKioskSessionToken(token: string): VerifyResult {
  const secret = process.env.KIOSK_SESSION_SECRET

  if (!secret) {
    console.error('[Kiosk Session] KIOSK_SESSION_SECRET not configured')
    return {
      success: false,
      error: 'missing-secret',
      message: 'Session secret not configured',
    }
  }

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
    })

    // Validate payload structure
    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      !('employee_id' in decoded) ||
      !('role' in decoded) ||
      !('type' in decoded) ||
      decoded.type !== 'kiosk_session'
    ) {
      return {
        success: false,
        error: 'malformed',
        message: 'Invalid token payload structure',
      }
    }

    return {
      success: true,
      payload: decoded as KioskSessionPayload,
    }
  } catch (error) {
    // Handle JWT verification errors
    if (error instanceof jwt.TokenExpiredError) {
      return {
        success: false,
        error: 'expired',
        message: 'Session token has expired',
      }
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return {
        success: false,
        error: 'invalid',
        message: error.message,
      }
    }

    // Unknown error
    console.error('[Kiosk Session] Token verification error:', error)
    return {
      success: false,
      error: 'invalid',
      message: 'Token verification failed',
    }
  }
}

/**
 * Extracts the JWT token from an Authorization header
 *
 * @param authHeader - The Authorization header value (e.g., "Bearer eyJ...")
 * @returns The extracted token or null if invalid format
 *
 * @example
 * ```typescript
 * const authHeader = request.headers.get('Authorization')
 * const token = extractTokenFromHeader(authHeader)
 * if (!token) {
 *   return Response.json({ error: 'Missing token' }, { status: 401 })
 * }
 * ```
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) {
    return null
  }

  // Check for "Bearer " prefix
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }

  return parts[1] || null
}

/**
 * Validates that a request's session token matches the claimed employee_id
 *
 * @param tokenEmployeeId - The employee_id from the verified token
 * @param requestEmployeeId - The employee_id from the request body
 * @returns True if they match
 *
 * @example
 * ```typescript
 * if (!validateEmployeeIdMatch(sessionPayload.employee_id, body.employee_id)) {
 *   return Response.json({ error: 'Employee ID mismatch' }, { status: 403 })
 * }
 * ```
 */
export function validateEmployeeIdMatch(
  tokenEmployeeId: string,
  requestEmployeeId: string
): boolean {
  return tokenEmployeeId === requestEmployeeId
}
