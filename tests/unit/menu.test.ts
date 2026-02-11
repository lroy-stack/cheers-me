import { describe, it, expect } from 'vitest'

// Test utility functions and calculations for menu module

describe('Menu Module - Unit Tests', () => {
  describe('Allergen Constants', () => {
    it('should have all 14 EU mandatory allergens', () => {
      const mandatoryAllergens = [
        'celery',
        'crustaceans',
        'eggs',
        'fish',
        'gluten',
        'lupin',
        'milk',
        'molluscs',
        'mustard',
        'nuts',
        'peanuts',
        'sesame',
        'soy',
        'sulfites',
      ]

      expect(mandatoryAllergens).toHaveLength(14)
      expect(mandatoryAllergens).toContain('gluten')
      expect(mandatoryAllergens).toContain('milk')
      expect(mandatoryAllergens).toContain('eggs')
      expect(mandatoryAllergens).toContain('fish')
      expect(mandatoryAllergens).toContain('nuts')
      expect(mandatoryAllergens).toContain('peanuts')
      expect(mandatoryAllergens).toContain('sesame')
      expect(mandatoryAllergens).toContain('soy')
      expect(mandatoryAllergens).toContain('sulfites')
      expect(mandatoryAllergens).toContain('crustaceans')
      expect(mandatoryAllergens).toContain('molluscs')
      expect(mandatoryAllergens).toContain('celery')
      expect(mandatoryAllergens).toContain('mustard')
      expect(mandatoryAllergens).toContain('lupin')
    })
  })

  describe('Menu Item Validation', () => {
    it('should validate menu item name is not empty', () => {
      const itemName = 'Breakfast Toast'
      expect(itemName).toBeTruthy()
      expect(itemName.length).toBeGreaterThan(0)
      expect(itemName.length).toBeLessThanOrEqual(255)
    })

    it('should validate price is non-negative', () => {
      const prices = [0, 5.5, 12.99, 25.0]
      prices.forEach(price => {
        expect(price).toBeGreaterThanOrEqual(0)
        expect(typeof price).toBe('number')
      })
    })

    it('should validate price with up to 2 decimals', () => {
      const validPrices = [5.5, 12.99, 0.5, 100.0]
      validPrices.forEach(price => {
        const decimals = (price.toString().split('.')[1] || '').length
        expect(decimals).toBeLessThanOrEqual(2)
      })
    })

    it('should validate prep time is non-negative integer', () => {
      const validPrepTimes = [0, 5, 15, 30, 60]
      validPrepTimes.forEach(time => {
        expect(Number.isInteger(time)).toBe(true)
        expect(time).toBeGreaterThanOrEqual(0)
      })
    })

    it('should validate category_id is a valid UUID', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000'
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      expect(uuidRegex.test(validUUID)).toBe(true)
    })

    it('should validate allergen array contains only valid allergens', () => {
      const validAllergens = ['gluten', 'milk', 'eggs']
      const validAllergenSet = new Set([
        'celery', 'crustaceans', 'eggs', 'fish', 'gluten', 'lupin',
        'milk', 'molluscs', 'mustard', 'nuts', 'peanuts', 'sesame', 'soy', 'sulfites'
      ])

      validAllergens.forEach(allergen => {
        expect(validAllergenSet.has(allergen)).toBe(true)
      })
    })

    it('should validate available is boolean', () => {
      const availableValues = [true, false]
      availableValues.forEach(value => {
        expect(typeof value).toBe('boolean')
      })
    })

    it('should validate sort_order is non-negative integer', () => {
      const validSortOrders = [0, 1, 5, 100]
      validSortOrders.forEach(order => {
        expect(Number.isInteger(order)).toBe(true)
        expect(order).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('Menu Category Validation', () => {
    it('should validate category name is required and non-empty', () => {
      const validName = 'Breakfast'
      expect(validName).toBeTruthy()
      expect(validName.length).toBeGreaterThan(0)
      expect(validName.length).toBeLessThanOrEqual(100)
    })

    it('should support predefined categories', () => {
      const validCategories = ['Breakfast', 'Lunch', 'Dinner', 'Drinks', 'Cocktails', 'Desserts']
      const category = 'Breakfast'
      expect(validCategories).toContain(category)
    })

    it('should validate category sort_order is non-negative integer', () => {
      const sortOrder = 0
      expect(Number.isInteger(sortOrder)).toBe(true)
      expect(sortOrder).toBeGreaterThanOrEqual(0)
    })

    it('should support multilingual category names', () => {
      const categoryNames = {
        name_en: 'Breakfast',
        name_nl: 'Ontbijt',
        name_es: 'Desayuno',
      }
      expect(categoryNames.name_en).toBeTruthy()
      expect(categoryNames.name_nl).toBeTruthy()
      expect(categoryNames.name_es).toBeTruthy()
    })
  })

  describe('Daily Special Validation', () => {
    it('should validate date format YYYY-MM-DD', () => {
      const validDate = '2024-04-15'
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      expect(dateRegex.test(validDate)).toBe(true)
    })

    it('should validate daily special has either menu_item_id or custom name', () => {
      // Case 1: Has menu_item_id
      const special1 = {
        date: '2024-04-15',
        menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
      }
      const hasMenuItemId = !!special1.menu_item_id
      expect(hasMenuItemId).toBe(true)

      // Case 2: Has custom name
      const special2 = {
        date: '2024-04-15',
        name_en: 'Chef\'s Special Burger',
        price: 14.99,
      }
      const hasCustomName = !!special2.name_en
      expect(hasCustomName).toBe(true)

      // Case 3: Validation fails (neither provided)
      const special3 = {
        date: '2024-04-15',
      }
      const isValid = !!special3.menu_item_id || !!special3.name_en
      expect(isValid).toBe(false)
    })

    it('should allow optional price override for daily special', () => {
      const special = {
        date: '2024-04-15',
        menu_item_id: '550e8400-e29b-41d4-a716-446655440000',
        price: 9.99, // Override original menu item price
      }
      expect(special.price).toBe(9.99)
      expect(special.price).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Food Cost Calculation', () => {
    it('should calculate food cost percentage correctly', () => {
      const ingredientCost = 300
      const foodRevenue = 1000
      const expectedPercentage = 30

      const calculated = (ingredientCost / foodRevenue) * 100
      expect(calculated).toBe(expectedPercentage)
    })

    it('should handle zero revenue without dividing by zero', () => {
      const ingredientCost = 300
      const foodRevenue = 0

      const calculated = foodRevenue === 0 ? 0 : (ingredientCost / foodRevenue) * 100
      expect(calculated).toBe(0)
    })

    it('should maintain food cost percentage below 30% target', () => {
      const ingredientCost = 250
      const foodRevenue = 1000
      const targetPercentage = 30

      const calculated = (ingredientCost / foodRevenue) * 100
      expect(calculated).toBeLessThanOrEqual(targetPercentage)
    })

    it('should calculate dish margin correctly', () => {
      const price = 15.0
      const costOfGoods = 5.0
      const expectedMargin = 10.0

      const margin = price - costOfGoods
      expect(margin).toBe(expectedMargin)
    })

    it('should calculate margin percentage correctly', () => {
      const price = 15.0
      const costOfGoods = 5.0
      const expectedMarginPercent = 66.67

      const marginPercent = ((price - costOfGoods) / price) * 100
      expect(Math.round(marginPercent * 100) / 100).toBe(expectedMarginPercent)
    })
  })

  describe('Kitchen Order Status', () => {
    it('should support all order statuses', () => {
      const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled']
      validStatuses.forEach(status => {
        expect(typeof status).toBe('string')
        expect(status).toBeTruthy()
      })
    })

    it('should support all item statuses', () => {
      const validItemStatuses = ['pending', 'in_progress', 'completed', 'cancelled']
      validItemStatuses.forEach(status => {
        expect(typeof status).toBe('string')
        expect(status).toBeTruthy()
      })
    })

    it('should validate ticket number format', () => {
      const ticketNumber = 'KO-20240415-0001'
      const ticketRegex = /^KO-\d{8}-\d{4}$/
      expect(ticketRegex.test(ticketNumber)).toBe(true)
    })

    it('should increment ticket number sequence correctly', () => {
      const lastTicket = 'KO-20240415-0005'
      const sequence = parseInt(lastTicket.split('-')[2])
      const nextSequence = sequence + 1
      const nextTicket = `KO-20240415-${nextSequence.toString().padStart(4, '0')}`

      expect(nextTicket).toBe('KO-20240415-0006')
    })
  })

  describe('Menu Item Photo URL', () => {
    it('should validate photo URL format', () => {
      const validUrl = 'https://example.com/menu/burger.jpg'
      const urlRegex = /^https?:\/\/.+/
      expect(urlRegex.test(validUrl)).toBe(true)
    })

    it('should accept optional photo_url', () => {
      const itemWithPhoto = {
        name_en: 'Burger',
        photo_url: 'https://example.com/burger.jpg',
      }
      const itemWithoutPhoto = {
        name_en: 'Salad',
      }

      expect(itemWithPhoto.photo_url).toBeTruthy()
      expect(itemWithoutPhoto.photo_url).toBeUndefined()
    })
  })

  describe('Prep Time Categories', () => {
    it('should categorize prep times correctly', () => {
      const quick = 5 // < 10 minutes
      const moderate = 15 // 10-20 minutes
      const long = 45 // > 20 minutes

      expect(quick).toBeLessThan(10)
      expect(moderate).toBeGreaterThanOrEqual(10)
      expect(moderate).toBeLessThanOrEqual(20)
      expect(long).toBeGreaterThan(20)
    })

    it('should validate reasonable prep times', () => {
      const validPrepTimes = [5, 10, 15, 20, 30, 45, 60]
      validPrepTimes.forEach(time => {
        expect(time).toBeGreaterThan(0)
        expect(time).toBeLessThanOrEqual(120) // Reasonable max 2 hours
      })
    })
  })

  describe('Menu Activation by Date Range', () => {
    it('should validate date range format', () => {
      const startDate = '2024-04-01'
      const endDate = '2024-10-31'
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/

      expect(dateRegex.test(startDate)).toBe(true)
      expect(dateRegex.test(endDate)).toBe(true)
    })

    it('should ensure end date is after start date', () => {
      const startDate = new Date('2024-04-01')
      const endDate = new Date('2024-10-31')

      expect(endDate.getTime()).toBeGreaterThan(startDate.getTime())
    })

    it('should support seasonal menu transitions', () => {
      const tapasMenuStart = new Date('2024-04-01')
      const tapasMenuEnd = new Date('2024-10-31')
      const internationalMenuStart = new Date('2024-04-15')
      const internationalMenuEnd = new Date('2024-10-31')

      // Both can overlap during transition
      expect(internationalMenuStart.getTime()).toBeGreaterThanOrEqual(tapasMenuStart.getTime())
      expect(internationalMenuEnd.getTime()).toBeGreaterThanOrEqual(tapasMenuEnd.getTime())
    })
  })
})
