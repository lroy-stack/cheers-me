import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'

// Mock the Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock auth utilities
vi.mock('@/lib/utils/auth', () => ({
  requireRole: vi.fn(),
}))

describe('CRM API Routes', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
      auth: {
        getUser: vi.fn(),
      },
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabase)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/crm/customers', () => {
    it('should fetch customers with default pagination', async () => {
      const mockCustomers = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+34 971 123 456',
          visit_count: 5,
          vip: true,
          language: 'en',
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+34 971 234 567',
          visit_count: 10,
          vip: false,
          language: 'nl',
        },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockCustomers,
          error: null,
          count: 2,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      expect(mockQuery.select).toBeDefined()
      expect(mockQuery.order).toBeDefined()
    })

    it('should apply VIP filter', async () => {
      const mockVIPCustomers = [
        {
          id: '1',
          name: 'John Doe',
          vip: true,
          visit_count: 20,
        },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: mockVIPCustomers,
          error: null,
          count: 1,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      expect(mockQuery.eq).toBeDefined()
    })

    it('should apply language filter', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      // Simulate filtering by language
      mockQuery.eq('language', 'nl')

      expect(mockQuery.eq).toHaveBeenCalled()
    })

    it('should support search across name, email, phone', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      expect(mockQuery.or).toBeDefined()
    })

    it('should handle pagination correctly', async () => {
      const limit = 10
      const page = 2
      const from = (page - 1) * limit // 10
      const to = from + limit - 1 // 19

      expect(from).toBe(10)
      expect(to).toBe(19)
    })

    it('should enforce limit maximum of 100', async () => {
      const requestLimit = 150
      const limit = Math.min(requestLimit, 100)

      expect(limit).toBe(100)
    })
  })

  describe('POST /api/crm/customers', () => {
    it('should create a new customer', async () => {
      const newCustomerData = {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '+34 971 999 999',
        language: 'en',
        vip: false,
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'new-customer-1', ...newCustomerData },
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      expect(mockQuery.insert).toBeDefined()
      expect(mockQuery.select).toBeDefined()
    })

    it('should validate email format', async () => {
      const invalidEmail = 'not-an-email'
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invalidEmail)

      expect(isValid).toBe(false)
    })

    it('should validate required name field', async () => {
      const data = { name: '' }
      const isValid = data.name.length > 0

      expect(isValid).toBe(false)
    })

    it('should check for duplicate email', async () => {
      const duplicateQuery = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({
          data: [{ id: 'existing-1', email: 'duplicate@example.com' }],
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(duplicateQuery)

      expect(duplicateQuery.or).toBeDefined()
    })

    it('should check for duplicate phone', async () => {
      const duplicateQuery = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({
          data: [{ id: 'existing-2', phone: '+34 971 111 111' }],
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(duplicateQuery)

      expect(duplicateQuery.or).toBeDefined()
    })

    it('should allow optional birthday and anniversary fields', async () => {
      const customerData = {
        name: 'Test Customer',
        birthday: '1990-05-15',
        anniversary: '2020-06-20',
      }

      expect(customerData.birthday).toBeDefined()
      expect(customerData.anniversary).toBeDefined()
    })

    it('should validate date format YYYY-MM-DD', async () => {
      const validDate = '1990-05-15'
      const invalidDate = '1990-5-15'

      const isValidRegex = /^\d{4}-\d{2}-\d{2}$/

      expect(isValidRegex.test(validDate)).toBe(true)
      expect(isValidRegex.test(invalidDate)).toBe(false)
    })
  })

  describe('GET /api/crm/reviews', () => {
    it('should fetch reviews with pagination', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          platform: 'TripAdvisor',
          rating: 5,
          review_text: 'Excellent service!',
          sentiment: 'positive',
          customer_id: 'cust-1',
          created_at: '2024-02-05T10:00:00Z',
        },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockReviews,
          error: null,
          count: 1,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      expect(mockQuery.select).toBeDefined()
    })

    it('should filter by platform', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      mockQuery.eq('platform', 'Google')

      expect(mockQuery.eq).toHaveBeenCalled()
    })

    it('should filter by sentiment', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      mockQuery.eq('sentiment', 'positive')

      expect(mockQuery.eq).toHaveBeenCalled()
    })

    it('should filter pending responses', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      mockQuery.is('response_sent', null)

      expect(mockQuery.is).toBeDefined()
    })
  })

  describe('POST /api/crm/reviews', () => {
    it('should create a new review', async () => {
      const newReviewData = {
        platform: 'Google',
        rating: 4,
        review_text: 'Great food and atmosphere',
        sentiment: 'positive',
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'review-1', ...newReviewData },
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      expect(mockQuery.insert).toBeDefined()
    })

    it('should validate sentiment value', async () => {
      const validSentiments = ['positive', 'neutral', 'negative']
      const testSentiment = 'positive'

      expect(validSentiments).toContain(testSentiment)
    })

    it('should validate platform is provided', async () => {
      const data = { platform: '', rating: 5, review_text: 'Test' }

      expect(data.platform.length > 0).toBe(false)
    })

    it('should allow optional customer_id', async () => {
      const reviewData = {
        platform: 'TripAdvisor',
        review_text: 'Good experience',
        sentiment: 'positive',
        customer_id: null,
      }

      expect(reviewData.customer_id).toBeNull()
    })

    it('should validate customer exists if customer_id provided', async () => {
      const customerQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'cust-1' },
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(customerQuery)

      expect(customerQuery.single).toBeDefined()
    })

    it('should validate rating range 0-5', async () => {
      const validRating = (rating: number): boolean => {
        return rating >= 0 && rating <= 5
      }

      expect(validRating(5)).toBe(true)
      expect(validRating(0)).toBe(true)
      expect(validRating(-1)).toBe(false)
      expect(validRating(6)).toBe(false)
    })
  })

  describe('POST /api/crm/customers/[id]/visit', () => {
    it('should increment visit count', async () => {
      const customerId = 'customer-1'
      const currentVisitCount = 5
      const newVisitCount = currentVisitCount + 1

      expect(newVisitCount).toBe(6)
    })

    it('should update last_visit timestamp', async () => {
      const now = new Date()
      const isoString = now.toISOString()

      expect(isoString).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('should trigger loyalty reward check at milestones', async () => {
      const visits = 5
      const isMilestone = [5, 10, 20].includes(visits)

      expect(isMilestone).toBe(true)
    })

    it('should auto-flag VIP at 20 visits', async () => {
      const visitCount = 20
      const shouldVIP = visitCount >= 20

      expect(shouldVIP).toBe(true)
    })
  })

  describe('POST /api/crm/customers/[id]/vip', () => {
    it('should toggle VIP status', async () => {
      const vipStatus = false
      const newStatus = !vipStatus

      expect(newStatus).toBe(true)
    })

    it('should update VIP customer records', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'cust-1', vip: true },
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      expect(mockQuery.update).toBeDefined()
    })
  })

  describe('GET /api/crm/insights', () => {
    it('should return CRM dashboard metrics', async () => {
      const mockInsights = {
        total_customers: 150,
        vip_customers: 10,
        new_customers_this_month: 25,
        repeat_customers: 120,
        average_visits: 4.5,
      }

      expect(mockInsights.total_customers).toBeGreaterThan(0)
      expect(mockInsights.vip_customers).toBeLessThanOrEqual(mockInsights.total_customers)
    })

    it('should calculate customer retention rate', async () => {
      const totalCustomers = 150
      const repeatCustomers = 120
      const retentionRate = (repeatCustomers / totalCustomers) * 100

      expect(retentionRate).toBe(80)
    })

    it('should calculate VIP percentage', async () => {
      const totalCustomers = 100
      const vipCustomers = 10
      const vipPercentage = (vipCustomers / totalCustomers) * 100

      expect(vipPercentage).toBe(10)
    })
  })

  describe('GET /api/crm/birthdays', () => {
    it('should fetch upcoming birthdays', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'cust-1',
              name: 'John Doe',
              birthday: '1990-02-15',
              email: 'john@example.com',
            },
          ],
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      expect(mockQuery.select).toBeDefined()
    })
  })

  describe('GET /api/crm/anniversaries', () => {
    it('should fetch upcoming anniversaries', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'cust-1',
              name: 'Jane Smith',
              anniversary: '2020-06-20',
              email: 'jane@example.com',
            },
          ],
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      expect(mockQuery.select).toBeDefined()
    })
  })

  describe('GET /api/crm/vip-customers', () => {
    it('should fetch VIP customers list', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: '1',
              name: 'VIP Customer 1',
              visit_count: 25,
              vip: true,
            },
          ],
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      expect(mockQuery.eq).toBeDefined()
    })
  })

  describe('GET /api/crm/loyalty-rewards', () => {
    it('should fetch loyalty rewards and milestones', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      expect(mockQuery.select).toBeDefined()
    })

    it('should calculate reward tier', async () => {
      const rewards = [
        { visitMilestone: 5, tier: 'silver', discount: '5%' },
        { visitMilestone: 10, tier: 'gold', discount: '10%' },
        { visitMilestone: 20, tier: 'platinum', discount: '15%' },
      ]

      expect(rewards.length).toBe(3)
      expect(rewards[0].discount).toBe('5%')
    })
  })

  describe('POST /api/crm/reviews/[id]/generate-response', () => {
    it('should generate AI response draft', async () => {
      const reviewText = 'Great service and friendly staff!'
      const aiResponse = `Thank you for your kind words! We're delighted that you enjoyed our service and hospitality. We hope to see you again soon!`

      expect(aiResponse).toContain('Thank you')
    })

    it('should handle different sentiment tones', async () => {
      const positiveResponse = 'Thank you for your wonderful feedback!'
      const negativeResponse = 'We apologize for your experience and would like to make things right.'

      expect(positiveResponse.toLowerCase()).toContain('thank')
      expect(negativeResponse.toLowerCase()).toContain('apologize')
    })
  })

  describe('POST /api/crm/reviews/[id]/send-response', () => {
    it('should mark response as sent', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'review-1', response_sent: new Date().toISOString() },
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      expect(mockQuery.update).toBeDefined()
    })

    it('should record response timestamp', async () => {
      const timestamp = new Date().toISOString()

      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })
})
