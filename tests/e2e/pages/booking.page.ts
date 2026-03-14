import { type Page, type Locator, expect } from '@playwright/test'

/**
 * Page Object for the public booking landing page (/).
 * Encapsulates all selectors and actions for the booking flow.
 */
export class BookingPage {
  readonly page: Page

  // Hero
  readonly heroTitle: Locator
  readonly heroReserveButton: Locator
  readonly languageSelector: Locator

  // Floating CTA
  readonly floatingReserve: Locator

  // Experience Showcase
  readonly experienceBlocks: Locator
  readonly statsSection: Locator

  // Wizard
  readonly wizardSection: Locator
  readonly wizardHeading: Locator
  readonly progressSteps: Locator

  // Step 1: Occasion
  readonly occasionCards: Locator

  // Step 2: DateTime
  readonly calendarDays: Locator
  readonly timeSlots: Locator

  // Step 3: Party Size
  readonly partyCounter: Locator
  readonly partyIncrement: Locator
  readonly partyDecrement: Locator
  readonly partySizeDisplay: Locator
  readonly partyPresets: Locator

  // Step 4: Guest Info
  readonly guestName: Locator
  readonly guestPhone: Locator
  readonly guestEmail: Locator
  readonly privacyCheckbox: Locator

  // Step 5: Review
  readonly confirmButton: Locator

  // Navigation
  readonly nextButton: Locator
  readonly backButton: Locator

  // Trust section
  readonly trustSection: Locator
  readonly newsletterEmail: Locator

  constructor(page: Page) {
    this.page = page

    // Hero
    this.heroTitle = page.locator('[data-testid="hero-title"]')
    this.heroReserveButton = page.locator('[data-testid="hero-reserve-button"]')
    this.languageSelector = page.locator('.glass button, [data-testid="language-selector"]').first()

    // Floating CTA
    this.floatingReserve = page.locator('[data-testid="floating-reserve"]')

    // Experience
    this.experienceBlocks = page.locator('section img[alt]').locator('..')
    this.statsSection = page.locator('[data-testid="stats-section"]')

    // Wizard
    this.wizardSection = page.locator('#booking-wizard')
    this.wizardHeading = page.locator('[data-testid="wizard-heading"]')
    this.progressSteps = page.locator('[data-testid^="progress-step-"]')

    // Step 1
    this.occasionCards = page.locator('[data-testid^="occasion-card-"]')

    // Step 2
    this.calendarDays = page.locator('button[name="day"]:not([disabled]), .rdp-day:not([disabled]):not(.rdp-day_outside), td[role="gridcell"] button:not([disabled])')
    this.timeSlots = page.locator('[data-testid^="time-slot-"]')

    // Step 3
    this.partyCounter = page.locator('[data-testid="party-counter"]')
    this.partyIncrement = page.locator('[data-testid="party-increment"]')
    this.partyDecrement = page.locator('[data-testid="party-decrement"]')
    this.partySizeDisplay = page.locator('[data-testid="party-size-display"]')
    this.partyPresets = page.locator('button').filter({ hasText: /\(\d+\)/ })

    // Step 4
    this.guestName = page.locator('#guest_name')
    this.guestPhone = page.locator('#guest_phone')
    this.guestEmail = page.locator('#guest_email')
    this.privacyCheckbox = page.locator('input[type="checkbox"]').first()

    // Step 5
    this.confirmButton = page.locator('[data-testid="confirm-booking"]')

    // Navigation
    this.nextButton = page.locator('[data-testid="wizard-next"]')
    this.backButton = page.locator('[data-testid="wizard-back"]')

    // Trust
    this.trustSection = page.locator('section').filter({ has: page.locator('text=Google') })
    this.newsletterEmail = page.locator('input[type="email"]').last()
  }

  async goto() {
    await this.page.goto('/')
    await this.page.waitForLoadState('domcontentloaded')
  }

  async scrollToWizard() {
    await this.wizardSection.scrollIntoViewIfNeeded()
    await this.wizardHeading.waitFor({ state: 'visible', timeout: 5000 })
  }

  async selectOccasion(type: string) {
    await this.page.locator(`[data-testid="occasion-card-${type}"]`).click()
    // Wait for auto-advance animation
    await this.page.waitForTimeout(400)
  }

  async selectFirstAvailableDate() {
    const day = this.calendarDays.first()
    await day.waitFor({ state: 'visible', timeout: 5000 })
    await day.click()
  }

  async selectFirstAvailableTime() {
    const slot = this.timeSlots.first()
    await slot.waitFor({ state: 'visible', timeout: 5000 })
    await slot.click()
    // Wait for auto-advance
    await this.page.waitForTimeout(400)
  }

  async setPartySize(size: number) {
    // Click appropriate preset if available
    const preset = this.page.locator('button').filter({ hasText: `(${size})` })
    if (await preset.isVisible()) {
      await preset.click()
    } else {
      // Manual increment/decrement
      const currentText = await this.partyCounter.textContent()
      const current = parseInt(currentText || '2')
      const diff = size - current
      const button = diff > 0 ? this.partyIncrement : this.partyDecrement
      for (let i = 0; i < Math.abs(diff); i++) {
        await button.click()
      }
    }
  }

  async fillGuestInfo(data: {
    name: string
    phone: string
    email?: string
    specialRequests?: string
  }) {
    await this.guestName.fill(data.name)
    await this.guestPhone.fill(data.phone)
    if (data.email) {
      await this.guestEmail.fill(data.email)
    }
    if (data.specialRequests) {
      await this.page.locator('textarea').fill(data.specialRequests)
    }
    // Accept privacy
    await this.privacyCheckbox.check()
  }

  async clickNext() {
    await this.nextButton.click()
  }

  async clickBack() {
    await this.backButton.click()
  }

  async switchLanguage(lang: 'EN' | 'NL' | 'ES' | 'DE') {
    const btn = this.page.locator('button').filter({ hasText: lang })
    if (await btn.isVisible()) {
      await btn.first().click()
      await this.page.waitForTimeout(300)
    }
  }

  /** Get the current step index from the progress bar */
  async getCurrentStep(): Promise<number> {
    const steps = await this.progressSteps.count()
    for (let i = 0; i < steps; i++) {
      const step = this.progressSteps.nth(i)
      const classes = await step.locator('div').first().getAttribute('class') || ''
      if (classes.includes('ring-')) return i
    }
    return 0
  }
}
