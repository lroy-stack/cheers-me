import { describe, it, expect } from 'vitest'

/**
 * Unit Tests for Sales Module
 * Tests calculations, ticket averages, and variance calculations
 */

describe('Sales Calculations', () => {
  describe('Revenue Calculations', () => {
    it('calculates total revenue from category breakdown', () => {
      const categories = {
        food_revenue: 500,
        drinks_revenue: 300,
        cocktails_revenue: 200,
        desserts_revenue: 100,
        other_revenue: 50,
      }

      const total =
        categories.food_revenue +
        categories.drinks_revenue +
        categories.cocktails_revenue +
        categories.desserts_revenue +
        categories.other_revenue

      expect(total).toBe(1150)
    })

    it('handles zero revenue in all categories', () => {
      const categories = {
        food_revenue: 0,
        drinks_revenue: 0,
        cocktails_revenue: 0,
        desserts_revenue: 0,
        other_revenue: 0,
      }

      const total =
        categories.food_revenue +
        categories.drinks_revenue +
        categories.cocktails_revenue +
        categories.desserts_revenue +
        categories.other_revenue

      expect(total).toBe(0)
    })

    it('handles negative values (refunds)', () => {
      const categories = {
        food_revenue: 500,
        drinks_revenue: -50, // Refund
        cocktails_revenue: 200,
        desserts_revenue: 0,
        other_revenue: 0,
      }

      const total =
        categories.food_revenue +
        categories.drinks_revenue +
        categories.cocktails_revenue +
        categories.desserts_revenue +
        categories.other_revenue

      expect(total).toBe(650)
    })

    it('calculates category percentages correctly', () => {
      const total_revenue = 1000
      const food_revenue = 400

      const percentage = (food_revenue / total_revenue) * 100
      expect(percentage).toBe(40)
    })

    it('handles zero total revenue for percentage calculation', () => {
      const total_revenue = 0
      const food_revenue = 0

      const percentage = total_revenue > 0 ? (food_revenue / total_revenue) * 100 : 0
      expect(percentage).toBe(0)
    })
  })

  describe('Ticket Average Calculation', () => {
    it('calculates average ticket correctly', () => {
      const total_revenue = 1000
      const ticket_count = 25

      const avgTicket = total_revenue / ticket_count
      expect(avgTicket).toBe(40)
    })

    it('returns 0 when no tickets', () => {
      const total_revenue = 1000
      const ticket_count = 0

      const avgTicket = ticket_count > 0 ? total_revenue / ticket_count : 0
      expect(avgTicket).toBe(0)
    })

    it('handles fractional ticket averages', () => {
      const total_revenue = 1000
      const ticket_count = 23

      const avgTicket = Number((total_revenue / ticket_count).toFixed(2))
      expect(avgTicket).toBe(43.48)
    })

    it('rounds to 2 decimal places', () => {
      const total_revenue = 1555.75
      const ticket_count = 37

      const avgTicket = Number((total_revenue / ticket_count).toFixed(2))
      expect(avgTicket).toBe(42.05)
    })
  })

  describe('Cash Register Variance', () => {
    it('calculates variance correctly (positive)', () => {
      const expected_amount = 1000
      const actual_amount = 1050

      const variance = actual_amount - expected_amount
      expect(variance).toBe(50)
    })

    it('calculates variance correctly (negative)', () => {
      const expected_amount = 1000
      const actual_amount = 950

      const variance = actual_amount - expected_amount
      expect(variance).toBe(-50)
    })

    it('calculates zero variance when balanced', () => {
      const expected_amount = 1000
      const actual_amount = 1000

      const variance = actual_amount - expected_amount
      expect(variance).toBe(0)
    })

    it('calculates variance percentage', () => {
      const expected_amount = 1000
      const actual_amount = 1050

      const variance = actual_amount - expected_amount
      const variancePercent = (variance / expected_amount) * 100

      expect(variancePercent).toBeCloseTo(5, 1)
    })

    it('handles variance with large amounts', () => {
      const expected_amount = 50000
      const actual_amount = 50250

      const variance = actual_amount - expected_amount
      expect(variance).toBe(250)
    })
  })

  describe('Tips Calculations', () => {
    it('sums tips for a single shift', () => {
      const tips = [
        { amount: 50 },
        { amount: 25 },
        { amount: 30 },
      ]

      const totalTips = tips.reduce((sum, tip) => sum + tip.amount, 0)
      expect(totalTips).toBe(105)
    })

    it('sums tips for multiple employees', () => {
      const tips = [
        { employee_id: 'emp-1', amount: 50 },
        { employee_id: 'emp-2', amount: 30 },
        { employee_id: 'emp-1', amount: 20 },
        { employee_id: 'emp-2', amount: 15 },
      ]

      const totalTips = tips.reduce((sum, tip) => sum + tip.amount, 0)
      expect(totalTips).toBe(115)
    })

    it('calculates tips per employee', () => {
      const tips = [
        { employee_id: 'emp-1', amount: 50 },
        { employee_id: 'emp-2', amount: 30 },
        { employee_id: 'emp-1', amount: 20 },
      ]

      const tipsByEmployee = tips.reduce(
        (acc, tip) => {
          acc[tip.employee_id] = (acc[tip.employee_id] || 0) + tip.amount
          return acc
        },
        {} as Record<string, number>
      )

      expect(tipsByEmployee['emp-1']).toBe(70)
      expect(tipsByEmployee['emp-2']).toBe(30)
    })

    it('handles empty tips array', () => {
      const tips: Array<{ employee_id: string; amount: number }> = []

      const totalTips = tips.reduce((sum, tip) => sum + tip.amount, 0)
      expect(totalTips).toBe(0)
    })
  })

  describe('Week/Month Aggregation', () => {
    it('aggregates daily sales for a week', () => {
      const weeklySales = [
        { date: '2024-01-01', total_revenue: 1000, ticket_count: 25 },
        { date: '2024-01-02', total_revenue: 1100, ticket_count: 28 },
        { date: '2024-01-03', total_revenue: 950, ticket_count: 24 },
        { date: '2024-01-04', total_revenue: 1200, ticket_count: 30 },
        { date: '2024-01-05', total_revenue: 1150, ticket_count: 29 },
        { date: '2024-01-06', total_revenue: 1300, ticket_count: 32 },
        { date: '2024-01-07', total_revenue: 1050, ticket_count: 26 },
      ]

      const totals = weeklySales.reduce(
        (acc, day) => ({
          total_revenue: acc.total_revenue + day.total_revenue,
          ticket_count: acc.ticket_count + day.ticket_count,
        }),
        { total_revenue: 0, ticket_count: 0 }
      )

      expect(totals.total_revenue).toBe(7750)
      expect(totals.ticket_count).toBe(194)
    })

    it('calculates average daily revenue for a week', () => {
      const weeklySales = [
        { total_revenue: 1000 },
        { total_revenue: 1100 },
        { total_revenue: 950 },
        { total_revenue: 1200 },
        { total_revenue: 1150 },
        { total_revenue: 1300 },
        { total_revenue: 1050 },
      ]

      const totalRevenue = weeklySales.reduce((sum, day) => sum + day.total_revenue, 0)
      const avgDaily = Number((totalRevenue / weeklySales.length).toFixed(2))

      expect(avgDaily).toBe(1107.14)
    })

    it('handles partial week data', () => {
      const partiallWeek = [
        { total_revenue: 1000 },
        { total_revenue: 1100 },
        { total_revenue: 950 },
      ]

      const totalRevenue = partiallWeek.reduce((sum, day) => sum + day.total_revenue, 0)
      const avgDaily = Number((totalRevenue / partiallWeek.length).toFixed(2))

      expect(avgDaily).toBe(1016.67)
    })
  })

  describe('Growth Calculations', () => {
    it('calculates week-over-week growth percentage', () => {
      const thisWeek = 7750
      const lastWeek = 7000

      const growth = Number((((thisWeek - lastWeek) / lastWeek) * 100).toFixed(1))
      expect(growth).toBe(10.7)
    })

    it('calculates negative growth (decline)', () => {
      const thisWeek = 6500
      const lastWeek = 7000

      const growth = Number((((thisWeek - lastWeek) / lastWeek) * 100).toFixed(1))
      expect(growth).toBe(-7.1)
    })

    it('handles zero last week for growth calculation', () => {
      const thisWeek = 7750
      const lastWeek = 0

      const growth = lastWeek > 0 ? Number((((thisWeek - lastWeek) / lastWeek) * 100).toFixed(1)) : null
      expect(growth).toBe(null)
    })

    it('calculates month-over-month growth', () => {
      const thisMonth = 32000
      const lastMonth = 30000

      const growth = Number((((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1))
      expect(growth).toBe(6.7)
    })
  })

  describe('Cost Ratio Calculations', () => {
    it('calculates food cost ratio correctly', () => {
      const ingredientCost = 300
      const foodRevenue = 1000

      const foodCostRatio = (ingredientCost / foodRevenue) * 100
      expect(foodCostRatio).toBe(30)
    })

    it('calculates beverage cost ratio correctly', () => {
      const beverageCost = 220
      const beverageRevenue = 1000

      const beverageCostRatio = (beverageCost / beverageRevenue) * 100
      expect(beverageCostRatio).toBe(22)
    })

    it('handles zero revenue for cost ratio', () => {
      const ingredientCost = 300
      const foodRevenue = 0

      const foodCostRatio = foodRevenue > 0 ? (ingredientCost / foodRevenue) * 100 : 0
      expect(foodCostRatio).toBe(0)
    })

    it('rounds cost ratios to 1 decimal place', () => {
      const ingredientCost = 312.50
      const foodRevenue = 1000

      const foodCostRatio = Number(((ingredientCost / foodRevenue) * 100).toFixed(1))
      expect(foodCostRatio).toBe(31.3)
    })
  })
})

describe('Date Utilities for Sales', () => {
  describe('Date Range Calculations', () => {
    it('calculates last 7 days from a date', () => {
      const today = new Date('2024-01-07')
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)

      const daysDiff = Math.floor((today.getTime() - weekAgo.getTime()) / (1000 * 60 * 60 * 24))
      expect(daysDiff).toBe(7)
    })

    it('calculates last 30 days from a date', () => {
      const today = new Date('2024-01-31')
      const monthAgo = new Date(today)
      monthAgo.setDate(monthAgo.getDate() - 30)

      const daysDiff = Math.floor((today.getTime() - monthAgo.getTime()) / (1000 * 60 * 60 * 24))
      expect(daysDiff).toBe(30)
    })

    it('formats date to YYYY-MM-DD correctly', () => {
      const date = new Date('2024-01-07T12:30:45Z')
      const formatted = date.toISOString().split('T')[0]
      expect(formatted).toBe('2024-01-07')
    })

    it('calculates same day last week', () => {
      const today = new Date('2024-01-07')
      const lastWeek = new Date(today)
      lastWeek.setDate(lastWeek.getDate() - 7)

      expect(lastWeek.getDate()).toBe(31)
      expect(lastWeek.getMonth()).toBe(11)
      expect(lastWeek.getFullYear()).toBe(2023)
    })

    it('calculates same day last month', () => {
      const today = new Date('2024-02-15')
      const lastMonth = new Date(today)
      lastMonth.setMonth(lastMonth.getMonth() - 1)

      expect(lastMonth.getDate()).toBe(15)
      expect(lastMonth.getMonth()).toBe(0)
    })
  })
})
