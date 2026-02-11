import { test, expect } from '@playwright/test'

test.describe('Kiosk Flow', () => {
  test('should display idle screen with clock and logo', async ({ page }) => {
    await page.goto('http://localhost:3000/kiosk')

    // Clock should be visible (HH:mm format)
    await expect(page.locator('.font-mono')).toBeVisible()

    // Logo should be visible
    const logo = page.locator('img[alt="GrandCafe Cheers"]')
    await expect(logo).toBeVisible()

    // Touch to begin text should be visible
    const touchPrompt = page.locator('text=Touch, text=Tap, text=touch').first()
    await expect(touchPrompt).toBeVisible({ timeout: 5000 })
  })

  test('should navigate to PIN pad on touch', async ({ page }) => {
    await page.goto('http://localhost:3000/kiosk')

    // Touch the idle screen
    await page.click('.min-h-screen')

    // PIN pad should appear
    await page.waitForTimeout(1000)
    // Look for number buttons (0-9) typical of PIN pad
    const numberButton = page.locator('button:has-text("1")').first()
    await expect(numberButton).toBeVisible({ timeout: 5000 })
  })

  test('should display date in localized format', async ({ page }) => {
    await page.goto('http://localhost:3000/kiosk')

    // Date should be visible (format: day of week, date)
    const dateElement = page.locator('.text-2xl, .text-xl').filter({ hasText: /\w+,\s\d+/ })
    await expect(dateElement.first()).toBeVisible({ timeout: 5000 })
  })
})
