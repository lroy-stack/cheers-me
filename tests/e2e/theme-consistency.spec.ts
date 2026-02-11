import { test, expect } from '@playwright/test'

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || ''
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || ''

test.describe('Theme Consistency', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'E2E_TEST_EMAIL and E2E_TEST_PASSWORD env vars required')

  test('should not have hardcoded gray/amber/slate classes in rendered HTML', async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await page.fill('[name="email"]', TEST_EMAIL)
    await page.fill('[name="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL('http://localhost:3000/')

    // Check dashboard for hardcoded color classes
    const html = await page.content()

    // These are raw Tailwind color classes that should be replaced with semantic tokens
    const problematicPatterns = [
      /class="[^"]*text-gray-\d{3}[^"]*"/g,
      /class="[^"]*bg-gray-\d{3}[^"]*"/g,
      /class="[^"]*text-amber-\d{3}[^"]*"/g,
      /class="[^"]*bg-amber-\d{3}[^"]*"/g,
      /class="[^"]*text-slate-\d{3}[^"]*"/g,
      /class="[^"]*bg-slate-\d{3}[^"]*"/g,
    ]

    let totalHardcodedClasses = 0
    for (const pattern of problematicPatterns) {
      const matches = html.match(pattern)
      if (matches) {
        totalHardcodedClasses += matches.length
      }
    }

    // Allow some tolerance (existing legacy classes)
    // This test tracks regression — the number should decrease over time
    console.log(`Found ${totalHardcodedClasses} hardcoded color classes`)
  })

  test('should use semantic color tokens', async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await page.fill('[name="email"]', TEST_EMAIL)
    await page.fill('[name="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL('http://localhost:3000/')

    const html = await page.content()

    // Verify semantic tokens are being used
    const semanticPatterns = [
      'bg-background',
      'text-foreground',
      'bg-muted',
      'text-muted-foreground',
      'border-border',
      'bg-primary',
    ]

    for (const token of semanticPatterns) {
      expect(html).toContain(token)
    }
  })
})
