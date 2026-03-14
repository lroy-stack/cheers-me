import { type Page, expect } from '@playwright/test'

/**
 * Collect console errors during a test. Call verify() at the end.
 * Ignores React hydration warnings and expected errors.
 */
export function trackConsoleErrors(page: Page) {
  const errors: string[] = []

  const IGNORED_PATTERNS = [
    'hydration',
    'Hydration',
    'NEXT_REDIRECT',
    'ChunkLoadError',
    'Loading chunk',
    'Failed to fetch',  // expected in offline tests
  ]

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      if (!IGNORED_PATTERNS.some((p) => text.includes(p))) {
        errors.push(text)
      }
    }
  })

  page.on('pageerror', (err) => {
    if (!IGNORED_PATTERNS.some((p) => err.message.includes(p))) {
      errors.push(`PAGE ERROR: ${err.message}`)
    }
  })

  return {
    get errors() { return errors },
    verify() {
      if (errors.length > 0) {
        console.warn('Console errors found:', errors)
      }
      expect(errors).toHaveLength(0)
    },
  }
}

/**
 * Assert a toast notification appeared with the given text.
 */
export async function expectToast(page: Page, text: string | RegExp, timeout = 5000) {
  // Sonner toast or shadcn toast
  const toast = page.locator('[data-sonner-toast], [role="status"], [data-toast]')
    .filter({ hasText: text })
  await expect(toast.first()).toBeVisible({ timeout })
}

/**
 * Assert no horizontal scroll overflow on the page.
 */
export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth
  })
  expect(overflow).toBe(false)
}

/**
 * Assert an element meets minimum touch target size (44x44px WCAG).
 */
export async function expectTouchTarget(page: Page, selector: string, minSize = 44) {
  const box = await page.locator(selector).first().boundingBox()
  expect(box).not.toBeNull()
  if (box) {
    expect(box.width).toBeGreaterThanOrEqual(minSize)
    expect(box.height).toBeGreaterThanOrEqual(minSize)
  }
}

/**
 * Assert the page loaded within acceptable time.
 */
export async function expectFastLoad(page: Page, maxMs = 3000) {
  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    return nav ? nav.loadEventEnd - nav.startTime : 0
  })
  expect(timing).toBeLessThan(maxMs)
}

/**
 * Wait for network to be idle (no pending requests for 500ms).
 */
export async function waitForNetworkIdle(page: Page, timeout = 10000) {
  await page.waitForLoadState('networkidle', { timeout })
}
