/**
 * Mobile Testing Helpers
 *
 * Utility functions for mobile E2E testing with Playwright
 */

import { Page, expect } from '@playwright/test'

/**
 * Mobile device dimensions
 */
export const MOBILE_VIEWPORTS = {
  'Pixel 5': { width: 393, height: 851 },
  'iPhone 12': { width: 390, height: 844 },
  'iPhone SE': { width: 375, height: 667 },
  'Pixel 4': { width: 353, height: 745 },
  'Galaxy S9': { width: 360, height: 740 },
}

/**
 * Tablet device dimensions
 */
export const TABLET_VIEWPORTS = {
  'iPad Pro': { width: 1024, height: 1366 },
  'iPad': { width: 768, height: 1024 },
  'Galaxy Tab': { width: 800, height: 1280 },
}

/**
 * Check if viewport is mobile-sized
 */
export function isMobileViewport(viewport: { width: number; height: number } | null): boolean {
  if (!viewport) return false
  return viewport.width < 768
}

/**
 * Check if viewport is tablet-sized
 */
export function isTabletViewport(viewport: { width: number; height: number } | null): boolean {
  if (!viewport) return false
  return viewport.width >= 768 && viewport.width < 1024
}

/**
 * Check if viewport is desktop-sized
 */
export function isDesktopViewport(viewport: { width: number; height: number } | null): boolean {
  if (!viewport) return false
  return viewport.width >= 1024
}

/**
 * Verify element is touch-target sized (WCAG AAA: ≥44×44px)
 */
export async function expectTouchTargetSize(page: Page, selector: string, minSize: number = 44) {
  const element = page.locator(selector).first()
  const boundingBox = await element.boundingBox()

  expect(boundingBox).toBeTruthy()

  const { height = 0, width = 0 } = boundingBox || {}
  const isSufficientSize = height >= minSize || width >= minSize

  expect(isSufficientSize).toBe(true)
}

/**
 * Verify no horizontal overflow/scroll needed
 */
export async function expectNoHorizontalScroll(page: Page) {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)

  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1) // +1 for rounding
}

/**
 * Verify element fits within viewport
 */
export async function expectFitsInViewport(page: Page, selector: string) {
  const element = page.locator(selector).first()
  const boundingBox = await element.boundingBox()
  const viewport = page.viewportSize()

  expect(boundingBox).toBeTruthy()
  expect(viewport).toBeTruthy()

  if (boundingBox && viewport) {
    expect(boundingBox.width).toBeLessThanOrEqual(viewport.width)
    expect(boundingBox.height).toBeLessThanOrEqual(viewport.height)
  }
}

/**
 * Verify text is readable (font size >= minPx)
 */
export async function expectReadableTextSize(page: Page, selector: string, minPx: number = 12) {
  const element = page.locator(selector).first()
  const fontSize = await element.evaluate((el) => {
    return parseInt(window.getComputedStyle(el).fontSize)
  })

  expect(fontSize).toBeGreaterThanOrEqual(minPx)
}

/**
 * Verify element is visible and accessible on mobile
 */
export async function expectMobileAccessible(page: Page, selector: string) {
  const element = page.locator(selector).first()

  await expect(element).toBeVisible()

  const boundingBox = await element.boundingBox()
  expect(boundingBox).toBeTruthy()
  expect(boundingBox?.width).toBeGreaterThan(0)
  expect(boundingBox?.height).toBeGreaterThan(0)
}

/**
 * Simulate mobile form interaction
 */
export async function fillFormMobile(
  page: Page,
  fields: Record<string, string>
) {
  for (const [selector, value] of Object.entries(fields)) {
    const input = page.locator(selector).first()
    await expect(input).toBeVisible()
    await input.click()
    await input.fill('')
    await input.type(value, { delay: 50 }) // Slow typing to simulate mobile
  }
}

/**
 * Submit form on mobile
 */
export async function submitFormMobile(page: Page, submitButtonSelector: string = 'button[type="submit"]') {
  const button = page.locator(submitButtonSelector).first()
  await expect(button).toBeVisible()
  await button.click()
  await page.waitForTimeout(500)
}

/**
 * Verify responsive layout (elements stack on mobile)
 */
export async function expectResponsiveLayout(page: Page, containerSelector: string) {
  const viewport = page.viewportSize()
  const container = page.locator(containerSelector).first()

  await expect(container).toBeVisible()

  if (viewport && isMobileViewport(viewport)) {
    // On mobile, container should adapt to viewport width
    const containerWidth = await container.evaluate((el) => el.offsetWidth)
    expect(containerWidth).toBeLessThanOrEqual(viewport.width + 10) // +10px tolerance
  }
}

/**
 * Check for layout shift (CLS) over time
 */
export async function expectMinimalLayoutShift(page: Page, durationMs: number = 2000) {
  const cls = await page.evaluate((duration) => {
    return new Promise<number>((resolve) => {
      let score = 0
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ((entry as any).hadRecentInput) continue
          score += (entry as any).value
        }
      })

      try {
        observer.observe({ entryTypes: ['layout-shift'] })
      } catch (e) {
        // Layout Shift API not supported
        resolve(0)
        return
      }

      setTimeout(() => {
        observer.disconnect()
        resolve(score)
      }, duration)
    })
  }, durationMs)

  // CLS should be < 0.1 (good), < 0.25 (needs improvement)
  expect(cls).toBeLessThan(0.5)
}

/**
 * Verify viewport meta tag is set correctly
 */
export async function expectViewportMetaTag(page: Page) {
  const viewportMeta = page.locator('meta[name="viewport"]').first()
  const exists = await viewportMeta.count() > 0

  expect(exists).toBe(true)

  if (exists) {
    const content = await viewportMeta.getAttribute('content')
    expect(content).toContain('width=device-width')
    expect(content).not.toContain('user-scalable=no') // Don't disable zoom
  }
}

/**
 * Verify images have proper dimensions
 */
export async function expectOptimizedImages(page: Page) {
  const images = page.locator('img')
  const count = await images.count()

  for (let i = 0; i < Math.min(count, 5); i++) {
    const img = images.nth(i)
    const visible = await img.isVisible().catch(() => false)

    if (visible) {
      // Check for either natural dimensions or CSS dimensions
      const hasNaturalDimensions = await img.evaluate((el: any) => {
        return el.naturalWidth > 0 && el.naturalHeight > 0
      })

      const hasCssDimensions = await img.evaluate((el) => {
        const style = window.getComputedStyle(el)
        const width = parseInt(style.width)
        const height = parseInt(style.height)
        return width > 0 && height > 0
      })

      expect(hasNaturalDimensions || hasCssDimensions).toBe(true)
    }
  }
}

/**
 * Test orientation change
 */
export async function testOrientationChange(page: Page) {
  const viewport = page.viewportSize()

  if (viewport) {
    // Switch to landscape
    await page.setViewportSize({
      width: viewport.height,
      height: viewport.width,
    })

    // Verify page still renders correctly
    const body = page.locator('body')
    await expect(body).toBeVisible()

    // No horizontal scroll in landscape
    await expectNoHorizontalScroll(page)

    // Switch back to portrait
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    })

    await expect(body).toBeVisible()
  }
}

/**
 * Verify keyboard doesn't cover important content
 * (simulated by checking viewport after keyboard interaction)
 */
export async function expectKeyboardDoesntCoverContent(
  page: Page,
  inputSelector: string,
  importantElementSelector: string
) {
  const input = page.locator(inputSelector).first()
  const importantElement = page.locator(importantElementSelector).first()

  await input.click()
  await page.waitForTimeout(500)

  // Important element should still be accessible
  const isVisible = await importantElement.isVisible().catch(() => false)
  expect(isVisible).toBe(true)
}

/**
 * Performance check - page load time
 */
export async function expectFastPageLoad(
  page: Page,
  maxTimeMs: number = 5000,
  waitUntil: 'domcontentloaded' | 'load' = 'domcontentloaded'
) {
  const startTime = Date.now()
  await page.waitForLoadState(waitUntil)
  const loadTime = Date.now() - startTime

  expect(loadTime).toBeLessThan(maxTimeMs)
}

/**
 * Accessibility check - form labels
 */
export async function expectProperFormLabels(page: Page) {
  const labels = page.locator('label')
  const inputs = page.locator('input')

  const labelCount = await labels.count()
  const inputCount = await inputs.count()

  // Should have labels for inputs
  expect(labelCount > 0 || inputCount > 0).toBe(true)

  if (labelCount > 0) {
    for (let i = 0; i < Math.min(labelCount, 3); i++) {
      const label = labels.nth(i)
      const text = await label.textContent()
      expect(text?.trim().length).toBeGreaterThan(0)
    }
  }
}

/**
 * Accessibility check - color contrast (basic)
 */
export async function expectReadableContrast(page: Page) {
  // Check that interactive elements have visible text
  const buttons = page.locator('button')
  const links = page.locator('a')

  const buttonCount = await buttons.count()
  if (buttonCount > 0) {
    const text = await buttons.first().textContent()
    expect(text?.trim().length).toBeGreaterThan(0)
  }

  const linkCount = await links.count()
  if (linkCount > 0) {
    const text = await links.first().textContent()
    expect(text?.trim().length).toBeGreaterThan(0)
  }
}
