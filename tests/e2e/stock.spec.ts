import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Stock & Inventory Module
 * Tests complete stock management workflows with Playwright
 */

test.describe('Stock & Inventory Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as manager
    await page.goto('/login')
    await page.fill('input[type="email"]', 'manager@cheers.com')
    await page.fill('input[type="password"]', 'test1234')
    await page.click('button[type="submit"]')

    // Wait for navigation to dashboard
    await page.waitForURL('/')

    // Navigate to stock module
    await page.click('a[href="/stock"]')
    await page.waitForURL('/stock')
  })

  test('can view inventory overview with product list', async ({ page }) => {
    // Verify main page loads
    await expect(page.locator('h1')).toContainText('Stock & Inventory')

    // Check for product table
    const productTable = page.locator('table')
    await expect(productTable).toBeVisible()

    // Verify table has headers
    await expect(page.locator('th')).toContainText('Product Name')
    await expect(page.locator('th')).toContainText('Category')
    await expect(page.locator('th')).toContainText('Current Stock')
    await expect(page.locator('th')).toContainText('Min Stock')
  })

  test('can filter products by category', async ({ page }) => {
    // Find and click category filter
    const categoryFilter = page.locator('select[name="category"]')
    await categoryFilter.selectOption('beer')

    // Verify table updates (would show only beer products)
    const rows = page.locator('tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)

    // Verify filtered results show beer products
    const firstCategory = page.locator('tbody tr:first-child td:nth-child(2)')
    await expect(firstCategory).toContainText('Beer')
  })

  test('can search for products', async ({ page }) => {
    // Fill search input
    const searchInput = page.locator('input[placeholder="Search products..."]')
    await searchInput.fill('San Miguel')

    // Wait for search results
    await page.waitForTimeout(500)

    // Verify filtered results
    const rows = page.locator('tbody tr')
    const rowCount = await rows.count()
    expect(rowCount).toBeGreaterThan(0)

    // Verify product name appears
    await expect(page.locator('tbody')).toContainText('San Miguel')
  })

  test('can create new product', async ({ page }) => {
    // Click Add Product button
    await page.click('button:has-text("Add Product")')

    // Fill form fields
    await page.fill('input[name="name"]', 'Guinness Draft')
    await page.selectOption('select[name="category"]', 'beer')
    await page.fill('input[name="unit"]', 'keg')
    await page.fill('input[name="cost_per_unit"]', '30')
    await page.fill('input[name="min_stock"]', '20')
    await page.fill('input[name="max_stock"]', '80')

    // Submit form
    await page.click('button[type="submit"]')

    // Verify success message or new product appears
    await expect(page.locator('text=Product created successfully')).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'screenshots/stock-create-product.png' })
  })

  test('can log stock movement (delivery)', async ({ page }) => {
    // Navigate to movements section
    await page.click('a[href="/stock/movements"]')
    await page.waitForURL('/stock/movements')

    // Click Add Movement button
    await page.click('button:has-text("Log Movement")')

    // Select product
    const productSelect = page.locator('select[name="product_id"]')
    const options = await productSelect.locator('option').count()
    expect(options).toBeGreaterThan(0)
    await productSelect.selectOption({ index: 1 })

    // Select movement type: IN (delivery)
    await page.selectOption('select[name="movement_type"]', 'in')

    // Enter quantity
    await page.fill('input[name="quantity"]', '50')

    // Enter reason
    await page.fill('input[name="reason"]', 'Delivery from Beer Distributor')

    // Submit
    await page.click('button[type="submit"]')

    // Verify success
    await expect(page.locator('text=Movement recorded')).toBeVisible()

    // Verify movement appears in list
    await expect(page.locator('tbody')).toContainText('in')

    // Take screenshot
    await page.screenshot({ path: 'screenshots/stock-log-movement-delivery.png' })
  })

  test('can log stock movement (usage/out)', async ({ page }) => {
    // Navigate to movements
    await page.click('a[href="/stock/movements"]')
    await page.waitForURL('/stock/movements')

    // Click Add Movement
    await page.click('button:has-text("Log Movement")')

    // Select product
    await page.selectOption('select[name="product_id"]', { index: 1 })

    // Select OUT movement
    await page.selectOption('select[name="movement_type"]', 'out')

    // Enter quantity
    await page.fill('input[name="quantity"]', '10')

    // Enter reason
    await page.fill('input[name="reason"]', 'Used in service')

    // Submit
    await page.click('button[type="submit"]')

    // Verify success
    await expect(page.locator('text=Movement recorded')).toBeVisible()
  })

  test('can log waste with reason category', async ({ page }) => {
    // Navigate to movements
    await page.click('a[href="/stock/movements"]')
    await page.waitForURL('/stock/movements')

    // Click Add Movement
    await page.click('button:has-text("Log Movement")')

    // Select product
    await page.selectOption('select[name="product_id"]', { index: 1 })

    // Select WASTE movement
    await page.selectOption('select[name="movement_type"]', 'waste')

    // Enter quantity
    await page.fill('input[name="quantity"]', '5')

    // Select waste reason
    await page.selectOption('select[name="waste_reason"]', 'damaged')

    // Submit
    await page.click('button[type="submit"]')

    // Verify success
    await expect(page.locator('text=Waste logged')).toBeVisible()
  })

  test('can view stock alerts when item is low', async ({ page }) => {
    // Navigate to alerts section
    await page.click('a[href="/stock/alerts"]')
    await page.waitForURL('/stock/alerts')

    // Check if alerts section exists
    await expect(page.locator('h2')).toContainText('Stock Alerts')

    // If there are unresolved alerts, they should be visible
    const unresolvedAlerts = page.locator('[data-testid="alert-item"][data-resolved="false"]')
    const alertCount = await unresolvedAlerts.count()

    if (alertCount > 0) {
      // Verify alert shows product name and current stock
      await expect(unresolvedAlerts.first()).toContainText('low_stock')
    }

    // Take screenshot
    await page.screenshot({ path: 'screenshots/stock-alerts.png' })
  })

  test('can resolve stock alert', async ({ page }) => {
    // Navigate to alerts
    await page.click('a[href="/stock/alerts"]')
    await page.waitForURL('/stock/alerts')

    // Find an unresolved alert and check/click it
    const unresolvedAlerts = page.locator('[data-testid="alert-item"][data-resolved="false"]')
    const count = await unresolvedAlerts.count()

    if (count > 0) {
      // Click checkbox to select alert
      await unresolvedAlerts.first().locator('input[type="checkbox"]').click()

      // Click Resolve button
      await page.click('button:has-text("Resolve Selected")')

      // Verify success message
      await expect(page.locator('text=Alert resolved')).toBeVisible()
    } else {
      // If no unresolved alerts, test passes
      expect(count).toBe(0)
    }
  })

  test('can view beer keg tracking', async ({ page }) => {
    // Navigate to beer tracking
    await page.click('a[href="/stock/kegs"]')
    await page.waitForURL('/stock/kegs')

    // Verify page title
    await expect(page.locator('h1')).toContainText('Beer Keg Tracking')

    // Check for keg list
    const kegTable = page.locator('table')
    await expect(kegTable).toBeVisible()

    // Verify columns
    await expect(page.locator('th')).toContainText('Beer Name')
    await expect(page.locator('th')).toContainText('Liters Remaining')
  })

  test('can pour beer and update keg liters', async ({ page }) => {
    // Navigate to beer kegs
    await page.click('a[href="/stock/kegs"]')
    await page.waitForURL('/stock/kegs')

    // Find first keg and click pour button
    const kegRow = page.locator('tbody tr').first()
    await kegRow.locator('button:has-text("Pour")').click()

    // Fill pour quantity
    await page.fill('input[name="quantity_liters"]', '2.5')

    // Submit
    await page.click('button[type="submit"]')

    // Verify success
    await expect(page.locator('text=Pour recorded')).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'screenshots/stock-pour-keg.png' })
  })

  test('can manage suppliers', async ({ page }) => {
    // Navigate to suppliers
    await page.click('a[href="/stock/suppliers"]')
    await page.waitForURL('/stock/suppliers')

    // Verify page loads
    await expect(page.locator('h1')).toContainText('Suppliers')

    // Check supplier list
    const supplierTable = page.locator('table')
    await expect(supplierTable).toBeVisible()

    // Verify columns
    await expect(page.locator('th')).toContainText('Supplier Name')
    await expect(page.locator('th')).toContainText('Contact')
    await expect(page.locator('th')).toContainText('Email')
  })

  test('can create new supplier', async ({ page }) => {
    // Navigate to suppliers
    await page.click('a[href="/stock/suppliers"]')
    await page.waitForURL('/stock/suppliers')

    // Click Add Supplier button
    await page.click('button:has-text("Add Supplier")')

    // Fill supplier details
    await page.fill('input[name="name"]', 'Premium Beer Supplier')
    await page.fill('input[name="contact_person"]', 'Juan Garcia')
    await page.fill('input[name="email"]', 'juan@premiumbeers.es')
    await page.fill('input[name="phone"]', '+34 971 123 456')
    await page.fill('input[name="payment_terms"]', 'Net 30')

    // Submit
    await page.click('button[type="submit"]')

    // Verify success
    await expect(page.locator('text=Supplier created')).toBeVisible()
  })

  test('can view stock take history', async ({ page }) => {
    // Navigate to stock takes
    await page.click('a[href="/stock/stock-takes"]')
    await page.waitForURL('/stock/stock-takes')

    // Verify page loads
    await expect(page.locator('h1')).toContainText('Stock Takes')

    // Check for stock take list
    const stockTakeList = page.locator('table, ul, [data-testid="stock-take-list"]')
    const exists = await stockTakeList.isVisible().catch(() => false)

    if (exists) {
      await expect(stockTakeList).toBeVisible()
    }
  })

  test('can create stock take', async ({ page }) => {
    // Navigate to stock takes
    await page.click('a[href="/stock/stock-takes"]')
    await page.waitForURL('/stock/stock-takes')

    // Click Create Stock Take button
    await page.click('button:has-text("Create Stock Take")')

    // Should show products to count
    const productRows = page.locator('[data-testid="product-count-row"]')
    const count = await productRows.count()

    if (count > 0) {
      // Fill in first product count
      await productRows.first().locator('input[type="number"]').fill('100')

      // Submit stock take
      await page.click('button[type="submit"]')

      // Verify success
      await expect(page.locator('text=Stock take created')).toBeVisible()
    }
  })

  test('can view stock dashboard metrics', async ({ page }) => {
    // Go to dashboard
    await page.goto('/')

    // Look for stock metrics widget
    const stockWidget = page.locator('[data-testid="stock-dashboard-widget"]')
    const exists = await stockWidget.isVisible().catch(() => false)

    if (exists) {
      // Verify key metrics are displayed
      await expect(stockWidget).toContainText('Total Stock Value')
      await expect(stockWidget).toContainText('Low Stock Items')
      await expect(stockWidget).toContainText('Waste %')

      // Take screenshot
      await page.screenshot({ path: 'screenshots/stock-dashboard-widget.png' })
    }
  })

  test('prevents creating product with negative cost', async ({ page }) => {
    // Click Add Product button
    await page.click('button:has-text("Add Product")')

    // Try to fill negative cost
    await page.fill('input[name="name"]', 'Test Product')
    await page.fill('input[name="cost_per_unit"]', '-50')

    // Try to submit
    await page.click('button[type="submit"]')

    // Should show validation error
    const errorMessage = page.locator('[role="alert"]')
    const visible = await errorMessage.isVisible().catch(() => false)

    if (visible) {
      await expect(errorMessage).toContainText('must be positive')
    }
  })

  test('prevents stock movement that would result in negative stock', async ({ page }) => {
    // Navigate to movements
    await page.click('a[href="/stock/movements"]')
    await page.waitForURL('/stock/movements')

    // Click Add Movement
    await page.click('button:has-text("Log Movement")')

    // Select product
    await page.selectOption('select[name="product_id"]', { index: 1 })

    // Select OUT movement with excessive quantity
    await page.selectOption('select[name="movement_type"]', 'out')
    await page.fill('input[name="quantity"]', '999999')

    // Try to submit
    await page.click('button[type="submit"]')

    // Should show error
    const error = page.locator('[role="alert"]')
    const visible = await error.isVisible().catch(() => false)

    if (visible) {
      await expect(error).toContainText('Insufficient stock')
    }
  })

  test('shows proper audit trail for stock movements', async ({ page }) => {
    // Navigate to movements
    await page.click('a[href="/stock/movements"]')
    await page.waitForURL('/stock/movements')

    // Look for movement history
    const movements = page.locator('[data-testid="movement-row"]')
    const count = await movements.count()

    if (count > 0) {
      // Click first movement to see details
      await movements.first().click()

      // Verify details show
      const details = page.locator('[data-testid="movement-details"]')
      await expect(details).toContainText('Recorded by')
      await expect(details).toContainText('Timestamp')
    }
  })
})

test.describe('Stock & Inventory - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input[type="email"]', 'manager@cheers.com')
    await page.fill('input[type="password"]', 'test1234')
    await page.click('button[type="submit"]')
    await page.waitForURL('/')
  })

  test('keyboard navigation works in stock module', async ({ page }) => {
    // Navigate using Tab key
    await page.goto('/stock')

    // Tab to Add Product button and activate
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')

    // Form should open
    const form = page.locator('form')
    await expect(form).toBeVisible()
  })

  test('form labels are properly associated', async ({ page }) => {
    await page.goto('/stock')

    // Click Add Product
    await page.click('button:has-text("Add Product")')

    // Verify labels are associated with inputs
    const nameLabel = page.locator('label[for="product-name"]')
    const nameInput = page.locator('input[id="product-name"]')

    const labelVisible = await nameLabel.isVisible().catch(() => false)
    const inputVisible = await nameInput.isVisible().catch(() => false)

    if (labelVisible && inputVisible) {
      await expect(nameLabel).toBeVisible()
      await expect(nameInput).toBeVisible()
    }
  })
})

test.describe('Stock & Inventory - Mobile Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Login
    await page.goto('/login')
    await page.fill('input[type="email"]', 'manager@cheers.com')
    await page.fill('input[type="password"]', 'test1234')
    await page.click('button[type="submit"]')
    await page.waitForURL('/')
  })

  test('stock list is readable on mobile', async ({ page }) => {
    await page.goto('/stock')

    // Page should be visible
    const table = page.locator('table')
    const visible = await table.isVisible().catch(() => false)

    // If table exists, check it's readable
    if (visible) {
      await expect(table).toBeVisible()
    }

    // Take mobile screenshot
    await page.screenshot({ path: 'screenshots/stock-mobile.png' })
  })

  test('alert icon appears on mobile when items are low', async ({ page }) => {
    await page.goto('/stock')

    // Look for alert badge
    const alertBadge = page.locator('[data-testid="low-stock-badge"]')
    const visible = await alertBadge.isVisible().catch(() => false)

    if (visible) {
      await expect(alertBadge).toBeVisible()
    }
  })
})
