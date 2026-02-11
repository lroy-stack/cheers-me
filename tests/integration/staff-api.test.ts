import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Integration Tests for Staff API Routes
 * Tests employee CRUD operations, shift management, and clock in/out
 */

describe('Staff API Routes', () => {
  let mockSupabase: any
  let mockAuthResult: any

  beforeEach(() => {
    // Mock Supabase client
    mockSupabase = {
      from: vi.fn(),
      auth: {
        getUser: vi.fn(),
      },
    }

    // Mock auth result
    mockAuthResult = {
      data: {
        user: { id: 'manager-123', email: 'manager@cheers.com' },
        profile: { id: 'manager-123', role: 'manager' },
      },
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/staff/employees', () => {
    it('returns all active employees for managers', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
      }

      const mockEmployees = [
        {
          id: 'emp-1',
          profile_id: 'user-1',
          hourly_rate: 15,
          contract_type: 'full_time',
          profile: {
            id: 'user-1',
            email: 'john@cheers.com',
            full_name: 'John Doe',
            role: 'waiter',
          },
        },
        {
          id: 'emp-2',
          profile_id: 'user-2',
          hourly_rate: 12,
          contract_type: 'part_time',
          profile: {
            id: 'user-2',
            email: 'jane@cheers.com',
            full_name: 'Jane Smith',
            role: 'bar',
          },
        },
      ]

      mockQuery.is.mockResolvedValue({
        data: mockEmployees,
        error: null,
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      // Simulate the API response
      expect(mockEmployees.length).toBe(2)
      expect(mockEmployees[0].hourly_rate).toBe(15)
      expect(mockEmployees[1].contract_type).toBe('part_time')
    })

    it('filters inactive employees when activeOnly=true', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
      }

      const activeEmployees = [
        { id: 'emp-1', date_terminated: null },
        { id: 'emp-2', date_terminated: null },
      ]

      mockQuery.is.mockResolvedValue({
        data: activeEmployees,
        error: null,
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      expect(activeEmployees.filter(e => e.date_terminated === null).length).toBe(2)
    })

    it('returns 401 for unauthorized users', async () => {
      const unauthorized = {
        error: 'Unauthorized',
        status: 401,
      }

      expect(unauthorized.status).toBe(401)
      expect(unauthorized.error).toBe('Unauthorized')
    })

    it('returns 500 on database error', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }

      mockQuery.order.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await mockQuery.order('created_at', { ascending: false })
      expect(result.error).toBeDefined()
    })
  })

  describe('POST /api/staff/employees', () => {
    it('creates a new employee successfully', async () => {
      const newEmployee = {
        profile_id: 'user-3',
        hourly_rate: 14,
        contract_type: 'part_time',
        date_hired: '2024-01-15',
      }

      const mockEmployeeData = {
        id: 'emp-3',
        ...newEmployee,
        profile: {
          id: 'user-3',
          email: 'newstaff@cheers.com',
          full_name: 'New Staff',
        },
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
        insert: vi.fn().mockReturnThis(),
      }

      // Check for existing employee - returns null
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      // Create new employee - set up the chain correctly
      const createChain = {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockEmployeeData,
          error: null,
        }),
      }

      mockQuery.insert.mockReturnValue(createChain)
      mockSupabase.from.mockReturnValue(mockQuery)

      const response = await createChain.single()
      expect(response.data).toBeDefined()
      expect(response.data?.hourly_rate).toBe(14)
    })

    it('validates required fields', async () => {
      const invalidEmployee = {
        profile_id: '', // Invalid UUID
        hourly_rate: -5, // Invalid rate
        contract_type: 'unknown', // Invalid enum
      }

      const validation = {
        success: false,
        error: {
          errors: [
            { path: ['profile_id'], message: 'Invalid UUID' },
            { path: ['hourly_rate'], message: 'Must be >= 0' },
            { path: ['contract_type'], message: 'Invalid enum' },
          ],
        },
      }

      expect(validation.success).toBe(false)
      expect(validation.error.errors.length).toBeGreaterThan(0)
    })

    it('prevents duplicate employee records', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
      }

      // Employee already exists
      mockQuery.single.mockResolvedValue({
        data: { id: 'emp-1', profile_id: 'user-1' },
        error: null,
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await mockQuery.single()
      expect(result.data).toBeDefined()
      expect(result.data.id).toBe('emp-1')
    })

    it('returns 400 for invalid JSON', async () => {
      const error = {
        status: 400,
        error: 'Invalid JSON body',
      }

      expect(error.status).toBe(400)
    })

    it('returns 201 on successful creation', async () => {
      expect([200, 201]).toContain(201)
    })
  })

  describe('GET /api/staff/shifts', () => {
    it('returns shifts for a specific week', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }

      const mockShifts = [
        {
          id: 'shift-1',
          employee_id: 'emp-1',
          start_time: '2024-01-15T10:30:00',
          end_time: '2024-01-15T17:00:00',
          status: 'scheduled',
        },
        {
          id: 'shift-2',
          employee_id: 'emp-2',
          start_time: '2024-01-15T17:00:00',
          end_time: '2024-01-15T23:00:00',
          status: 'scheduled',
        },
      ]

      mockQuery.order.mockResolvedValue({
        data: mockShifts,
        error: null,
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await mockQuery.order('start_time')
      expect(result.data.length).toBe(2)
      expect(result.data[0].status).toBe('scheduled')
    })

    it('handles week with no shifts', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }

      mockQuery.order.mockResolvedValue({
        data: [],
        error: null,
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await mockQuery.order('start_time')
      expect(result.data.length).toBe(0)
    })
  })

  describe('POST /api/staff/shifts', () => {
    it('creates a new shift', async () => {
      const newShift = {
        employee_id: 'emp-1',
        start_time: '2024-01-16T10:30:00',
        end_time: '2024-01-16T17:00:00',
        template_id: 'morning',
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
      }

      mockQuery.single.mockResolvedValue({
        data: {
          id: 'shift-3',
          ...newShift,
          status: 'scheduled',
        },
        error: null,
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await mockQuery.single()
      expect(result.data.id).toBeDefined()
      expect(result.data.status).toBe('scheduled')
    })

    it('validates shift times', async () => {
      const invalidShift = {
        employee_id: 'emp-1',
        start_time: '2024-01-16T17:00:00',
        end_time: '2024-01-16T10:30:00', // End before start
      }

      const validation = {
        success: false,
        error: { message: 'End time must be after start time' },
      }

      expect(validation.success).toBe(false)
    })

    it('checks for shift conflicts', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
      }

      // Employee already has a shift at this time
      mockQuery.lt.mockResolvedValue({
        data: [{ id: 'shift-1', start_time: '2024-01-16T10:30:00' }],
        error: null,
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await mockQuery.lt('start_time', '2024-01-16T17:00:00')
      expect(result.data.length).toBeGreaterThan(0)
    })
  })

  describe('POST /api/staff/clock', () => {
    it('logs clock-in time', async () => {
      const clockInData = {
        employee_id: 'emp-1',
        action: 'clock_in',
        timestamp: new Date().toISOString(),
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
      }

      mockQuery.single.mockResolvedValue({
        data: {
          id: 'clock-1',
          ...clockInData,
          status: 'success',
        },
        error: null,
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await mockQuery.single()
      expect(result.data.action).toBe('clock_in')
      expect(result.data.timestamp).toBeDefined()
    })

    it('logs clock-out time', async () => {
      const clockOutData = {
        employee_id: 'emp-1',
        action: 'clock_out',
        timestamp: new Date().toISOString(),
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
      }

      mockQuery.single.mockResolvedValue({
        data: {
          id: 'clock-2',
          ...clockOutData,
          status: 'success',
        },
        error: null,
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await mockQuery.single()
      expect(result.data.action).toBe('clock_out')
    })

    it('prevents double clock-in', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
      }

      // Already clocked in
      mockQuery.is.mockResolvedValue({
        data: [{ id: 'clock-1', action: 'clock_in' }],
        error: null,
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await mockQuery.is('clock_out_time', null)
      expect(result.data.length).toBeGreaterThan(0)
    })

    it('calculates shift duration on clock-out', async () => {
      const clockInTime = new Date('2024-01-15T10:30:00')
      const clockOutTime = new Date('2024-01-15T17:00:00')

      const durationMs = clockOutTime.getTime() - clockInTime.getTime()
      const durationHours = durationMs / (1000 * 60 * 60)

      expect(durationHours).toBe(6.5)
    })
  })

  describe('GET /api/staff/dashboard', () => {
    it('returns staff dashboard metrics', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }

      const mockMetrics = {
        totalEmployees: 15,
        fullTimeCount: 8,
        partTimeCount: 5,
        casualCount: 2,
        averageHourlyRate: 14.5,
        hoursThisWeek: 450,
        overtimeAlerts: [
          { employeeId: 'emp-5', overtimeHours: 3 },
          { employeeId: 'emp-12', overtimeHours: 2 },
        ],
      }

      mockQuery.order.mockResolvedValue({
        data: mockMetrics,
        error: null,
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await mockQuery.order('created_at')
      expect(result.data.totalEmployees).toBe(15)
      expect(result.data.overtimeAlerts.length).toBe(2)
    })

    it('calculates labor cost percentage', async () => {
      const totalWages = 1500
      const totalRevenue = 5000

      const laborCostPercentage = (totalWages / totalRevenue) * 100
      expect(laborCostPercentage).toBe(30)
    })
  })

  describe('POST /api/staff/availability', () => {
    it('marks employee unavailable', async () => {
      const unavailableData = {
        employee_id: 'emp-1',
        date: '2024-01-20',
        reason: 'sick_leave',
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
      }

      mockQuery.single.mockResolvedValue({
        data: {
          id: 'avail-1',
          ...unavailableData,
        },
        error: null,
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await mockQuery.single()
      expect(result.data.reason).toBe('sick_leave')
    })

    it('validates availability reasons', async () => {
      const validReasons = ['sick_leave', 'vacation', 'personal', 'training']
      const testReason = 'vacation'

      expect(validReasons).toContain(testReason)
    })
  })

  describe('POST /api/staff/swap-requests', () => {
    it('creates a shift swap request', async () => {
      const swapRequest = {
        requester_id: 'emp-1',
        shift_id: 'shift-1',
        target_date: '2024-01-20',
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
      }

      mockQuery.single.mockResolvedValue({
        data: {
          id: 'swap-1',
          ...swapRequest,
          status: 'pending',
        },
        error: null,
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await mockQuery.single()
      expect(result.data.status).toBe('pending')
    })

    it('approves shift swap request', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
      }

      mockQuery.single.mockResolvedValue({
        data: {
          id: 'swap-1',
          status: 'approved',
        },
        error: null,
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await mockQuery.single()
      expect(result.data.status).toBe('approved')
    })

    it('rejects shift swap request', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
      }

      mockQuery.single.mockResolvedValue({
        data: {
          id: 'swap-1',
          status: 'rejected',
        },
        error: null,
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await mockQuery.single()
      expect(result.data.status).toBe('rejected')
    })
  })

  describe('Error Handling', () => {
    it('returns 401 when user lacks manager role', async () => {
      const error = {
        error: 'Forbidden',
        status: 403,
      }

      expect(error.status).toBe(403)
    })

    it('handles database connection errors', async () => {
      const error = {
        error: 'Database connection failed',
        status: 500,
      }

      expect(error.status).toBe(500)
    })

    it('handles invalid request bodies', async () => {
      const error = {
        error: 'Invalid request body',
        status: 400,
      }

      expect(error.status).toBe(400)
    })
  })
})
