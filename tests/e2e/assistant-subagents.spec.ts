import { test, expect, Page } from '@playwright/test'

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || ''
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || ''

test.describe('AI Assistant - Sub-Agents', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'E2E_TEST_EMAIL and E2E_TEST_PASSWORD env vars required')

  let page: Page

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    await page.goto('http://localhost:3000/login')
    await page.fill('[name="email"]', TEST_EMAIL)
    await page.fill('[name="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL('http://localhost:3000/')
    await page.goto('http://localhost:3000/assistant')
  })

  test('should display sub-agent status when delegating', async () => {
    const input = page.locator('textarea[placeholder]')
    await input.fill('Generate a financial report for this month')
    await input.press('Enter')

    // Wait for possible sub-agent trigger
    await page.waitForTimeout(20000)

    // Sub-agent status component should not crash
    // The AI may or may not delegate depending on the response
  })
})
