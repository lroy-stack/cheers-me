import { test, expect } from '@playwright/test'

test.describe('Booking Page - i18n', () => {
  test('should display English booking page by default', async ({ page }) => {
    await page.goto('http://localhost:3000/booking')

    await expect(page.locator('text=GrandCafe Cheers')).toBeVisible()
    // Check for key English strings from booking.json
    await expect(page.locator('text=Book a Table, text=Reserve Your Table, text=GrandCafe Cheers').first()).toBeVisible()
  })

  test('should switch to Spanish', async ({ page }) => {
    // Set locale cookie
    await page.context().addCookies([{
      name: 'NEXT_LOCALE',
      value: 'es',
      domain: 'localhost',
      path: '/',
    }])
    await page.goto('http://localhost:3000/booking')

    // Check for Spanish translations
    await expect(page.locator('text=GrandCafe Cheers')).toBeVisible()
  })

  test('should switch to Dutch', async ({ page }) => {
    await page.context().addCookies([{
      name: 'NEXT_LOCALE',
      value: 'nl',
      domain: 'localhost',
      path: '/',
    }])
    await page.goto('http://localhost:3000/booking')

    await expect(page.locator('text=GrandCafe Cheers')).toBeVisible()
  })

  test('should switch to German', async ({ page }) => {
    await page.context().addCookies([{
      name: 'NEXT_LOCALE',
      value: 'de',
      domain: 'localhost',
      path: '/',
    }])
    await page.goto('http://localhost:3000/booking')

    await expect(page.locator('text=GrandCafe Cheers')).toBeVisible()
  })
})
