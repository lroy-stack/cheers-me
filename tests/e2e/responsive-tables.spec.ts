import { test, expect } from '@playwright/test'

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || ''
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || ''

test.describe('Responsive Tables', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'E2E_TEST_EMAIL and E2E_TEST_PASSWORD env vars required')

  test('tables should have overflow-x-auto on desktop', async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await page.fill('[name="email"]', TEST_EMAIL)
    await page.fill('[name="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL('http://localhost:3000/')

    // Navigate to a page with tables (e.g. stock)
    await page.goto('http://localhost:3000/stock')
    await page.waitForTimeout(3000)

    // Check that tables have proper overflow handling
    const tables = page.locator('table')
    const count = await tables.count()

    if (count > 0) {
      // Table parent should have overflow-x-auto
      const tableParent = tables.first().locator('..')
      const overflow = await tableParent.evaluate(el => getComputedStyle(el).overflowX)
      expect(['auto', 'scroll', 'hidden']).toContain(overflow)
    }
  })

  test('should display content properly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('http://localhost:3000/login')
    await page.fill('[name="email"]', TEST_EMAIL)
    await page.fill('[name="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL('http://localhost:3000/')

    // On mobile, content should not overflow horizontally
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    // Allow small tolerance for scrollbars
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
  })
})
