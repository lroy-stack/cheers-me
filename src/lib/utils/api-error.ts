import { NextResponse } from 'next/server'

/**
 * Return a safe JSON error response.
 * NEVER expose internal error.message to the client — use a generic message.
 * Optionally log the internal error server-side for debugging.
 *
 * @param status  HTTP status code (400, 401, 403, 404, 409, 500, …)
 * @param message Public-facing message (safe to expose)
 * @param internalError  Optional internal error for server-side logging only
 */
export function apiError(
  status: number,
  message: string,
  internalError?: unknown
): NextResponse {
  if (internalError !== undefined) {
    // Log internally but never send to client
    const ctx = internalError instanceof Error
      ? `${internalError.name}: ${internalError.message}`
      : String(internalError)
    console.error(`[api-error] ${status} — ${ctx}`)
  }
  return NextResponse.json({ error: message }, { status })
}

/**
 * Standard 500 Internal Server Error response.
 * Use this anywhere you'd otherwise return error.message.
 */
export function apiInternalError(internalError?: unknown): NextResponse {
  return apiError(500, 'Internal server error', internalError)
}

/**
 * Standard 400 Bad Request response.
 */
export function apiBadRequest(message = 'Bad request'): NextResponse {
  return apiError(400, message)
}

/**
 * Standard 401 Unauthorized response.
 */
export function apiUnauthorized(): NextResponse {
  return apiError(401, 'Unauthorized')
}

/**
 * Standard 403 Forbidden response.
 */
export function apiForbidden(): NextResponse {
  return apiError(403, 'Forbidden')
}

/**
 * Standard 404 Not Found response.
 */
export function apiNotFound(resource = 'Resource'): NextResponse {
  return apiError(404, `${resource} not found`)
}
