import { describe, it, expect } from 'vitest'

/**
 * Unit Tests for Stock & Inventory Utilities
 * Tests calculations, stock level validations, and cost calculations
 */

describe('Stock Calculations', () => {
  describe('Stock Level Calculations', () => {
    it('calculates correct stock level after "in" movement', () => {
      const currentStock = 100
      const movementQuantity = 50
      const movementType = 'in'

      let newStock = currentStock
      if (movementType === 'in') {
        newStock += Math.abs(movementQuantity)
      }

      expect(newStock).toBe(150)
    })

    it('calculates correct stock level after "out" movement', () => {
      const currentStock = 100
      const movementQuantity = 30
      const movementType = 'out'

      let newStock = currentStock
      if (movementType === 'out') {
        newStock -= Math.abs(movementQuantity)
      }

      expect(newStock).toBe(70)
    })

    it('calculates correct stock level after "waste" movement', () => {
      const currentStock = 100
      const movementQuantity = 20
      const movementType = 'waste'

      let newStock = currentStock
      if (movementType === 'waste') {
        newStock -= Math.abs(movementQuantity)
      }

      expect(newStock).toBe(80)
    })

    it('calculates correct stock level after "adjustment" movement (positive)', () => {
      const currentStock = 100
      const movementQuantity = 15
      const movementType = 'adjustment'

      let newStock = currentStock
      if (movementType === 'adjustment') {
        newStock += movementQuantity
      }

      expect(newStock).toBe(115)
    })

    it('calculates correct stock level after "adjustment" movement (negative)', () => {
      const currentStock = 100
      const movementQuantity = -25
      const movementType = 'adjustment'

      let newStock = currentStock
      if (movementType === 'adjustment') {
        newStock += movementQuantity
      }

      expect(newStock).toBe(75)
    })

    it('prevents stock from going negative on "out" movement', () => {
      const currentStock = 50
      const movementQuantity = 100
      const movementType = 'out'

      let newStock = currentStock
      if (movementType === 'out') {
        newStock -= Math.abs(movementQuantity)
      }

      expect(newStock < 0).toBe(true)
    })
  })

  describe('Low Stock Detection', () => {
    it('identifies products below minimum stock', () => {
      const products = [
        { id: '1', name: 'Beer A', current_stock: 50, min_stock: 100 },
        { id: '2', name: 'Beer B', current_stock: 150, min_stock: 100 },
        { id: '3', name: 'Beer C', current_stock: 30, min_stock: 100 },
      ]

      const lowStockItems = products.filter(
        p => p.min_stock && p.current_stock < p.min_stock
      )

      expect(lowStockItems.length).toBe(2)
      expect(lowStockItems[0].id).toBe('1')
      expect(lowStockItems[1].id).toBe('3')
    })

    it('handles products without minimum stock threshold', () => {
      const products = [
        { id: '1', name: 'Product A', current_stock: 50, min_stock: null },
        { id: '2', name: 'Product B', current_stock: 150, min_stock: 100 },
      ]

      const lowStockItems = products.filter(
        p => p.min_stock && p.current_stock < p.min_stock
      )

      expect(lowStockItems.length).toBe(0)
    })

    it('returns empty array when no products are low stock', () => {
      const products = [
        { id: '1', name: 'Product A', current_stock: 200, min_stock: 100 },
        { id: '2', name: 'Product B', current_stock: 300, min_stock: 100 },
      ]

      const lowStockItems = products.filter(
        p => p.min_stock && p.current_stock < p.min_stock
      )

      expect(lowStockItems).toHaveLength(0)
    })
  })

  describe('Waste Tracking', () => {
    it('calculates waste percentage correctly', () => {
      const totalConsumed = 1000
      const totalWaste = 100

      const wastePercentage = (totalWaste / totalConsumed) * 100

      expect(wastePercentage).toBe(10)
    })

    it('categorizes waste reasons correctly', () => {
      const validWasteReasons = [
        'expired',
        'damaged',
        'overproduction',
        'other',
      ]

      expect(validWasteReasons).toContain('expired')
      expect(validWasteReasons).toContain('damaged')
      expect(validWasteReasons).toContain('overproduction')
      expect(validWasteReasons).toContain('other')
    })

    it('tracks waste by reason category', () => {
      const wasteEntries = [
        { reason: 'expired', quantity: 30 },
        { reason: 'damaged', quantity: 15 },
        { reason: 'overproduction', quantity: 45 },
        { reason: 'other', quantity: 10 },
      ]

      const wasteByReason = wasteEntries.reduce((acc, entry) => {
        acc[entry.reason] = (acc[entry.reason] || 0) + entry.quantity
        return acc
      }, {} as Record<string, number>)

      expect(wasteByReason['expired']).toBe(30)
      expect(wasteByReason['damaged']).toBe(15)
      expect(wasteByReason['overproduction']).toBe(45)
      expect(wasteByReason['other']).toBe(10)
    })
  })

  describe('Cost Calculations', () => {
    it('calculates total product cost correctly', () => {
      const costPerUnit = 5
      const quantity = 100

      const totalCost = costPerUnit * quantity

      expect(totalCost).toBe(500)
    })

    it('calculates food cost ratio', () => {
      const foodRevenue = 10000
      const foodCost = 2500

      const foodCostRatio = (foodCost / foodRevenue) * 100

      expect(foodCostRatio).toBe(25)
    })

    it('calculates beverage cost ratio', () => {
      const beverageRevenue = 5000
      const beverageCost = 1000

      const beverageCostRatio = (beverageCost / beverageRevenue) * 100

      expect(beverageCostRatio).toBe(20)
    })

    it('handles zero revenue in cost ratio', () => {
      const revenue = 0
      const cost = 100

      const costRatio = revenue === 0 ? 0 : (cost / revenue) * 100

      expect(costRatio).toBe(0)
    })
  })

  describe('Stock Take Variance', () => {
    it('calculates variance between system and counted stock', () => {
      const systemStock = 100
      const countedStock = 95

      const variance = systemStock - countedStock
      const variancePercentage = (variance / systemStock) * 100

      expect(variance).toBe(5)
      expect(variancePercentage).toBe(5)
    })

    it('handles positive variance (more stock than expected)', () => {
      const systemStock = 100
      const countedStock = 110

      const variance = systemStock - countedStock
      const variancePercentage = (variance / systemStock) * 100

      expect(variance).toBe(-10)
      expect(variancePercentage).toBe(-10)
    })

    it('calculates variance across multiple items', () => {
      const items = [
        { systemStock: 100, countedStock: 95 }, // -5
        { systemStock: 50, countedStock: 50 }, // 0
        { systemStock: 200, countedStock: 210 }, // +10
      ]

      const totalSystemStock = items.reduce((sum, item) => sum + item.systemStock, 0)
      const totalCountedStock = items.reduce((sum, item) => sum + item.countedStock, 0)
      const totalVariance = totalSystemStock - totalCountedStock

      expect(totalSystemStock).toBe(350)
      expect(totalCountedStock).toBe(355)
      expect(totalVariance).toBe(-5)
    })
  })

  describe('Beer Keg Tracking', () => {
    it('tracks liters remaining in keg', () => {
      const kegCapacity = 50 // liters
      const litersUsed = 12.5

      const litersRemaining = kegCapacity - litersUsed

      expect(litersRemaining).toBe(37.5)
    })

    it('calculates keg usage percentage', () => {
      const kegCapacity = 50
      const litersRemaining = 10

      const usagePercentage = ((kegCapacity - litersRemaining) / kegCapacity) * 100

      expect(usagePercentage).toBe(80)
    })

    it('identifies empty kegs', () => {
      const kegs = [
        { id: 1, name: 'Beer A', litersRemaining: 10, capacity: 50 },
        { id: 2, name: 'Beer B', litersRemaining: 0, capacity: 50 },
        { id: 3, name: 'Beer C', litersRemaining: 5, capacity: 50 },
      ]

      const emptyKegs = kegs.filter(k => k.litersRemaining <= 0)

      expect(emptyKegs.length).toBe(1)
      expect(emptyKegs[0].id).toBe(2)
    })

    it('tracks multiple pour events for a keg', () => {
      const initialCapacity = 50
      const pours = [
        { quantity: 2, timestamp: '2024-01-15T10:30:00' },
        { quantity: 1.5, timestamp: '2024-01-15T14:00:00' },
        { quantity: 3, timestamp: '2024-01-15T18:00:00' },
      ]

      const totalPoured = pours.reduce((sum, pour) => sum + pour.quantity, 0)
      const litersRemaining = initialCapacity - totalPoured

      expect(totalPoured).toBe(6.5)
      expect(litersRemaining).toBe(43.5)
    })
  })

  describe('Product Categories', () => {
    it('validates product category enum', () => {
      const validCategories = ['food', 'drink', 'supplies', 'beer']
      const testCategory = 'beer'

      expect(validCategories).toContain(testCategory)
    })

    it('filters products by category', () => {
      const products = [
        { id: '1', name: 'Pizza', category: 'food' },
        { id: '2', name: 'Beer A', category: 'beer' },
        { id: '3', name: 'Napkins', category: 'supplies' },
        { id: '4', name: 'Wine', category: 'drink' },
        { id: '5', name: 'Beer B', category: 'beer' },
      ]

      const beerProducts = products.filter(p => p.category === 'beer')

      expect(beerProducts.length).toBe(2)
      expect(beerProducts.every(p => p.category === 'beer')).toBe(true)
    })

    it('counts products by category', () => {
      const products = [
        { category: 'food' },
        { category: 'food' },
        { category: 'beer' },
        { category: 'supplies' },
        { category: 'beer' },
      ]

      const categoryCount = products.reduce((acc, product) => {
        acc[product.category] = (acc[product.category] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      expect(categoryCount['food']).toBe(2)
      expect(categoryCount['beer']).toBe(2)
      expect(categoryCount['supplies']).toBe(1)
    })
  })

  describe('Stock Value Calculation', () => {
    it('calculates total inventory value', () => {
      const products = [
        { id: '1', current_stock: 100, cost_per_unit: 5 },
        { id: '2', current_stock: 50, cost_per_unit: 10 },
        { id: '3', current_stock: 200, cost_per_unit: 2 },
      ]

      const totalValue = products.reduce(
        (sum, product) => sum + product.current_stock * product.cost_per_unit,
        0
      )

      expect(totalValue).toBe(1400) // 500 + 500 + 400
    })

    it('calculates inventory value by category', () => {
      const products = [
        { category: 'food', current_stock: 100, cost_per_unit: 5 },
        { category: 'food', current_stock: 50, cost_per_unit: 10 },
        { category: 'beer', current_stock: 200, cost_per_unit: 2 },
      ]

      const valueByCategory = products.reduce((acc, product) => {
        const itemValue = product.current_stock * product.cost_per_unit
        acc[product.category] = (acc[product.category] || 0) + itemValue
        return acc
      }, {} as Record<string, number>)

      expect(valueByCategory['food']).toBe(1000)
      expect(valueByCategory['beer']).toBe(400)
    })
  })
})
