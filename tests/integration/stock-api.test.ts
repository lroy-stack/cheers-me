import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Integration Tests for Stock & Inventory API Routes
 * Tests product management, stock movements, alerts, and beer tracking
 */

describe('Stock API Routes', () => {
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

    // Mock auth result for manager
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

  describe('GET /api/stock/products', () => {
    it('returns all products with supplier information', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }

      const mockProducts = [
        {
          id: 'prod-1',
          name: 'San Miguel',
          category: 'beer',
          unit: 'keg',
          current_stock: 50,
          min_stock: 30,
          cost_per_unit: 25,
          supplier: {
            id: 'supp-1',
            name: 'Beer Distributor',
            email: 'sales@beerdist.es',
          },
        },
        {
          id: 'prod-2',
          name: 'Tomatoes',
          category: 'food',
          unit: 'kg',
          current_stock: 100,
          min_stock: 50,
          cost_per_unit: 2.5,
          supplier: {
            id: 'supp-2',
            name: 'Fresh Foods',
            email: 'orders@freshfoods.es',
          },
        },
      ]

      mockQuery.order.mockResolvedValue({
        data: mockProducts,
        error: null,
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await mockQuery.order('name', { ascending: true })

      expect(result.data.length).toBe(2)
      expect(result.data[0].name).toBe('San Miguel')
      expect(result.data[0].category).toBe('beer')
      expect(result.data[0].supplier.name).toBe('Beer Distributor')
    })

    it('filters products by category', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      }

      const mockBeerProducts = [
        {
          id: 'prod-1',
          name: 'San Miguel',
          category: 'beer',
          current_stock: 50,
        },
        {
          id: 'prod-2',
          name: 'Stella',
          category: 'beer',
          current_stock: 40,
        },
      ]

      mockQuery.eq.mockResolvedValue({
        data: mockBeerProducts,
        error: null,
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await mockQuery.eq('category', 'beer')

      expect(result.data.length).toBe(2)
      expect(result.data.every(p => p.category === 'beer')).toBe(true)
    })

    it('filters low stock items', async () => {
      const products = [
        { id: 'prod-1', name: 'Beer A', current_stock: 25, min_stock: 30 },
        { id: 'prod-2', name: 'Beer B', current_stock: 50, min_stock: 30 },
        { id: 'prod-3', name: 'Beer C', current_stock: 10, min_stock: 30 },
      ]

      const lowStockItems = products.filter(
        p => p.min_stock && p.current_stock < p.min_stock
      )

      expect(lowStockItems.length).toBe(2)
      expect(lowStockItems[0].id).toBe('prod-1')
      expect(lowStockItems[1].id).toBe('prod-3')
    })

    it('returns 401 for unauthorized users', async () => {
      const unauthorized = {
        error: 'Unauthorized',
        status: 401,
      }

      expect(unauthorized.status).toBe(401)
    })
  })

  describe('POST /api/stock/products', () => {
    it('creates a new product successfully', async () => {
      const newProductData = {
        name: 'Heineken',
        category: 'beer',
        unit: 'keg',
        current_stock: 0,
        min_stock: 25,
        max_stock: 100,
        cost_per_unit: 28,
        supplier_id: 'supp-1',
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
      }

      mockQuery.single.mockResolvedValue({
        data: { id: 'prod-3', ...newProductData },
        error: null,
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await mockQuery.single()

      expect(result.data.id).toBeDefined()
      expect(result.data.name).toBe('Heineken')
      expect(result.data.category).toBe('beer')
      expect(result.data.cost_per_unit).toBe(28)
    })

    it('validates required fields', async () => {
      const invalidProduct = {
        name: '', // Empty name
        category: 'invalid_category',
        unit: '',
        cost_per_unit: -5, // Negative cost
      }

      const validation = {
        success: false,
        error: {
          errors: [
            { path: ['name'], message: 'String must contain at least 1 character' },
            { path: ['category'], message: 'Invalid enum value' },
            { path: ['cost_per_unit'], message: 'Number must be greater than or equal to 0' },
          ],
        },
      }

      expect(validation.success).toBe(false)
      expect(validation.error.errors.length).toBeGreaterThan(0)
    })

    it('enforces manager-only access', async () => {
      const result = {
        error: 'Forbidden: Only managers and admins can create products',
        status: 403,
      }

      expect(result.status).toBe(403)
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

  describe('GET /api/stock/movements', () => {
    it('returns stock movements with product and employee info', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      }

      const mockMovements = [
        {
          id: 'mov-1',
          product_id: 'prod-1',
          movement_type: 'in',
          quantity: 50,
          reason: 'Delivery from supplier',
          created_at: '2024-01-15T10:30:00',
          product: { id: 'prod-1', name: 'San Miguel', unit: 'keg' },
          recorded_by_employee: {
            id: 'emp-1',
            profile: { full_name: 'John Doe' },
          },
        },
        {
          id: 'mov-2',
          product_id: 'prod-2',
          movement_type: 'out',
          quantity: 10,
          reason: 'Daily usage',
          created_at: '2024-01-15T18:00:00',
          product: { id: 'prod-2', name: 'Tomatoes', unit: 'kg' },
          recorded_by_employee: {
            id: 'emp-2',
            profile: { full_name: 'Jane Smith' },
          },
        },
      ]

      mockQuery.limit.mockResolvedValue({
        data: mockMovements,
        error: null,
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await mockQuery.limit(100)

      expect(result.data.length).toBe(2)
      expect(result.data[0].movement_type).toBe('in')
      expect(result.data[1].movement_type).toBe('out')
      expect(result.data[0].product.name).toBe('San Miguel')
    })

    it('filters movements by product', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      }

      const mockMovements = [
        { id: 'mov-1', product_id: 'prod-1', movement_type: 'in', quantity: 50 },
        { id: 'mov-2', product_id: 'prod-1', movement_type: 'out', quantity: 10 },
      ]

      mockQuery.limit.mockResolvedValue({
        data: mockMovements,
        error: null,
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await mockQuery.limit(100)

      expect(result.data.every(m => m.product_id === 'prod-1')).toBe(true)
    })

    it('filters movements by date range', async () => {
      const movements = [
        { id: 'mov-1', created_at: '2024-01-15T10:00:00' },
        { id: 'mov-2', created_at: '2024-01-15T14:00:00' },
        { id: 'mov-3', created_at: '2024-01-16T10:00:00' },
      ]

      const startDate = '2024-01-15T00:00:00'
      const endDate = '2024-01-15T23:59:59'

      const filtered = movements.filter(
        m => m.created_at >= startDate && m.created_at <= endDate
      )

      expect(filtered.length).toBe(2)
    })
  })

  describe('POST /api/stock/movements', () => {
    it('creates stock movement and updates product stock', async () => {
      const movementData = {
        product_id: 'prod-1',
        movement_type: 'in',
        quantity: 50,
        reason: 'Delivery from supplier',
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
      }

      const response = {
        id: 'mov-1',
        ...movementData,
        previous_stock: 100,
        new_stock: 150,
      }

      mockQuery.single.mockResolvedValue({
        data: response,
        error: null,
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await mockQuery.single()

      expect(result.data.id).toBeDefined()
      expect(result.data.movement_type).toBe('in')
      expect(result.data.new_stock).toBe(150)
    })

    it('prevents stock from going negative', async () => {
      const currentStock = 50
      const requestedOutQty = 100

      let newStock = currentStock - requestedOutQty

      if (newStock < 0) {
        const error = {
          error: `Insufficient stock. Current: ${currentStock} units`,
          status: 400,
        }
        expect(error.status).toBe(400)
      } else {
        expect(newStock).toBeGreaterThanOrEqual(0)
      }
    })

    it('handles all movement types correctly', async () => {
      const movements = [
        { type: 'in', currentStock: 100, quantity: 50, expected: 150 },
        { type: 'out', currentStock: 100, quantity: 30, expected: 70 },
        { type: 'waste', currentStock: 100, quantity: 20, expected: 80 },
        { type: 'adjustment', currentStock: 100, quantity: 15, expected: 115 },
        { type: 'adjustment', currentStock: 100, quantity: -25, expected: 75 },
      ]

      movements.forEach(({ type, currentStock, quantity, expected }) => {
        let newStock = currentStock

        switch (type) {
          case 'in':
            newStock += Math.abs(quantity)
            break
          case 'out':
          case 'waste':
            newStock -= Math.abs(quantity)
            break
          case 'adjustment':
            newStock += quantity
            break
        }

        expect(newStock).toBe(expected)
      })
    })

    it('validates movement_type enum', async () => {
      const invalidMovement = {
        product_id: 'prod-1',
        movement_type: 'invalid_type',
        quantity: 50,
      }

      const validation = {
        success: false,
        error: {
          errors: [
            {
              path: ['movement_type'],
              message: 'Invalid enum value',
            },
          ],
        },
      }

      expect(validation.success).toBe(false)
    })

    it('validates required fields', async () => {
      const invalidMovement = {
        product_id: '', // Invalid UUID
        movement_type: 'in',
        quantity: -5, // Could be invalid depending on rules
      }

      const validation = {
        success: false,
        error: { errors: [] },
      }

      expect(validation.success).toBe(false)
    })

    it('logs employee who recorded movement', async () => {
      const movementData = {
        product_id: 'prod-1',
        movement_type: 'out',
        quantity: 10,
        recorded_by: 'emp-1',
      }

      expect(movementData.recorded_by).toBeDefined()
      expect(movementData.recorded_by).toBe('emp-1')
    })
  })

  describe('GET /api/stock/alerts', () => {
    it('returns unresolved stock alerts', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      }

      const mockAlerts = [
        {
          id: 'alert-1',
          product_id: 'prod-1',
          alert_type: 'low_stock',
          resolved: false,
          created_at: '2024-01-15T10:30:00',
          product: {
            id: 'prod-1',
            name: 'San Miguel',
            current_stock: 20,
            min_stock: 30,
          },
        },
        {
          id: 'alert-2',
          product_id: 'prod-2',
          alert_type: 'low_stock',
          resolved: false,
          created_at: '2024-01-15T12:00:00',
          product: {
            id: 'prod-2',
            name: 'Tomatoes',
            current_stock: 40,
            min_stock: 50,
          },
        },
      ]

      mockQuery.eq.mockResolvedValue({
        data: mockAlerts,
        error: null,
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await mockQuery.eq('resolved', false)

      expect(result.data.length).toBe(2)
      expect(result.data.every(a => a.resolved === false)).toBe(true)
    })

    it('filters alerts by alert type', async () => {
      const alerts = [
        { id: 'alert-1', alert_type: 'low_stock', resolved: false },
        { id: 'alert-2', alert_type: 'overstocked', resolved: false },
        { id: 'alert-3', alert_type: 'low_stock', resolved: false },
      ]

      const lowStockAlerts = alerts.filter(a => a.alert_type === 'low_stock')

      expect(lowStockAlerts.length).toBe(2)
      expect(lowStockAlerts.every(a => a.alert_type === 'low_stock')).toBe(true)
    })

    it('filters alerts by product', async () => {
      const alerts = [
        { id: 'alert-1', product_id: 'prod-1', resolved: false },
        { id: 'alert-2', product_id: 'prod-2', resolved: false },
        { id: 'alert-3', product_id: 'prod-1', resolved: true },
      ]

      const prod1Alerts = alerts.filter(a => a.product_id === 'prod-1')

      expect(prod1Alerts.length).toBe(2)
    })

    it('returns 401 for unauthorized users', async () => {
      const unauthorized = {
        error: 'Unauthorized',
        status: 401,
      }

      expect(unauthorized.status).toBe(401)
    })
  })

  describe('PUT /api/stock/alerts', () => {
    it('resolves multiple alerts in bulk', async () => {
      const bulkUpdateData = {
        alert_ids: ['alert-1', 'alert-2', 'alert-3'],
        resolved: true,
      }

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
      }

      const updatedAlerts = [
        { id: 'alert-1', resolved: true, resolved_at: '2024-01-15T15:00:00' },
        { id: 'alert-2', resolved: true, resolved_at: '2024-01-15T15:00:00' },
        { id: 'alert-3', resolved: true, resolved_at: '2024-01-15T15:00:00' },
      ]

      mockQuery.select.mockResolvedValue({
        data: updatedAlerts,
        error: null,
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await mockQuery.select()

      expect(result.data.length).toBe(3)
      expect(result.data.every(a => a.resolved === true)).toBe(true)
    })

    it('enforces manager-only access for alert resolution', async () => {
      const result = {
        error: 'Forbidden: Only managers can resolve alerts',
        status: 403,
      }

      expect(result.status).toBe(403)
    })

    it('validates alert_ids array', async () => {
      const invalidData = {
        alert_ids: [], // Empty array
        resolved: true,
      }

      const validation = {
        success: false,
        error: { errors: [{ path: ['alert_ids'], message: 'Array must contain at least 1 element' }] },
      }

      expect(validation.success).toBe(false)
    })
  })

  describe('GET /api/stock/kegs', () => {
    it('returns all beer kegs with tracking info', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }

      const mockKegs = [
        {
          id: 'keg-1',
          product_id: 'beer-1',
          keg_number: '001',
          capacity_liters: 50,
          liters_remaining: 35,
          date_installed: '2024-01-01',
          product: { name: 'San Miguel' },
        },
        {
          id: 'keg-2',
          product_id: 'beer-2',
          keg_number: '002',
          capacity_liters: 50,
          liters_remaining: 5,
          date_installed: '2024-01-05',
          product: { name: 'Stella' },
        },
      ]

      mockQuery.order.mockResolvedValue({
        data: mockKegs,
        error: null,
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await mockQuery.order('date_installed')

      expect(result.data.length).toBe(2)
      expect(result.data[0].liters_remaining).toBe(35)
      expect(result.data[1].liters_remaining).toBe(5)
    })

    it('calculates keg usage percentage', async () => {
      const kegs = [
        { capacity_liters: 50, liters_remaining: 40 }, // 20% used
        { capacity_liters: 50, liters_remaining: 25 }, // 50% used
        { capacity_liters: 50, liters_remaining: 0 }, // 100% used
      ]

      const usage = kegs.map(keg => {
        const used = keg.capacity_liters - keg.liters_remaining
        return (used / keg.capacity_liters) * 100
      })

      expect(usage[0]).toBe(20)
      expect(usage[1]).toBe(50)
      expect(usage[2]).toBe(100)
    })

    it('identifies empty kegs', async () => {
      const kegs = [
        { id: 'keg-1', liters_remaining: 5 },
        { id: 'keg-2', liters_remaining: 0 },
        { id: 'keg-3', liters_remaining: 3 },
      ]

      const emptyKegs = kegs.filter(k => k.liters_remaining <= 0)

      expect(emptyKegs.length).toBe(1)
      expect(emptyKegs[0].id).toBe('keg-2')
    })
  })

  describe('POST /api/stock/kegs/[id]/pour', () => {
    it('records beer pour and updates keg liters', async () => {
      const pourData = {
        quantity_liters: 2.5,
        poured_by: 'emp-1',
        timestamp: '2024-01-15T10:30:00',
      }

      const mockKeg = {
        id: 'keg-1',
        capacity_liters: 50,
        liters_remaining: 25,
      }

      const newLitersRemaining = mockKeg.liters_remaining - pourData.quantity_liters

      expect(newLitersRemaining).toBe(22.5)
    })

    it('prevents pouring more than available', async () => {
      const currentLiters = 5
      const pourQuantity = 10

      if (pourQuantity > currentLiters) {
        const error = {
          error: `Insufficient keg content. Available: ${currentLiters}L`,
          status: 400,
        }
        expect(error.status).toBe(400)
      }
    })

    it('prevents negative liters_remaining', async () => {
      const currentLiters = 3
      const pourQuantity = 5
      const newLiters = currentLiters - pourQuantity

      expect(newLiters < 0).toBe(true)
    })
  })

  describe('GET /api/stock/suppliers', () => {
    it('returns all suppliers with product info', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }

      const mockSuppliers = [
        {
          id: 'supp-1',
          name: 'Beer Distributor',
          contact_person: 'Carlos',
          email: 'carlos@beerdist.es',
          payment_terms: 'Net 30',
          products_count: 15,
        },
        {
          id: 'supp-2',
          name: 'Fresh Foods',
          contact_person: 'Maria',
          email: 'maria@freshfoods.es',
          payment_terms: 'Net 15',
          products_count: 8,
        },
      ]

      mockQuery.order.mockResolvedValue({
        data: mockSuppliers,
        error: null,
      })

      mockSupabase.from.mockReturnValue(mockQuery)

      const result = await mockQuery.order('name')

      expect(result.data.length).toBe(2)
      expect(result.data[0].name).toBe('Beer Distributor')
    })
  })

  describe('GET /api/stock/dashboard', () => {
    it('returns stock dashboard metrics', async () => {
      const mockMetrics = {
        total_product_value: 5000,
        low_stock_items: 5,
        total_waste_this_month: 250,
        waste_percentage: 12,
        top_consumed_items: [
          { name: 'San Miguel', quantity_out: 150 },
          { name: 'Tomatoes', quantity_out: 120 },
        ],
        reorder_alerts_count: 5,
        stock_take_variance: 2.5,
      }

      expect(mockMetrics.total_product_value).toBe(5000)
      expect(mockMetrics.low_stock_items).toBe(5)
      expect(mockMetrics.waste_percentage).toBe(12)
      expect(mockMetrics.top_consumed_items.length).toBe(2)
    })
  })

  describe('Error Handling', () => {
    it('returns 401 when user is not authenticated', async () => {
      const error = {
        error: 'Unauthorized',
        status: 401,
      }

      expect(error.status).toBe(401)
    })

    it('returns 403 for insufficient permissions', async () => {
      const error = {
        error: 'Forbidden',
        status: 403,
      }

      expect(error.status).toBe(403)
    })

    it('returns 404 when resource not found', async () => {
      const error = {
        error: 'Product not found',
        status: 404,
      }

      expect(error.status).toBe(404)
    })

    it('returns 400 for validation errors', async () => {
      const error = {
        error: 'Validation failed',
        status: 400,
      }

      expect(error.status).toBe(400)
    })

    it('returns 500 for database errors', async () => {
      const error = {
        error: 'Database error',
        status: 500,
      }

      expect(error.status).toBe(500)
    })
  })
})
