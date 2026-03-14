import { type Page } from '@playwright/test'

/**
 * Test user credentials — must exist in the test environment.
 * Create these users via Supabase dashboard or seed script before running tests.
 */
export const TEST_USERS = {
  admin:   { email: 'admin@cheers.com',   password: 'test1234' },
  manager: { email: 'manager@cheers.com', password: 'test1234' },
  waiter:  { email: 'waiter@cheers.com',  password: 'test1234' },
  kitchen: { email: 'kitchen@cheers.com', password: 'test1234' },
  bar:     { email: 'bar@cheers.com',     password: 'test1234' },
  dj:      { email: 'dj@cheers.com',      password: 'test1234' },
} as const

export type TestRole = keyof typeof TEST_USERS

/**
 * Login as a specific role. Waits for dashboard redirect.
 */
export async function loginAs(page: Page, role: TestRole) {
  const user = TEST_USERS[role]
  await page.goto('/login')
  await page.waitForLoadState('domcontentloaded')

  // Fill login form
  const emailInput = page.locator('[data-testid="login-email"], input[type="email"]').first()
  const passwordInput = page.locator('[data-testid="login-password"], input[type="password"]').first()
  const submitButton = page.locator('[data-testid="login-submit"], button[type="submit"]').first()

  await emailInput.fill(user.email)
  await passwordInput.fill(user.password)
  await submitButton.click()

  // Wait for redirect to any authenticated page
  await page.waitForURL(/\/(dashboard|staff|menu|stock|sales|reservations|events|marketing|finance|customers|settings|assistant)/, {
    timeout: 15000,
  })
}

/**
 * Logout the current user.
 */
export async function logout(page: Page) {
  const userMenu = page.locator('[data-testid="user-menu"]').first()
  if (await userMenu.isVisible()) {
    await userMenu.click()
    const logoutBtn = page.locator('[data-testid="logout-button"], button:has-text("Logout"), button:has-text("Sign out")').first()
    await logoutBtn.click()
    await page.waitForURL('/login', { timeout: 10000 })
  }
}

/**
 * Check if user is authenticated by verifying the URL is not /login.
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  return !page.url().includes('/login')
}
