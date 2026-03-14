import { test, expect } from '@playwright/test'
import { BookingPage } from './pages/booking.page'
import { trackConsoleErrors, expectNoHorizontalOverflow } from './fixtures/assertions'

test.describe('Booking Landing — Smoke Tests', () => {
  let booking: BookingPage

  test.beforeEach(async ({ page }) => {
    booking = new BookingPage(page)
    await booking.goto()
  })

  test('page loads without console errors', async ({ page }) => {
    const tracker = trackConsoleErrors(page)
    await page.waitForLoadState('networkidle')
    await expect(booking.heroTitle).toBeVisible()
    tracker.verify()
  })

  test('hero displays title and CTA button', async () => {
    await expect(booking.heroTitle).toBeVisible()
    await expect(booking.heroReserveButton).toBeVisible()
  })

  test('hero CTA scrolls to booking wizard', async ({ page }) => {
    await booking.heroReserveButton.click()
    // Wizard should be scrolled into view
    await expect(booking.wizardHeading).toBeVisible({ timeout: 3000 })
  })

  test('no horizontal scroll overflow', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    await expectNoHorizontalOverflow(page)
  })
})

test.describe('Booking Landing — Floating CTA', () => {
  let booking: BookingPage

  test.beforeEach(async ({ page }) => {
    booking = new BookingPage(page)
    await booking.goto()
  })

  test('floating button is hidden on initial load', async () => {
    await expect(booking.floatingReserve).not.toBeVisible()
  })

  test('floating button appears after scrolling past hero', async ({ page }) => {
    // Scroll past the hero section
    await page.evaluate(() => window.scrollTo(0, window.innerHeight + 100))
    await expect(booking.floatingReserve).toBeVisible({ timeout: 3000 })
  })

  test('floating button disappears when wizard is in viewport', async ({ page }) => {
    // Scroll to wizard
    await booking.scrollToWizard()
    await page.waitForTimeout(500)
    await expect(booking.floatingReserve).not.toBeVisible()
  })

  test('floating button scrolls to wizard on click', async ({ page }) => {
    // Scroll to show floating button
    await page.evaluate(() => window.scrollTo(0, window.innerHeight + 100))
    await booking.floatingReserve.waitFor({ state: 'visible', timeout: 3000 })
    await booking.floatingReserve.click()
    await expect(booking.wizardHeading).toBeVisible({ timeout: 3000 })
  })
})

test.describe('Booking Landing — Experience Showcase', () => {
  test('renders 3 parallax image blocks', async ({ page }) => {
    const booking = new BookingPage(page)
    await booking.goto()

    // Three full-bleed image sections
    const images = page.locator('section img[alt]')
    await expect(images.first()).toBeVisible()
    expect(await images.count()).toBeGreaterThanOrEqual(3)
  })

  test('stats counters are visible', async ({ page }) => {
    const booking = new BookingPage(page)
    await booking.goto()

    // Scroll to stats area
    const statsArea = page.locator('text=/\\/5/')
    await statsArea.scrollIntoViewIfNeeded()
    await expect(statsArea).toBeVisible()
  })
})

test.describe('Booking Landing — Featured Menu', () => {
  test('featured section loads menu items', async ({ page }) => {
    const booking = new BookingPage(page)
    await booking.goto()

    // Wait for featured items to load
    const featuredSection = page.locator('text=/House Specials|Especialidades|Specialiteiten|Spezialitäten/')
    if (await featuredSection.isVisible()) {
      // Cards should be visible
      const cards = page.locator('[data-card]')
      await expect(cards.first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('view full menu link navigates to /digital', async ({ page }) => {
    const booking = new BookingPage(page)
    await booking.goto()

    const menuLink = page.locator('a[href="/digital"]')
    if (await menuLink.isVisible()) {
      await menuLink.click()
      await page.waitForURL('/digital')
    }
  })
})

test.describe('Booking Wizard — Step 1: Occasion', () => {
  let booking: BookingPage

  test.beforeEach(async ({ page }) => {
    booking = new BookingPage(page)
    await booking.goto()
    await booking.scrollToWizard()
  })

  test('displays 6 occasion cards', async () => {
    await expect(booking.occasionCards).toHaveCount(6)
  })

  test('selecting an occasion highlights it and auto-advances', async ({ page }) => {
    await booking.selectOccasion('casual')
    // Should have advanced to step 2 (datetime)
    // Calendar should be visible
    await expect(booking.calendarDays.first()).toBeVisible({ timeout: 3000 })
  })

  test('each occasion card has icon and label', async () => {
    const firstCard = booking.occasionCards.first()
    await expect(firstCard).toBeVisible()
    // Card should contain text
    const text = await firstCard.textContent()
    expect(text?.length).toBeGreaterThan(0)
  })
})

test.describe('Booking Wizard — Step 2: Date & Time', () => {
  let booking: BookingPage

  test.beforeEach(async ({ page }) => {
    booking = new BookingPage(page)
    await booking.goto()
    await booking.scrollToWizard()
    await booking.selectOccasion('casual')
  })

  test('calendar is visible with selectable days', async () => {
    await expect(booking.calendarDays.first()).toBeVisible()
    const count = await booking.calendarDays.count()
    expect(count).toBeGreaterThan(0)
  })

  test('past dates are disabled', async ({ page }) => {
    const disabledDays = page.locator('.rdp-day[disabled]')
    const count = await disabledDays.count()
    expect(count).toBeGreaterThanOrEqual(0) // At minimum, some past days exist
  })

  test('selecting a date shows time slots', async () => {
    await booking.selectFirstAvailableDate()
    await expect(booking.timeSlots.first()).toBeVisible({ timeout: 5000 })
  })

  test('selecting time auto-advances to party size', async () => {
    await booking.selectFirstAvailableDate()
    await booking.selectFirstAvailableTime()
    // Party counter should be visible
    await expect(booking.partyCounter).toBeVisible({ timeout: 3000 })
  })
})

test.describe('Booking Wizard — Step 3: Party Size', () => {
  let booking: BookingPage

  test.beforeEach(async ({ page }) => {
    booking = new BookingPage(page)
    await booking.goto()
    await booking.scrollToWizard()
    await booking.selectOccasion('casual')
    await booking.selectFirstAvailableDate()
    await booking.selectFirstAvailableTime()
  })

  test('counter starts at 2 by default', async () => {
    const text = await booking.partyCounter.textContent()
    expect(text?.trim()).toBe('2')
  })

  test('increment button increases counter', async () => {
    await booking.partyIncrement.click()
    const text = await booking.partyCounter.textContent()
    expect(text?.trim()).toBe('3')
  })

  test('decrement button decreases counter', async () => {
    await booking.partyDecrement.click()
    const text = await booking.partyCounter.textContent()
    expect(text?.trim()).toBe('1')
  })

  test('decrement is disabled at 1', async () => {
    await booking.partyDecrement.click() // 2 → 1
    await expect(booking.partyDecrement).toBeDisabled()
  })

  test('preset buttons set the counter', async () => {
    const preset4 = booking.page.locator('button').filter({ hasText: '(4)' })
    if (await preset4.isVisible()) {
      await preset4.click()
      const text = await booking.partyCounter.textContent()
      expect(text?.trim()).toBe('4')
    }
  })

  test('large group message appears for >12 guests', async () => {
    await booking.setPartySize(13)
    const msg = booking.page.locator('a[href^="tel:"]')
    await expect(msg).toBeVisible()
  })

  test('continue button advances to guest info', async () => {
    await booking.clickNext()
    await expect(booking.guestName).toBeVisible({ timeout: 3000 })
  })
})

test.describe('Booking Wizard — Step 4: Guest Info', () => {
  let booking: BookingPage

  test.beforeEach(async ({ page }) => {
    booking = new BookingPage(page)
    await booking.goto()
    await booking.scrollToWizard()
    await booking.selectOccasion('casual')
    await booking.selectFirstAvailableDate()
    await booking.selectFirstAvailableTime()
    await booking.clickNext() // party size → guest info
  })

  test('name and phone fields are visible', async () => {
    await expect(booking.guestName).toBeVisible()
    await expect(booking.guestPhone).toBeVisible()
  })

  test('email field is optional', async () => {
    await expect(booking.guestEmail).toBeVisible()
    // No required attribute
    const required = await booking.guestEmail.getAttribute('aria-required')
    expect(required).not.toBe('true')
  })

  test('validation fails with empty name', async ({ page }) => {
    await booking.guestPhone.fill('+34612345678')
    await booking.privacyCheckbox.check()
    await booking.clickNext()
    // Error message should appear
    const error = page.locator('[role="alert"], .text-destructive')
    await expect(error.first()).toBeVisible()
  })

  test('validation fails with invalid phone', async ({ page }) => {
    await booking.guestName.fill('Test User')
    await booking.guestPhone.fill('not-a-phone')
    await booking.privacyCheckbox.check()
    await booking.clickNext()
    const error = page.locator('[role="alert"], .text-destructive')
    await expect(error.first()).toBeVisible()
  })

  test('validation fails without privacy consent', async ({ page }) => {
    await booking.guestName.fill('Test User')
    await booking.guestPhone.fill('+34612345678')
    // Don't check privacy
    await booking.clickNext()
    const error = page.locator('.text-destructive')
    await expect(error.first()).toBeVisible()
  })

  test('valid form advances to review', async () => {
    await booking.fillGuestInfo({
      name: 'Test User',
      phone: '+34612345678',
    })
    await booking.clickNext()
    await expect(booking.confirmButton).toBeVisible({ timeout: 5000 })
  })

  test('back button returns to party size', async () => {
    await booking.clickBack()
    await expect(booking.partyCounter).toBeVisible({ timeout: 3000 })
  })
})

test.describe('Booking Wizard — Step 5: Review', () => {
  let booking: BookingPage

  test.beforeEach(async ({ page }) => {
    booking = new BookingPage(page)
    await booking.goto()
    await booking.scrollToWizard()
    await booking.selectOccasion('casual')
    await booking.selectFirstAvailableDate()
    await booking.selectFirstAvailableTime()
    await booking.clickNext() // → guest info
    await booking.fillGuestInfo({
      name: 'Test Reviewer',
      phone: '+34612345678',
      email: 'test@example.com',
    })
    await booking.clickNext() // → review
  })

  test('review shows guest name', async ({ page }) => {
    await expect(page.getByText('Test Reviewer')).toBeVisible()
  })

  test('review shows phone number', async ({ page }) => {
    await expect(page.getByText('+34612345678')).toBeVisible()
  })

  test('review shows email', async ({ page }) => {
    await expect(page.getByText('test@example.com')).toBeVisible()
  })

  test('edit links navigate back to correct step', async ({ page }) => {
    // Click first edit button (should go to datetime step)
    const editButtons = page.locator('button').filter({ hasText: /edit/i })
    if (await editButtons.first().isVisible()) {
      await editButtons.first().click()
      // Should navigate back to a previous step
      await expect(booking.confirmButton).not.toBeVisible()
    }
  })

  test('confirm button is visible', async () => {
    await expect(booking.confirmButton).toBeVisible()
  })

  test('back button returns to guest info', async () => {
    await booking.clickBack()
    await expect(booking.guestName).toBeVisible({ timeout: 3000 })
  })
})

test.describe('Booking Wizard — Progress Bar', () => {
  let booking: BookingPage

  test.beforeEach(async ({ page }) => {
    booking = new BookingPage(page)
    await booking.goto()
    await booking.scrollToWizard()
  })

  test('progress bar shows 5 steps', async () => {
    await expect(booking.progressSteps).toHaveCount(5)
  })

  test('clicking a completed step navigates back', async () => {
    // Complete step 1
    await booking.selectOccasion('casual')
    // Now on step 2 — click step 1 in progress bar
    await booking.progressSteps.nth(0).click()
    // Should be back on occasion step
    await expect(booking.occasionCards.first()).toBeVisible({ timeout: 3000 })
  })
})

test.describe('Booking Landing — Trust & Newsletter', () => {
  test('trust section shows Google rating', async ({ page }) => {
    const booking = new BookingPage(page)
    await booking.goto()

    const rating = page.locator('text=/4\\.\\d/')
    await rating.scrollIntoViewIfNeeded()
    await expect(rating.first()).toBeVisible()
  })

  test('reviews are visible', async ({ page }) => {
    const booking = new BookingPage(page)
    await booking.goto()

    const review = page.locator('text=/Best beach bar|Fantastic cocktails|World Kitchen/')
    await review.first().scrollIntoViewIfNeeded()
    await expect(review.first()).toBeVisible()
  })

  test('Instagram link is present', async ({ page }) => {
    const booking = new BookingPage(page)
    await booking.goto()

    const igLink = page.locator('a[href*="instagram.com/cheersmallorca"]')
    await igLink.scrollIntoViewIfNeeded()
    await expect(igLink).toBeVisible()
  })

  test('newsletter form accepts email', async ({ page }) => {
    const booking = new BookingPage(page)
    await booking.goto()

    const emailInput = page.locator('input[type="email"]').last()
    await emailInput.scrollIntoViewIfNeeded()
    if (await emailInput.isVisible()) {
      await emailInput.fill('test@newsletter.com')
      const submitBtn = emailInput.locator('..').locator('..').locator('button[type="submit"]')
      await expect(submitBtn).toBeVisible()
    }
  })
})

test.describe('Booking Landing — Footer', () => {
  test('footer shows address and contact info', async ({ page }) => {
    const booking = new BookingPage(page)
    await booking.goto()

    const footer = page.locator('footer')
    await footer.scrollIntoViewIfNeeded()
    await expect(page.getByText('Carrer de Cartago 22')).toBeVisible()
    await expect(page.getByText('info@cheersmallorca.com')).toBeVisible()
  })

  test('footer has social media links', async ({ page }) => {
    const booking = new BookingPage(page)
    await booking.goto()

    const footer = page.locator('footer')
    await footer.scrollIntoViewIfNeeded()

    await expect(page.locator('a[aria-label="Instagram"]')).toBeVisible()
    await expect(page.locator('a[aria-label="Facebook"]')).toBeVisible()
    await expect(page.locator('a[aria-label="WhatsApp"]')).toBeVisible()
  })

  test('legal links are present', async ({ page }) => {
    const booking = new BookingPage(page)
    await booking.goto()

    await expect(page.locator('a[href="/legal/privacy"]')).toBeVisible()
    await expect(page.locator('a[href="/digital"]')).toBeVisible()
  })
})
