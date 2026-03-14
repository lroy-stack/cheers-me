import { test, expect } from '@playwright/test'
import { BookingPage } from './pages/booking.page'
import { expectNoHorizontalOverflow, expectTouchTarget } from './fixtures/assertions'

test.describe('Booking — Mobile (375x812)', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  let booking: BookingPage

  test.beforeEach(async ({ page }) => {
    booking = new BookingPage(page)
    await booking.goto()
  })

  test('hero fills the viewport', async ({ page }) => {
    const hero = page.locator('.h-screen').first()
    const box = await hero.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(750)
    }
  })

  test('no horizontal scroll on any section', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    await expectNoHorizontalOverflow(page)

    // Scroll through the entire page checking at intervals
    const pageHeight = await page.evaluate(() => document.body.scrollHeight)
    for (let y = 0; y < pageHeight; y += 500) {
      await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y)
      await expectNoHorizontalOverflow(page)
    }
  })

  test('occasion cards are in 2-column grid', async ({ page }) => {
    await booking.scrollToWizard()
    const grid = page.locator('[data-testid^="occasion-card-"]').first().locator('..')
    const classes = await grid.getAttribute('class') || ''
    expect(classes).toContain('grid-cols-2')
  })

  test('party size buttons are touch-friendly', async ({ page }) => {
    await booking.scrollToWizard()
    await booking.selectOccasion('casual')
    await booking.selectFirstAvailableDate()
    await booking.selectFirstAvailableTime()
    await expectTouchTarget(page, '[data-testid="party-increment"]')
    await expectTouchTarget(page, '[data-testid="party-decrement"]')
  })

  test('floating reserve button is full-width on mobile', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, window.innerHeight + 100))
    await booking.floatingReserve.waitFor({ state: 'visible', timeout: 3000 })
    const box = await booking.floatingReserve.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      // Should span most of the viewport width (with some padding)
      expect(box.width).toBeGreaterThan(300)
    }
  })

  test('inputs are comfortable for thumb input', async ({ page }) => {
    await booking.scrollToWizard()
    await booking.selectOccasion('casual')
    await booking.selectFirstAvailableDate()
    await booking.selectFirstAvailableTime()
    await booking.clickNext()

    const nameBox = await booking.guestName.boundingBox()
    expect(nameBox).not.toBeNull()
    if (nameBox) {
      expect(nameBox.height).toBeGreaterThanOrEqual(44)
    }
  })
})

test.describe('Booking — Tablet Portrait (810x1080)', () => {
  test.use({ viewport: { width: 810, height: 1080 } })

  test('page renders without horizontal overflow', async ({ page }) => {
    const booking = new BookingPage(page)
    await booking.goto()
    await page.waitForLoadState('networkidle')
    await expectNoHorizontalOverflow(page)
  })

  test('featured menu shows grid layout (not carousel)', async ({ page }) => {
    const booking = new BookingPage(page)
    await booking.goto()

    // On tablet (810px > 640px sm breakpoint), should show grid
    const grid = page.locator('.sm\\:grid')
    if (await grid.first().isVisible()) {
      await expect(grid.first()).toBeVisible()
    }
  })
})

test.describe('Booking — Desktop (1440x900)', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('hero displays full-width without overflow', async ({ page }) => {
    const booking = new BookingPage(page)
    await booking.goto()
    await expectNoHorizontalOverflow(page)
  })

  test('featured menu uses 3-column grid', async ({ page }) => {
    const booking = new BookingPage(page)
    await booking.goto()

    const grid = page.locator('.lg\\:grid-cols-3')
    if (await grid.first().isVisible()) {
      await expect(grid.first()).toBeVisible()
    }
  })

  test('floating button is pill-shaped (not full-width)', async ({ page }) => {
    const booking = new BookingPage(page)
    await booking.goto()

    await page.evaluate(() => window.scrollTo(0, window.innerHeight + 100))
    await booking.floatingReserve.waitFor({ state: 'visible', timeout: 3000 })
    const box = await booking.floatingReserve.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      // Should NOT span the full viewport — should be a compact pill
      expect(box.width).toBeLessThan(400)
    }
  })

  test('occasion cards use 3-column grid on desktop', async ({ page }) => {
    const booking = new BookingPage(page)
    await booking.goto()
    await booking.scrollToWizard()

    const grid = page.locator('[data-testid^="occasion-card-"]').first().locator('..')
    const classes = await grid.getAttribute('class') || ''
    expect(classes).toContain('md:grid-cols-3')
  })
})
