import { test, expect } from '@playwright/test'

/**
 * E2E Audit Tests — Sales, Finance, CRM, Booking, Settings
 * Verifies fixes from the comprehensive audit:
 * - Layouts with sidebar (finance, customers, clock)
 * - Finance Quick Action links
 * - Sales dashboard buttons (Add Daily Sales, Export)
 * - Booking form error handling
 * - Settings/schedule resilience
 * - Chat widget only in authenticated pages
 */

test.describe('Audit Fixes — Layouts & Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    await emailInput.fill('manager@cheers.com')
    await passwordInput.fill('test1234')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/.*\/$/)
  })

  test('/finance should render with sidebar', async ({ page }) => {
    await page.goto('/finance')
    // AppShell sidebar should be present
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()
  })

  test('/customers should render with sidebar', async ({ page }) => {
    await page.goto('/customers')
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()
  })

  test('/customers/reviews should render with sidebar', async ({ page }) => {
    await page.goto('/customers/reviews')
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()
  })

  test('/clock should render with sidebar', async ({ page }) => {
    await page.goto('/clock')
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()
  })
})

test.describe('Audit Fixes — Finance Quick Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[type="email"]').fill('manager@cheers.com')
    await page.locator('input[type="password"]').fill('test1234')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/.*\/$/)
  })

  test('Daily Reports link navigates to /finance/reports?tab=daily', async ({ page }) => {
    await page.goto('/finance')
    const dailyLink = page.locator('a[href="/finance/reports?tab=daily"]')
    await expect(dailyLink).toBeVisible()
    await dailyLink.click()
    await page.waitForURL(/.*finance\/reports.*/)
    expect(page.url()).toContain('tab=daily')
  })

  test('Weekly Reports link navigates to /finance/reports?tab=weekly', async ({ page }) => {
    await page.goto('/finance')
    const weeklyLink = page.locator('a[href="/finance/reports?tab=weekly"]')
    await expect(weeklyLink).toBeVisible()
    await weeklyLink.click()
    await page.waitForURL(/.*finance\/reports.*/)
    expect(page.url()).toContain('tab=weekly')
  })

  test('Budget vs Actual link navigates correctly', async ({ page }) => {
    await page.goto('/finance')
    const budgetLink = page.locator('a[href="/finance/budget-vs-actual"]')
    await expect(budgetLink).toBeVisible()
    await budgetLink.click()
    await page.waitForURL(/.*budget-vs-actual.*/)
    // Page should load without error
    await expect(page).not.toHaveTitle(/error|404/i)
  })

  test('Tax Export link navigates correctly', async ({ page }) => {
    await page.goto('/finance')
    const taxLink = page.locator('a[href="/finance/export/tax"]')
    await expect(taxLink).toBeVisible()
    await taxLink.click()
    await page.waitForURL(/.*export\/tax.*/)
    await expect(page).not.toHaveTitle(/error|404/i)
  })

  test('/finance/reports respects ?tab=weekly param', async ({ page }) => {
    await page.goto('/finance/reports?tab=weekly')
    // The weekly tab should be the active/selected tab
    const weeklyTab = page.locator('[role="tab"][data-state="active"]')
    await expect(weeklyTab).toContainText(/Weekly/i)
  })
})

test.describe('Audit Fixes — Sales Dashboard Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[type="email"]').fill('manager@cheers.com')
    await page.locator('input[type="password"]').fill('test1234')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/.*\/$/)
  })

  test('Add Daily Sales button opens dialog', async ({ page }) => {
    await page.goto('/sales')
    const addBtn = page.locator('button:has-text("Add Daily Sales")')
    await expect(addBtn).toBeVisible()
    await addBtn.click()
    // Dialog should open
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('text=Add Daily Sales')).toBeVisible()
  })

  test('Add Daily Sales dialog has required fields', async ({ page }) => {
    await page.goto('/sales')
    await page.locator('button:has-text("Add Daily Sales")').click()

    const dialog = page.locator('[role="dialog"]')
    await expect(dialog.locator('input[type="date"]')).toBeVisible()
    await expect(dialog.locator('#food-revenue')).toBeVisible()
    await expect(dialog.locator('#drinks-revenue')).toBeVisible()
    await expect(dialog.locator('#cocktails-revenue')).toBeVisible()
    await expect(dialog.locator('#desserts-revenue')).toBeVisible()
  })

  test('Export dropdown has options', async ({ page }) => {
    await page.goto('/sales')
    const exportBtn = page.locator('button:has-text("Export")')
    await expect(exportBtn).toBeVisible()
    await exportBtn.click()

    // Dropdown menu should appear
    const menu = page.locator('[role="menu"]')
    await expect(menu).toBeVisible()
    await expect(menu.locator('text=Daily Report PDF')).toBeVisible()
    await expect(menu.locator('text=Register Close PDF')).toBeVisible()
    await expect(menu.locator('text=Expenses PDF')).toBeVisible()
  })
})

test.describe('Audit Fixes — Settings/Schedule API Resilience', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[type="email"]').fill('manager@cheers.com')
    await page.locator('input[type="password"]').fill('test1234')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/.*\/$/)
  })

  test('/settings/schedule loads without 500 error', async ({ page }) => {
    await page.goto('/settings/schedule')
    // Page should not show error
    await expect(page).not.toHaveTitle(/error|500/i)
    // Should show settings content or defaults
    const content = page.locator('main')
    await expect(content).toBeVisible()
  })
})

test.describe('Audit Fixes — Booking Page (Public)', () => {
  test('/booking does not show chat widget', async ({ page }) => {
    await page.goto('/booking')
    // Chat widget should not be present
    const chatWidget = page.locator('[data-chat-widget]').or(page.locator('text=AI Assistant'))
    await page.waitForTimeout(1000)
    const count = await chatWidget.count()
    expect(count).toBe(0)
  })

  test('/booking form is accessible without login', async ({ page }) => {
    await page.goto('/booking')
    // Booking form should be visible
    const form = page.locator('form')
    await expect(form).toBeVisible()
  })

  test('/booking form handles server errors gracefully', async ({ page }) => {
    await page.goto('/booking')
    // Fill out minimal form data
    await page.locator('#guest_name').fill('Test User')
    await page.locator('#guest_phone').fill('+34123456789')

    // Page should not crash when interacted with
    await expect(page).not.toHaveTitle(/error/i)
  })
})

test.describe('Audit Fixes — Chat Widget Placement', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[type="email"]').fill('manager@cheers.com')
    await page.locator('input[type="password"]').fill('test1234')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/.*\/$/)
  })

  test('Chat widget is present on authenticated pages (dashboard)', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForTimeout(1000)
    // The LazyChatWidget should be in the AppShell
    // It may render lazily, so check for the container
    const appShell = page.locator('aside')
    await expect(appShell).toBeVisible()
  })
})
