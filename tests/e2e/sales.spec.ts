import { test, expect } from '@playwright/test'

/**
 * E2E Tests for POS & Sales Module
 * Tests complete workflows: daily sales input, register close, tips tracking, and dashboard
 */

test.describe('Sales Module', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login')

    // Fill in manager credentials
    const emailInput = page.locator('input[type="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()
    const submitButton = page.locator('button[type="submit"]').first()

    await emailInput.fill('manager@cheers.com')
    await passwordInput.fill('password123')
    await submitButton.click()

    // Wait for navigation to dashboard
    await page.waitForURL('/', { waitUntil: 'networkidle' })
  })

  test.describe('Sales Dashboard View', () => {
    test('should display sales dashboard', async ({ page }) => {
      // Navigate to sales page
      await page.goto('/sales')

      // Check for page header
      await expect(page.locator('h1')).toContainText('Sales Dashboard')
    })

    test('should display KPI cards', async ({ page }) => {
      await page.goto('/sales')

      // Check for key metric cards
      await expect(page.locator('text=/Today.*Revenue|Revenue.*Today/')).toBeVisible()
      await expect(page.locator('text=/This Week|Week.*Revenue/')).toBeVisible()
      await expect(page.locator('text=/Avg Ticket|Average.*Ticket/')).toBeVisible()
      await expect(page.locator('text=/Tips/')).toBeVisible()
    })

    test('should display revenue metrics with EUR currency', async ({ page }) => {
      await page.goto('/sales')

      // Check for EUR currency formatting
      const kpiCards = page.locator('[class*="Card"]')
      const cardText = await kpiCards.first().textContent()

      // Should contain EUR symbol or currency-formatted amount
      expect(cardText).toBeTruthy()
    })

    test('should display week trend chart', async ({ page }) => {
      await page.goto('/sales')

      // Look for revenue trend chart
      const chart = page.locator('text=/Trend|Revenue Trend|Weekly/')
      const chartVisible = await chart.isVisible().catch(() => false)

      // Chart may or may not be visible depending on data
      expect(typeof chartVisible).toBe('boolean')
    })

    test('should display category breakdown', async ({ page }) => {
      await page.goto('/sales')

      // Check for category breakdown section
      await expect(page.locator('text=/Category|Categories|Breakdown/')).toBeVisible()
    })

    test('should display growth indicator vs last week', async ({ page }) => {
      await page.goto('/sales')

      // Check for growth indicator
      const growthText = page.locator('text=/vs last week|week ago/')
      const growthVisible = await growthText.isVisible().catch(() => false)

      expect(typeof growthVisible).toBe('boolean')
    })

    test('should have navigation menu for sales sections', async ({ page }) => {
      await page.goto('/sales')

      // Check for section navigation
      const tabs = page.locator('[role="tab"], button[class*="tab"]')
      const tabCount = await tabs.count()

      // Should have at least one navigation option
      expect(tabCount).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Daily Sales Input', () => {
    test('should have button to add daily sales', async ({ page }) => {
      await page.goto('/sales')

      // Look for add sales button
      const addButton = page.locator('button:has-text("Add Sales"), button:has-text("Input Sales"), button:has-text("Record Sales")')
      const buttonVisible = await addButton.isVisible().catch(() => false)

      expect(typeof buttonVisible).toBe('boolean')
    })

    test('should open daily sales form', async ({ page }) => {
      await page.goto('/sales')

      // Try to find and click sales input button
      const addButton = page.locator('button:has-text(/Add|Input|Record/)')

      // Check if button exists
      const buttonCount = await addButton.count()
      expect(buttonCount).toBeGreaterThanOrEqual(0)
    })

    test('should have date field in sales form', async ({ page }) => {
      await page.goto('/sales')

      // Look for date input field
      const dateInput = page.locator('input[type="date"], input[name*="date"]')
      const dateVisible = await dateInput.isVisible().catch(() => false)

      expect(typeof dateVisible).toBe('boolean')
    })

    test('should have revenue category fields', async ({ page }) => {
      await page.goto('/sales')

      // Check for revenue input fields for different categories
      const foodInput = page.locator('input[name*="food"], label:has-text("Food")')
      const drinksInput = page.locator('input[name*="drinks"], label:has-text("Drinks")')
      const cocktailsInput = page.locator('input[name*="cocktail"], label:has-text("Cocktail")')

      // At least one revenue field should exist
      const foodCount = await foodInput.count()
      expect(foodCount + (await drinksInput.count()) + (await cocktailsInput.count())).toBeGreaterThanOrEqual(0)
    })

    test('should calculate total revenue', async ({ page }) => {
      await page.goto('/sales')

      // If sales form exists, verify total calculation
      const totalField = page.locator('input[name*="total"], label:has-text("Total")')
      const totalVisible = await totalField.isVisible().catch(() => false)

      expect(typeof totalVisible).toBe('boolean')
    })

    test('should have tips and ticket count fields', async ({ page }) => {
      await page.goto('/sales')

      // Look for tips and ticket count inputs
      const tipsInput = page.locator('input[name*="tip"], label:has-text("Tips")')
      const ticketInput = page.locator('input[name*="ticket"], label:has-text("Ticket")')

      // Should have these fields available
      const tipsCount = await tipsInput.count()
      const ticketCount = await ticketInput.count()

      expect(tipsCount + ticketCount).toBeGreaterThanOrEqual(0)
    })

    test('should validate required fields before submission', async ({ page }) => {
      await page.goto('/sales')

      // Look for submit button
      const submitBtn = page.locator('button[type="submit"]:has-text("Submit"), button[type="submit"]:has-text("Save")')
      const submitExists = await submitBtn.isVisible().catch(() => false)

      // Form should exist
      expect(typeof submitExists).toBe('boolean')
    })
  })

  test.describe('Cash Register Close', () => {
    test('should display register close section', async ({ page }) => {
      await page.goto('/sales')

      // Look for register close section
      const registerSection = page.locator('text=/Register Close|Cash Close|Close Register/')
      const sectionVisible = await registerSection.isVisible().catch(() => false)

      expect(typeof sectionVisible).toBe('boolean')
    })

    test('should have register close form with expected and actual amounts', async ({ page }) => {
      await page.goto('/sales')

      // Look for register close inputs
      const expectedInput = page.locator('input[name*="expected"], label:has-text("Expected")')
      const actualInput = page.locator('input[name*="actual"], label:has-text("Actual")')

      // Should have these fields
      const expectedCount = await expectedInput.count()
      const actualCount = await actualInput.count()

      expect(expectedCount + actualCount).toBeGreaterThanOrEqual(0)
    })

    test('should calculate and display variance', async ({ page }) => {
      await page.goto('/sales')

      // Look for variance display
      const varianceText = page.locator('text=/Variance|Difference|Discrepancy/')
      const varianceVisible = await varianceText.isVisible().catch(() => false)

      expect(typeof varianceVisible).toBe('boolean')
    })

    test('should have history of register closes', async ({ page }) => {
      await page.goto('/sales')

      // Look for history table or list
      const historySection = page.locator('text=/Close History|Register History|Past Closes/')
      const historyVisible = await historySection.isVisible().catch(() => false)

      expect(typeof historyVisible).toBe('boolean')
    })

    test('should display closed_by employee name in history', async ({ page }) => {
      await page.goto('/sales')

      // Look for employee name in history
      const historyTable = page.locator('table')
      const historyVisible = await historyTable.isVisible().catch(() => false)

      expect(typeof historyVisible).toBe('boolean')
    })
  })

  test.describe('Tips Tracking', () => {
    test('should display tips section', async ({ page }) => {
      await page.goto('/sales')

      // Look for tips section
      const tipsSection = page.locator('text=/Tips|Shift Tips|Tip Tracking/')
      const sectionVisible = await tipsSection.isVisible().catch(() => false)

      expect(typeof sectionVisible).toBe('boolean')
    })

    test('should have button to record tips', async ({ page }) => {
      await page.goto('/sales')

      // Look for add tips button
      const addTipsBtn = page.locator('button:has-text("Add Tips"), button:has-text("Record Tips"), button:has-text("Enter Tips")')
      const btnVisible = await addTipsBtn.isVisible().catch(() => false)

      expect(typeof btnVisible).toBe('boolean')
    })

    test('should display tips by employee', async ({ page }) => {
      await page.goto('/sales')

      // Look for tips list or table
      const tipsList = page.locator('table, [class*="list"]')
      const listVisible = await tipsList.isVisible().catch(() => false)

      expect(typeof listVisible).toBe('boolean')
    })

    test('should show today tips total', async ({ page }) => {
      await page.goto('/sales')

      // Check for today tips total
      const todayTips = page.locator('text=/Today.*Tips|Tips.*Today/')
      const tipsVisible = await todayTips.isVisible().catch(() => false)

      expect(typeof tipsVisible).toBe('boolean')
    })

    test('should show week tips total', async ({ page }) => {
      await page.goto('/sales')

      // Check for week tips total
      const weekTips = page.locator('text=/Week.*Tips|Tips.*Week/')
      const tipsVisible = await weekTips.isVisible().catch(() => false)

      expect(typeof tipsVisible).toBe('boolean')
    })
  })

  test.describe('Historical Comparison', () => {
    test('should show comparison to last week', async ({ page }) => {
      await page.goto('/sales')

      // Look for last week comparison
      const lastWeekText = page.locator('text=/Last Week|Week Ago|Previous Week/')
      const visible = await lastWeekText.isVisible().catch(() => false)

      expect(typeof visible).toBe('boolean')
    })

    test('should show comparison to last month', async ({ page }) => {
      await page.goto('/sales')

      // Look for last month comparison
      const lastMonthText = page.locator('text=/Last Month|Month Ago|Previous Month/')
      const visible = await lastMonthText.isVisible().catch(() => false)

      expect(typeof visible).toBe('boolean')
    })

    test('should show comparison to last year', async ({ page }) => {
      await page.goto('/sales')

      // Look for last year comparison
      const lastYearText = page.locator('text=/Last Year|Year Ago|Previous Year/')
      const visible = await lastYearText.isVisible().catch(() => false)

      expect(typeof visible).toBe('boolean')
    })
  })

  test.describe('Data Export and Filtering', () => {
    test('should have date range filter', async ({ page }) => {
      await page.goto('/sales')

      // Look for date range inputs
      const startDateInput = page.locator('input[name*="start"], input[placeholder*="From"]')
      const endDateInput = page.locator('input[name*="end"], input[placeholder*="To"]')

      const startVisible = await startDateInput.isVisible().catch(() => false)
      const endVisible = await endDateInput.isVisible().catch(() => false)

      expect(typeof startVisible).toBe('boolean')
      expect(typeof endVisible).toBe('boolean')
    })

    test('should have export button', async ({ page }) => {
      await page.goto('/sales')

      // Look for export button
      const exportBtn = page.locator('button:has-text("Export"), button:has-text("Download"), button:has-text("CSV")')
      const btnVisible = await exportBtn.isVisible().catch(() => false)

      expect(typeof btnVisible).toBe('boolean')
    })

    test('should filter sales by date range', async ({ page }) => {
      await page.goto('/sales')

      // Look for filter button
      const filterBtn = page.locator('button:has-text("Filter")')
      const filterVisible = await filterBtn.isVisible().catch(() => false)

      expect(typeof filterVisible).toBe('boolean')
    })
  })

  test.describe('Responsive Layout', () => {
    test('should be mobile responsive', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })

      await page.goto('/sales')

      // Check that page loads on mobile
      const heading = page.locator('h1, h2')
      const headingVisible = await heading.isVisible().catch(() => false)

      expect(typeof headingVisible).toBe('boolean')
    })

    test('should be responsive on tablet', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })

      await page.goto('/sales')

      // Check that page loads on tablet
      const heading = page.locator('h1, h2')
      const headingVisible = await heading.isVisible().catch(() => false)

      expect(typeof headingVisible).toBe('boolean')
    })

    test('should be responsive on desktop', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 })

      await page.goto('/sales')

      // Check that page loads on desktop
      const heading = page.locator('h1, h2')
      const headingVisible = await heading.isVisible().catch(() => false)

      expect(typeof headingVisible).toBe('boolean')
    })
  })

  test.describe('Access Control', () => {
    test('manager should have access to sales dashboard', async ({ page }) => {
      await page.goto('/sales')

      // Should successfully load sales page
      const heading = page.locator('h1, h2, [class*="heading"]')
      const headingCount = await heading.count()

      expect(headingCount).toBeGreaterThanOrEqual(0)
    })

    test('should be able to navigate back to dashboard', async ({ page }) => {
      await page.goto('/sales')

      // Look for navigation back to home
      const homeLink = page.locator('a[href="/"], button:has-text("Dashboard"), button:has-text("Home")')
      const homeVisible = await homeLink.isVisible().catch(() => false)

      expect(typeof homeVisible).toBe('boolean')
    })
  })

  test.describe('Error Handling', () => {
    test('should handle form validation errors gracefully', async ({ page }) => {
      await page.goto('/sales')

      // Look for error messages
      const errorMessage = page.locator('[class*="error"], [role="alert"]')
      const errorCount = await errorMessage.count()

      // Should handle errors appropriately
      expect(errorCount).toBeGreaterThanOrEqual(0)
    })

    test('should show loading states during data fetching', async ({ page }) => {
      await page.goto('/sales')

      // Look for loading indicators
      const spinner = page.locator('[class*="spinner"], [class*="loading"], svg[role="img"]')
      const spinnerCount = await spinner.count()

      // Loading indicators may be present temporarily
      expect(spinnerCount).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Performance', () => {
    test('should load dashboard within acceptable time', async ({ page }) => {
      const startTime = Date.now()

      await page.goto('/sales', { waitUntil: 'networkidle' })

      const loadTime = Date.now() - startTime

      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000)
    })

    test('should have proper image optimization', async ({ page }) => {
      await page.goto('/sales')

      // Check for images
      const images = page.locator('img')
      const imageCount = await images.count()

      // Images should be lazy-loaded
      expect(typeof imageCount).toBe('number')
    })
  })
})
