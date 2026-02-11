import { test, expect, Page } from '@playwright/test'

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || ''
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || ''

test.describe('AI Assistant Page - Chat', () => {
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

  test('should display assistant page with layout', async () => {
    await expect(page.locator('text=AI Assistant')).toBeVisible()
    await expect(page.locator('text=New Chat')).toBeVisible()
    await expect(page.locator('textarea[placeholder]')).toBeVisible()
  })

  test('should show welcome screen on new chat', async () => {
    await expect(page.locator('text=How can I help?')).toBeVisible()
    await expect(page.locator('text=Powered by Claude')).toBeVisible()
  })

  test('should send a message and receive streaming response', async () => {
    const input = page.locator('textarea[placeholder]')
    await input.fill('Hello')
    await input.press('Enter')

    // User message should appear
    await expect(page.locator('text=Hello')).toBeVisible()

    // Wait for assistant response
    await expect(page.locator('[class*="bot"], [class*="Bot"]').first()).toBeVisible({ timeout: 15000 })
  })

  test('should create a new conversation', async () => {
    const newChatBtn = page.locator('button:has-text("New Chat")')
    await newChatBtn.click()
    await expect(page.locator('text=How can I help?')).toBeVisible()
  })
})
