import { test, expect } from '@playwright/test'

test.describe('Menu Image Upload', () => {
  // These tests require authentication as manager
  test.skip(true, 'Requires auth setup - run manually with test user')

  test('uploads image for menu item', async ({ page }) => {
    await page.goto('/menu/builder')

    // Select a menu item
    const firstItem = page.locator('tr, [data-testid="menu-item"]').first()
    await firstItem.click()

    // Find upload zone
    const uploadZone = page.locator('[data-testid="image-upload"], .drop-zone, input[type="file"]')
    await expect(uploadZone).toBeVisible()
  })
})
