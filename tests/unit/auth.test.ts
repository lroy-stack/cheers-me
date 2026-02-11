import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import {
  getCurrentUser,
  hasRole,
  isAdmin,
  isManagerOrAdmin,
  canViewFinancials,
  requireAuth,
  requireRole,
} from '@/lib/utils/auth'

// Mock the Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('Auth Utilities', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabase)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getCurrentUser', () => {
    it('returns null when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await getCurrentUser()
      expect(result).toBeNull()
    })

    it('returns null when auth error occurs', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Auth error'),
      })

      const result = await getCurrentUser()
      expect(result).toBeNull()
    })

    it('returns null when profile query fails', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Profile not found'),
        }),
        select: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await getCurrentUser()
      expect(result).toBeNull()
    })

    it('returns user and profile when authenticated', async () => {
      const mockUser = { id: 'user-123', email: 'manager@cheers.com' }
      const mockProfile = {
        id: 'user-123',
        role: 'manager',
        display_name: 'Leroy Manager',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
        select: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await getCurrentUser()
      expect(result).not.toBeNull()
      expect(result?.user).toEqual(mockUser)
      expect(result?.profile).toEqual(mockProfile)
    })
  })

  describe('hasRole', () => {
    it('returns false when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await hasRole(['manager', 'admin'])
      expect(result).toBe(false)
    })

    it('returns true when user has allowed role', async () => {
      const mockUser = { id: 'user-123', email: 'manager@cheers.com' }
      const mockProfile = {
        id: 'user-123',
        role: 'manager',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
        select: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await hasRole(['manager', 'admin'])
      expect(result).toBe(true)
    })

    it('returns false when user does not have allowed role', async () => {
      const mockUser = { id: 'user-123', email: 'waiter@cheers.com' }
      const mockProfile = {
        id: 'user-123',
        role: 'waiter',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
        select: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await hasRole(['manager', 'admin'])
      expect(result).toBe(false)
    })
  })

  describe('isAdmin', () => {
    it('returns true for admin users', async () => {
      const mockUser = { id: 'admin-1', email: 'admin@cheers.com' }
      const mockProfile = {
        id: 'admin-1',
        role: 'admin',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
        select: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await isAdmin()
      expect(result).toBe(true)
    })

    it('returns false for non-admin users', async () => {
      const mockUser = { id: 'waiter-1', email: 'waiter@cheers.com' }
      const mockProfile = {
        id: 'waiter-1',
        role: 'waiter',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
        select: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await isAdmin()
      expect(result).toBe(false)
    })
  })

  describe('isManagerOrAdmin', () => {
    it('returns true for manager users', async () => {
      const mockUser = { id: 'manager-1', email: 'manager@cheers.com' }
      const mockProfile = {
        id: 'manager-1',
        role: 'manager',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
        select: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await isManagerOrAdmin()
      expect(result).toBe(true)
    })

    it('returns true for admin users', async () => {
      const mockUser = { id: 'admin-1', email: 'admin@cheers.com' }
      const mockProfile = {
        id: 'admin-1',
        role: 'admin',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
        select: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await isManagerOrAdmin()
      expect(result).toBe(true)
    })

    it('returns false for other roles', async () => {
      const mockUser = { id: 'waiter-1', email: 'waiter@cheers.com' }
      const mockProfile = {
        id: 'waiter-1',
        role: 'waiter',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
        select: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await isManagerOrAdmin()
      expect(result).toBe(false)
    })
  })

  describe('canViewFinancials', () => {
    const financialRoles = ['admin', 'manager', 'owner']

    financialRoles.forEach(role => {
      it(`returns true for ${role} users`, async () => {
        const mockUser = { id: `${role}-1`, email: `${role}@cheers.com` }
        const mockProfile = {
          id: `${role}-1`,
          role,
        }

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        })

        const mockQuery = {
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
          select: vi.fn().mockReturnThis(),
        }

        mockSupabase.from.mockReturnValue(mockQuery)

        const result = await canViewFinancials()
        expect(result).toBe(true)
      })
    })

    it('returns false for non-financial roles', async () => {
      const mockUser = { id: 'waiter-1', email: 'waiter@cheers.com' }
      const mockProfile = {
        id: 'waiter-1',
        role: 'waiter',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
        select: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await canViewFinancials()
      expect(result).toBe(false)
    })
  })

  describe('requireAuth', () => {
    it('returns error when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await requireAuth()
      expect(result).toEqual({ error: 'Unauthorized', status: 401 })
    })

    it('returns user data when authenticated', async () => {
      const mockUser = { id: 'user-123', email: 'test@cheers.com' }
      const mockProfile = {
        id: 'user-123',
        role: 'manager',
      }
      const mockEmployee = {
        id: 'user-123',
        role: 'manager',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) {
            // First call is for profile
            return Promise.resolve({
              data: mockProfile,
              error: null,
            })
          } else {
            // Second call is for employee
            return Promise.resolve({
              data: mockEmployee,
              error: null,
            })
          }
        }),
        select: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await requireAuth()
      expect(result).toEqual({
        data: {
          user: mockUser,
          profile: mockProfile,
          employee: mockEmployee,
        },
      })
    })
  })

  describe('requireRole', () => {
    it('returns error when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await requireRole(['manager', 'admin'])
      expect(result).toEqual({ error: 'Unauthorized', status: 401 })
    })

    it('returns error when user lacks required role', async () => {
      const mockUser = { id: 'waiter-1', email: 'waiter@cheers.com' }
      const mockProfile = {
        id: 'waiter-1',
        role: 'waiter',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
        select: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await requireRole(['manager', 'admin'])
      expect(result).toEqual({ error: 'Forbidden', status: 403 })
    })

    it('returns user data when user has required role', async () => {
      const mockUser = { id: 'manager-1', email: 'manager@cheers.com' }
      const mockProfile = {
        id: 'manager-1',
        role: 'manager',
      }
      const mockEmployee = {
        id: 'manager-1',
        role: 'manager',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      let callCount = 0
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) {
            // First call is for profile
            return Promise.resolve({
              data: mockProfile,
              error: null,
            })
          } else {
            // Second call is for employee
            return Promise.resolve({
              data: mockEmployee,
              error: null,
            })
          }
        }),
        select: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await requireRole(['manager', 'admin'])
      expect(result).toEqual({
        data: {
          user: mockUser,
          profile: mockProfile,
          employee: mockEmployee,
        },
      })
    })
  })
})
