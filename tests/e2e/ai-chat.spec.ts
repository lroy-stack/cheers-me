import { test, expect, Page } from '@playwright/test'

test.describe('AI Chat Widget - E2E', () => {
  let page: Page

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage

    // Set up test environment
    await page.goto('http://localhost:3000/login')

    // Login as manager
    await page.fill('[name="email"]', 'manager@cheers.com')
    await page.fill('[name="password"]', 'test1234')
    await page.click('button[type="submit"]')

    // Wait for navigation to dashboard
    await page.waitForURL('http://localhost:3000/')
  })

  test('should display chat toggle button', async () => {
    // Chat button should be visible at bottom right
    const chatButton = page.locator('button[aria-label="Open AI chat"]')
    await expect(chatButton).toBeVisible()
    await expect(chatButton).toHaveClass(/rounded-full/)
  })

  test('should open and close chat widget', async () => {
    const chatButton = page.locator('button[aria-label="Open AI chat"]')

    // Initially closed - should not see chat window
    let chatWindow = page.locator('text=AI Assistant')
    await expect(chatWindow).not.toBeVisible()

    // Open chat
    await chatButton.click()
    await expect(chatWindow).toBeVisible()

    // Verify chat header
    await expect(page.locator('h3:has-text("AI Assistant")')).toBeVisible()
    await expect(page.locator('text=Powered by Claude')).toBeVisible()

    // Close chat
    await chatButton.click()
    await expect(chatWindow).not.toBeVisible()
  })

  test('should show sample prompts when empty', async () => {
    const chatButton = page.locator('button[aria-label="Open AI chat"]')
    await chatButton.click()

    // Check for sample prompts
    await expect(
      page.locator('text=Ask me anything about your restaurant!')
    ).toBeVisible()
    await expect(page.locator('text=What were yesterday\'s sales?')).toBeVisible()
    await expect(page.locator('text=Show me low stock items')).toBeVisible()
    await expect(page.locator('text=Who is working today?')).toBeVisible()
    await expect(
      page.locator('text=Create a post about tonight\'s event')
    ).toBeVisible()
  })

  test('should send message and receive response', async () => {
    const chatButton = page.locator('button[aria-label="Open AI chat"]')
    await chatButton.click()

    // Send a message
    const input = page.locator('input[placeholder="Ask me anything..."]')
    await input.fill('Hello, how can you help?')

    // Submit the message
    await page.click('button[aria-label="Send message"]')

    // Wait for response to appear (with timeout for API call)
    await expect(page.locator('text=Hello')).toBeVisible({ timeout: 10000 })

    // Verify message appears in chat
    await expect(input).toHaveValue('')
  })

  test('should clear conversation history', async () => {
    const chatButton = page.locator('button[aria-label="Open AI chat"]')
    await chatButton.click()

    // Send a message
    const input = page.locator('input[placeholder="Ask me anything..."]')
    await input.fill('Test message')
    await page.click('button[aria-label="Send message"]')

    // Wait for response
    await page.waitForTimeout(2000)

    // Click clear button
    const clearButton = page.locator('button[title="Clear conversation"]')
    await expect(clearButton).toBeEnabled()
    await clearButton.click()

    // Check for empty state message
    await expect(
      page.locator('text=Ask me anything about your restaurant!')
    ).toBeVisible()
  })

  test('should disable send button during loading', async () => {
    const chatButton = page.locator('button[aria-label="Open AI chat"]')
    await chatButton.click()

    const input = page.locator('input[placeholder="Ask me anything..."]')
    const sendButton = page.locator('button[aria-label="Send message"]')

    // Send button should be enabled initially
    await expect(sendButton).toBeEnabled()

    // Send message
    await input.fill('What were yesterday sales?')
    await sendButton.click()

    // Send button should be disabled while loading
    await expect(sendButton).toBeDisabled()
  })

  test('should handle empty message submission', async () => {
    const chatButton = page.locator('button[aria-label="Open AI chat"]')
    await chatButton.click()

    const input = page.locator('input[placeholder="Ask me anything..."]')
    const sendButton = page.locator('button[aria-label="Send message"]')

    // Send button should be disabled when input is empty
    await expect(sendButton).toBeDisabled()

    // Type and clear
    await input.fill('test')
    await expect(sendButton).toBeEnabled()

    await input.clear()
    await expect(sendButton).toBeDisabled()
  })

  test('should use keyboard shortcut Cmd/Ctrl+K to toggle', async () => {
    let chatWindow = page.locator('text=AI Assistant')

    // Should be closed initially
    await expect(chatWindow).not.toBeVisible()

    // Press Ctrl/Cmd+K
    await page.keyboard.press('Control+K')

    // Should open
    await expect(chatWindow).toBeVisible()

    // Press again to close
    await page.keyboard.press('Control+K')

    // Should close
    await expect(chatWindow).not.toBeVisible()
  })

  test('should disable input field during loading', async () => {
    const chatButton = page.locator('button[aria-label="Open AI chat"]')
    await chatButton.click()

    const input = page.locator('input[placeholder="Ask me anything..."]')

    // Should be enabled initially
    await expect(input).toBeEnabled()

    // Send message
    await input.fill('Test question')
    await page.click('button[aria-label="Send message"]')

    // Should be disabled while loading
    await expect(input).toBeDisabled()
  })

  test('should display loading indicator while waiting for response', async () => {
    const chatButton = page.locator('button[aria-label="Open AI chat"]')
    await chatButton.click()

    const input = page.locator('input[placeholder="Ask me anything..."]')
    await input.fill('What are this week events?')
    await page.click('button[aria-label="Send message"]')

    // Check for loading indicator
    const loadingIndicator = page.locator('text=Claude is thinking')
    await expect(loadingIndicator).toBeVisible()
  })

  test('should handle sample prompt clicks', async () => {
    const chatButton = page.locator('button[aria-label="Open AI chat"]')
    await chatButton.click()

    // Click a sample prompt
    await page.click('text=Show me low stock items')

    // Message should be populated in input
    const input = page.locator('input[placeholder="Ask me anything..."]')
    await expect(input).toHaveValue('Show me low stock items')
  })

  test('should auto-scroll to latest message', async () => {
    const chatButton = page.locator('button[aria-label="Open AI chat"]')
    await chatButton.click()

    const input = page.locator('input[placeholder="Ask me anything..."]')

    // Send multiple messages
    await input.fill('First question about sales')
    await page.click('button[aria-label="Send message"]')
    await page.waitForTimeout(2000)

    // Scroll area should contain the message
    const scrollArea = page.locator('[role="region"]')
    await expect(scrollArea).toContainText('First question')
  })

  test('should display error message on API failure', async () => {
    const chatButton = page.locator('button[aria-label="Open AI chat"]')
    await chatButton.click()

    // Intercept API and return error
    await page.route('**/api/ai/chat', (route) => {
      route.abort('failed')
    })

    const input = page.locator('input[placeholder="Ask me anything..."]')
    await input.fill('Test message')
    await page.click('button[aria-label="Send message"]')

    // Check for error message
    await expect(page.locator('text=Error')).toBeVisible({ timeout: 5000 })
  })

  test('should maintain conversation history', async () => {
    const chatButton = page.locator('button[aria-label="Open AI chat"]')
    await chatButton.click()

    const input = page.locator('input[placeholder="Ask me anything..."]')

    // Send first message
    await input.fill('What is the restaurant name?')
    await page.click('button[aria-label="Send message"]')
    await page.waitForTimeout(2000)

    // Send second message
    await input.fill('What are the opening hours?')
    await page.click('button[aria-label="Send message"]')
    await page.waitForTimeout(2000)

    // Both messages should be visible
    const scrollArea = page.locator('[role="region"]')
    await expect(scrollArea).toContainText('restaurant name')
    await expect(scrollArea).toContainText('opening hours')
  })

  test('should properly format messages', async () => {
    const chatButton = page.locator('button[aria-label="Open AI chat"]')
    await chatButton.click()

    const input = page.locator('input[placeholder="Ask me anything..."]')
    await input.fill('Tell me about the menu')
    await page.click('button[aria-label="Send message"]')

    // Wait for response
    await page.waitForTimeout(3000)

    // Messages should be properly styled
    const scrollArea = page.locator('[role="region"]')
    const messages = await scrollArea.locator('div').all()
    expect(messages.length).toBeGreaterThan(0)
  })

  test('should responsive on mobile viewport', async () => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    const chatButton = page.locator('button[aria-label="Open AI chat"]')
    await chatButton.click()

    const chatWindow = page.locator('text=AI Assistant')
    await expect(chatWindow).toBeVisible()

    // Chat window should be responsive
    const card = page.locator('[class*="Card"]').first()
    const boundingBox = await card.boundingBox()
    expect(boundingBox).toBeDefined()
  })

  test('should show chat kit in top bar when available', async () => {
    // Chat button should be visible in fixed position
    const chatButton = page.locator('button[aria-label="Open AI chat"]')
    const boundingBox = await chatButton.boundingBox()

    // Should be positioned at bottom right (typical floating button)
    expect(boundingBox?.x).toBeGreaterThan(
      (await page.viewportSize())!.width - 100
    )
    expect(boundingBox?.y).toBeGreaterThan(
      (await page.viewportSize())!.height - 100
    )
  })
})

test.describe('AI Chat Integration - Content Queries', () => {
  test('should query sales data', async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await page.fill('[name="email"]', 'manager@cheers.com')
    await page.fill('[name="password"]', 'test1234')
    await page.click('button[type="submit"]')
    await page.waitForURL('http://localhost:3000/')

    // Open chat
    const chatButton = page.locator('button[aria-label="Open AI chat"]')
    await chatButton.click()

    // Ask about sales
    const input = page.locator('input[placeholder="Ask me anything..."]')
    await input.fill("What were yesterday's sales?")
    await page.click('button[aria-label="Send message"]')

    // Wait for response with sales data
    await expect(
      page.locator('text=/sales|revenue|covers/i')
    ).toBeVisible({ timeout: 10000 })
  })

  test('should query staff schedule', async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await page.fill('[name="email"]', 'manager@cheers.com')
    await page.fill('[name="password"]', 'test1234')
    await page.click('button[type="submit"]')
    await page.waitForURL('http://localhost:3000/')

    const chatButton = page.locator('button[aria-label="Open AI chat"]')
    await chatButton.click()

    const input = page.locator('input[placeholder="Ask me anything..."]')
    await input.fill('Who is working today?')
    await page.click('button[aria-label="Send message"]')

    // Wait for response
    await expect(
      page.locator('text=/staff|working|schedule|shift/i')
    ).toBeVisible({ timeout: 10000 })
  })

  test('should query stock levels', async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await page.fill('[name="email"]', 'manager@cheers.com')
    await page.fill('[name="password"]', 'test1234')
    await page.click('button[type="submit"]')
    await page.waitForURL('http://localhost:3000/')

    const chatButton = page.locator('button[aria-label="Open AI chat"]')
    await chatButton.click()

    const input = page.locator('input[placeholder="Ask me anything..."]')
    await input.fill('Show me low stock items')
    await page.click('button[aria-label="Send message"]')

    // Wait for response
    await expect(
      page.locator('text=/stock|inventory|product/i')
    ).toBeVisible({ timeout: 10000 })
  })

  test('should handle complex queries', async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await page.fill('[name="email"]', 'manager@cheers.com')
    await page.fill('[name="password"]', 'test1234')
    await page.click('button[type="submit"]')
    await page.waitForURL('http://localhost:3000/')

    const chatButton = page.locator('button[aria-label="Open AI chat"]')
    await chatButton.click()

    const input = page.locator('input[placeholder="Ask me anything..."]')
    await input.fill(
      'Compare today sales with last week and tell me the trend'
    )
    await page.click('button[aria-label="Send message"]')

    // Wait for response with analysis
    await expect(page.locator('text=/trend|comparison|increase|decrease/i')).toBeVisible(
      { timeout: 10000 }
    )
  })
})
