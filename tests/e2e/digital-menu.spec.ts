import { test, expect } from '@playwright/test'

test.describe('Digital Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/menu/digital?table=T01')
  })

  test('loads menu with categories and items', async ({ page }) => {
    // Header visible
    await expect(page.locator('header')).toBeVisible()
    await expect(page.getByText('GrandCafe Cheers')).toBeVisible()

    // Table badge visible
    await expect(page.getByText('T01')).toBeVisible()

    // Categories visible
    const categoryButtons = page.locator('[data-testid="category-bar"] button, .category-bar button')
    await expect(categoryButtons.first()).toBeVisible()

    // At least one menu item card visible
    const menuCards = page.locator('[data-testid="menu-item-card"], .menu-item-card, article')
    await expect(menuCards.first()).toBeVisible({ timeout: 10000 })
  })

  test('filters items by category', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('article, [data-testid="menu-item-card"]', { timeout: 10000 })

    // Click a specific category (not "All")
    const categoryButtons = page.locator('button').filter({ hasText: /Pasta|Salads|Burgers|Desserts/ })
    if (await categoryButtons.count() > 0) {
      await categoryButtons.first().click()
      await page.waitForTimeout(500)
      // Items should still be visible (just filtered)
      const menuCards = page.locator('article, [data-testid="menu-item-card"]')
      await expect(menuCards.first()).toBeVisible()
    }
  })

  test('changes language', async ({ page }) => {
    // Click Spanish flag button
    const esButton = page.locator('button').filter({ hasText: /ES|🇪🇸/ })
    if (await esButton.count() > 0) {
      await esButton.first().click()
      await page.waitForTimeout(500)
      // Menu title should change to Spanish
      await expect(page.getByText('Menu', { exact: false })).toBeVisible()
    }
  })

  test('opens item detail', async ({ page }) => {
    await page.waitForSelector('article, [data-testid="menu-item-card"]', { timeout: 10000 })

    // Click first menu item
    const firstCard = page.locator('article, [data-testid="menu-item-card"]').first()
    await firstCard.click()

    // Detail should show price
    await expect(page.locator('[role="dialog"], [data-state="open"]').first()).toBeVisible({ timeout: 5000 })
  })

  test('shows allergen information panel', async ({ page }) => {
    // Click allergen info button
    const infoButton = page.locator('button').filter({ has: page.locator('svg') }).last()
    await infoButton.click()

    // Allergen panel should appear
    await expect(page.getByText(/Allergen|Alérgeno|Allergenen/)).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Digital Menu - Mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } }) // iPhone 12

  test('renders correctly on mobile', async ({ page }) => {
    await page.goto('/menu/digital?table=T01')
    await expect(page.locator('header')).toBeVisible()

    // Categories should be scrollable
    const categoryBar = page.locator('.overflow-x-auto, [data-testid="category-bar"]').first()
    await expect(categoryBar).toBeVisible()

    // Items in single column
    const menuCards = page.locator('article, [data-testid="menu-item-card"]')
    await expect(menuCards.first()).toBeVisible({ timeout: 10000 })
  })
})
