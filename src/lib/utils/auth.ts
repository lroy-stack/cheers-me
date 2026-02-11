import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type UserRole =
  | 'admin'
  | 'manager'
  | 'kitchen'
  | 'bar'
  | 'waiter'
  | 'dj'
  | 'owner'

/**
 * Get the current authenticated user and their profile
 * Wrapped with React cache() to deduplicate within the same server request
 * @returns User and profile data, or null if not authenticated
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  // Fetch profile and employee in parallel instead of sequentially
  const [profileResult, employeeResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('employees').select('*').eq('profile_id', user.id).single(),
  ])

  if (profileResult.error || !profileResult.data) {
    return null
  }

  return {
    user,
    profile: profileResult.data,
    employee: employeeResult.data || null,
  }
})

/**
 * Check if the current user has one of the specified roles
 * @param allowedRoles - Array of roles that are allowed
 * @returns true if user has one of the allowed roles, false otherwise
 */
export async function hasRole(allowedRoles: UserRole[]): Promise<boolean> {
  const userData = await getCurrentUser()

  if (!userData) {
    return false
  }

  return allowedRoles.includes(userData.profile.role as UserRole)
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  return hasRole(['admin'])
}

/**
 * Check if the current user is a manager or admin
 */
export async function isManagerOrAdmin(): Promise<boolean> {
  return hasRole(['admin', 'manager'])
}

/**
 * Check if the current user is owner, manager, or admin
 */
export async function canViewFinancials(): Promise<boolean> {
  return hasRole(['admin', 'manager', 'owner'])
}

/**
 * Middleware-style auth checker for API routes
 * Returns user data if authenticated, or an error response
 */
export async function requireAuth() {
  const userData = await getCurrentUser()

  if (!userData) {
    return {
      error: 'Unauthorized',
      status: 401,
    }
  }

  return {
    data: userData,
  }
}

/**
 * Middleware-style role checker for API routes
 * Returns user data if authorized, or an error response
 */
export async function requireRole(allowedRoles: UserRole[]) {
  const authResult = await requireAuth()

  if ('error' in authResult) {
    return authResult
  }

  const { data: userData } = authResult

  if (!allowedRoles.includes(userData.profile.role as UserRole)) {
    return {
      error: 'Forbidden',
      status: 403,
    }
  }

  return {
    data: userData,
  }
}
