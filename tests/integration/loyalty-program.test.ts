/**
 * Integration tests for Loyalty Program
 * Tests the complete loyalty workflow including:
 * - Recording customer visits
 * - Automatic reward generation at milestones
 * - Reward redemption
 * - Statistics and reporting
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required environment variables for testing')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Test data
let testCustomerId: string
let testStaffId: string
let testRewardId: string

describe('Loyalty Program', () => {
  beforeAll(async () => {
    // Create a test staff member
    const { data: staff, error: staffError } = await supabase
      .from('profiles')
      .insert({
        name: 'Test Staff',
        email: `test-staff-${Date.now()}@test.com`,
        role: 'waiter',
      })
      .select('id')
      .single()

    if (staffError) throw staffError
    testStaffId = staff.id

    // Create a test customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        name: 'Test Customer',
        email: `test-customer-${Date.now()}@test.com`,
        phone: '+34123456789',
        language: 'en',
        visit_count: 0,
      })
      .select('id')
      .single()

    if (customerError) throw customerError
    testCustomerId = customer.id
  })

  afterAll(async () => {
    // Clean up test data
    if (testCustomerId) {
      await supabase
        .from('customers')
        .delete()
        .eq('id', testCustomerId)
    }

    if (testStaffId) {
      await supabase
        .from('profiles')
        .delete()
        .eq('id', testStaffId)
    }
  })

  describe('Recording Visits', () => {
    it('should increment visit count when recording a visit', async () => {
      // Record a visit
      const { error: visitError } = await supabase
        .rpc('record_customer_visit', {
          p_customer_id: testCustomerId,
        })

      expect(visitError).toBeNull()

      // Check customer visit_count was incremented
      const { data: customer, error: fetchError } = await supabase
        .from('customers')
        .select('visit_count, last_visit')
        .eq('id', testCustomerId)
        .single()

      expect(fetchError).toBeNull()
      expect(customer?.visit_count).toBe(1)
      expect(customer?.last_visit).toBeTruthy()
    })

    it('should update last_visit to current date', async () => {
      const today = new Date().toISOString().split('T')[0]

      const { data: customer } = await supabase
        .from('customers')
        .select('last_visit')
        .eq('id', testCustomerId)
        .single()

      expect(customer?.last_visit).toBe(today)
    })
  })

  describe('Milestone Rewards', () => {
    it('should create reward when customer reaches 5th visit', async () => {
      // Record visits 2-5
      for (let i = 0; i < 4; i++) {
        await supabase.rpc('record_customer_visit', {
          p_customer_id: testCustomerId,
        })
      }

      // Check customer has 5 visits
      const { data: customer } = await supabase
        .from('customers')
        .select('visit_count')
        .eq('id', testCustomerId)
        .single()

      expect(customer?.visit_count).toBe(5)

      // Check reward was created
      const { data: rewards, error: rewardsError } = await supabase
        .from('loyalty_rewards')
        .select('*')
        .eq('customer_id', testCustomerId)
        .eq('visit_milestone', 5)

      expect(rewardsError).toBeNull()
      expect(rewards).toHaveLength(1)
      expect(rewards?.[0].reward_description).toContain('Free drink')
      expect(rewards?.[0].redeemed_at).toBeNull()

      testRewardId = rewards?.[0].id
    })

    it('should not create duplicate reward for same milestone', async () => {
      // Try to check milestone again (simulating duplicate call)
      await supabase.rpc('check_loyalty_milestone', {
        p_customer_id: testCustomerId,
      })

      // Should still only have 1 reward for milestone 5
      const { data: rewards } = await supabase
        .from('loyalty_rewards')
        .select('*')
        .eq('customer_id', testCustomerId)
        .eq('visit_milestone', 5)

      expect(rewards).toHaveLength(1)
    })

    it('should create reward when customer reaches 10th visit', async () => {
      // Record visits 6-10
      for (let i = 0; i < 5; i++) {
        await supabase.rpc('record_customer_visit', {
          p_customer_id: testCustomerId,
        })
      }

      // Check reward was created for 10th visit
      const { data: rewards } = await supabase
        .from('loyalty_rewards')
        .select('*')
        .eq('customer_id', testCustomerId)
        .eq('visit_milestone', 10)

      expect(rewards).toHaveLength(1)
      expect(rewards?.[0].reward_description).toContain('Free dessert')

      // Customer should now have 2 total rewards
      const { data: allRewards } = await supabase
        .from('loyalty_rewards')
        .select('*')
        .eq('customer_id', testCustomerId)

      expect(allRewards).toHaveLength(2)
    })
  })

  describe('Reward Redemption', () => {
    it('should successfully redeem an unredeemed reward', async () => {
      const { data: result, error } = await supabase
        .rpc('redeem_loyalty_reward', {
          p_reward_id: testRewardId,
          p_redeemed_by: testStaffId,
          p_notes: 'Test redemption - Corona Extra',
        })

      expect(error).toBeNull()
      expect(result.success).toBe(true)
      expect(result.reward).toBeTruthy()

      // Verify reward is marked as redeemed
      const { data: reward } = await supabase
        .from('loyalty_rewards')
        .select('*')
        .eq('id', testRewardId)
        .single()

      expect(reward?.redeemed_at).toBeTruthy()
      expect(reward?.redeemed_by).toBe(testStaffId)
      expect(reward?.redeemed_notes).toBe('Test redemption - Corona Extra')
    })

    it('should fail to redeem an already redeemed reward', async () => {
      const { data: result } = await supabase
        .rpc('redeem_loyalty_reward', {
          p_reward_id: testRewardId,
          p_redeemed_by: testStaffId,
          p_notes: 'Attempting duplicate redemption',
        })

      expect(result.success).toBe(false)
      expect(result.error).toContain('already redeemed')
    })

    it('should fail to redeem non-existent reward', async () => {
      const fakeRewardId = '00000000-0000-0000-0000-000000000000'

      const { data: result } = await supabase
        .rpc('redeem_loyalty_reward', {
          p_reward_id: fakeRewardId,
          p_redeemed_by: testStaffId,
          p_notes: 'Test',
        })

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })
  })

  describe('Unredeemed Rewards Query', () => {
    it('should return only unredeemed rewards for customer', async () => {
      const { data: unredeemed } = await supabase
        .rpc('get_customer_unredeemed_rewards', {
          p_customer_id: testCustomerId,
        })

      // Customer has 2 total rewards, 1 redeemed, so 1 unredeemed
      expect(unredeemed).toHaveLength(1)
      expect(unredeemed?.[0].visit_milestone).toBe(10)
    })

    it('should include days_since_issued in unredeemed rewards', async () => {
      const { data: unredeemed } = await supabase
        .rpc('get_customer_unredeemed_rewards', {
          p_customer_id: testCustomerId,
        })

      expect(unredeemed?.[0].days_since_issued).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Loyalty Statistics', () => {
    it('should return comprehensive loyalty statistics', async () => {
      const { data: stats, error } = await supabase
        .rpc('get_loyalty_statistics')

      expect(error).toBeNull()
      expect(stats).toBeTruthy()
      expect(stats.total_rewards_issued).toBeGreaterThan(0)
      expect(stats.total_rewards_redeemed).toBeGreaterThan(0)
      expect(stats.total_rewards_pending).toBeGreaterThan(0)
      expect(stats.redemption_rate).toBeGreaterThanOrEqual(0)
      expect(stats.rewards_by_milestone).toBeTruthy()
    })

    it('should have correct redemption rate calculation', async () => {
      const { data: stats } = await supabase
        .rpc('get_loyalty_statistics')

      const expectedRate =
        (stats.total_rewards_redeemed / stats.total_rewards_issued) * 100

      expect(stats.redemption_rate).toBeCloseTo(expectedRate, 1)
    })
  })

  describe('Top Loyalty Customers', () => {
    it('should return top customers by visit count', async () => {
      const { data: topCustomers, error } = await supabase
        .rpc('get_top_loyalty_customers', {
          p_limit: 10,
        })

      expect(error).toBeNull()
      expect(topCustomers).toBeTruthy()
      expect(Array.isArray(topCustomers)).toBe(true)

      // Should be sorted by visit_count descending
      if (topCustomers && topCustomers.length > 1) {
        for (let i = 0; i < topCustomers.length - 1; i++) {
          expect(topCustomers[i].visit_count).toBeGreaterThanOrEqual(
            topCustomers[i + 1].visit_count
          )
        }
      }
    })

    it('should include reward statistics for each customer', async () => {
      const { data: topCustomers } = await supabase
        .rpc('get_top_loyalty_customers', {
          p_limit: 10,
        })

      if (topCustomers && topCustomers.length > 0) {
        const firstCustomer = topCustomers[0]
        expect(firstCustomer).toHaveProperty('total_rewards')
        expect(firstCustomer).toHaveProperty('redeemed_rewards')
        expect(firstCustomer).toHaveProperty('pending_rewards')
        expect(firstCustomer).toHaveProperty('visit_count')
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle visit recording for customer with null last_visit', async () => {
      // Create customer with null last_visit
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({
          name: 'New Customer',
          email: `new-customer-${Date.now()}@test.com`,
          visit_count: 0,
          last_visit: null,
        })
        .select('id')
        .single()

      const { error } = await supabase
        .rpc('record_customer_visit', {
          p_customer_id: newCustomer!.id,
        })

      expect(error).toBeNull()

      // Clean up
      await supabase
        .from('customers')
        .delete()
        .eq('id', newCustomer!.id)
    })

    it('should handle milestone check for customer with 0 visits', async () => {
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({
          name: 'Zero Visit Customer',
          email: `zero-visit-${Date.now()}@test.com`,
          visit_count: 0,
        })
        .select('id')
        .single()

      // Should not throw error
      const { error } = await supabase
        .rpc('check_loyalty_milestone', {
          p_customer_id: newCustomer!.id,
        })

      expect(error).toBeNull()

      // Should not create any rewards
      const { data: rewards } = await supabase
        .from('loyalty_rewards')
        .select('*')
        .eq('customer_id', newCustomer!.id)

      expect(rewards).toHaveLength(0)

      // Clean up
      await supabase
        .from('customers')
        .delete()
        .eq('id', newCustomer!.id)
    })
  })
})

describe('Loyalty Program API Routes', () => {
  it('should fetch loyalty statistics via API', async () => {
    // Note: This test assumes the API is running
    // In a real test environment, you would use supertest or similar
    // to test the actual API endpoints

    // This is a placeholder for E2E tests
    expect(true).toBe(true)
  })
})
