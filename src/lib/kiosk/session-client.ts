/**
 * Kiosk Session Client Utilities
 *
 * Helper functions for managing kiosk session tokens on the client side.
 * These utilities are used by kiosk components to include the session token
 * in API requests.
 */

/**
 * Gets the current kiosk session token from localStorage
 *
 * @returns The session token or null if not found
 */
export function getKioskSessionToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  return localStorage.getItem('kiosk_session_token')
}

/**
 * Clears the kiosk session token from localStorage
 */
export function clearKioskSessionToken(): void {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.removeItem('kiosk_session_token')
}

/**
 * Gets headers with the Authorization token for kiosk API requests
 *
 * @returns Headers object with Content-Type and Authorization
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/public/kiosk/clock-in', {
 *   method: 'POST',
 *   headers: getKioskHeaders(),
 *   body: JSON.stringify({ employee_id: '...' })
 * })
 * ```
 */
export function getKioskHeaders(): HeadersInit {
  const token = getKioskSessionToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}

/**
 * Checks if a response indicates an expired session (401 status)
 * If so, clears the session token and returns true
 *
 * @param response - The fetch Response object
 * @returns True if session expired, false otherwise
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/public/kiosk/clock-in', ...)
 * if (handleSessionExpired(response)) {
 *   onSessionExpired() // Redirect to login
 *   return
 * }
 * ```
 */
export function handleSessionExpired(response: Response): boolean {
  if (response.status === 401) {
    clearKioskSessionToken()
    return true
  }
  return false
}
