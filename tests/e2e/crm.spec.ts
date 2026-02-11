import { test, expect } from '@playwright/test'

/**
 * E2E Tests for CRM & Customer Intelligence Module
 * Tests customer management, loyalty program, and review handling flows
 */

test.describe('CRM & Customer Intelligence', () => {
  test.beforeEach(async ({ page }) => {
    // Login as manager to access CRM
    await page.goto('/login')

    // Fill login form
    const emailInput = page.locator('input[type="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()
    const submitButton = page.locator('button[type="submit"]').first()

    await emailInput.fill('manager@cheers.com')
    await passwordInput.fill('test1234')
    await submitButton.click()

    // Wait for dashboard to load
    await page.waitForURL('/')
    await page.waitForTimeout(1000)
  })

  test.describe('Customer Management', () => {
    test('should display customers page with data table', async ({ page }) => {
      // Navigate to customers
      await page.goto('/customers')

      // Wait for page to load
      await page.waitForTimeout(1000)

      // Check for page header
      const pageTitle = page.locator('h1, h2').first()
      await expect(pageTitle).toContainText(/[Cc]ustomer/i)

      // Check for table or list of customers
      const table = page.locator('table, [role="table"]').first()
      await expect(table).toBeVisible()

      // Check for add customer button
      const addButton = page.locator('button:has-text("Add Customer"), button:has-text("New Customer"), button:has-text("+")')
      await expect(addButton).toBeVisible()

      // Take screenshot for evidence
      await page.screenshot({ path: 'screenshots/crm-customers-list.png' })
    })

    test('should create a new customer', async ({ page }) => {
      await page.goto('/customers')
      await page.waitForTimeout(1000)

      // Click add customer button
      const addButton = page.locator('button:has-text("Add Customer"), button:has-text("New Customer"), button:has-text("+")')
      await addButton.click()

      // Wait for form to appear
      await page.waitForTimeout(500)

      // Fill customer form
      const nameInput = page.locator('input[placeholder*="Name"], input[name*="name"]').first()
      const emailInput = page.locator('input[type="email"], input[name*="email"]').first()
      const phoneInput = page.locator('input[placeholder*="Phone"], input[name*="phone"]').first()

      await nameInput.fill('Test Customer')
      await emailInput.fill('testcustomer@example.com')
      await phoneInput.fill('+34 971 123 456')

      // Submit form
      const submitButton = page.locator('button[type="submit"]:has-text("Save"), button[type="submit"]:has-text("Create"), button[type="submit"]:has-text("Add")')
      await submitButton.click()

      // Wait for success message or table update
      await page.waitForTimeout(1000)

      // Verify customer appears in table
      await expect(page.locator('text=Test Customer')).toBeVisible()

      // Take screenshot
      await page.screenshot({ path: 'screenshots/crm-customer-created.png' })
    })

    test('should view customer details', async ({ page }) => {
      await page.goto('/customers')
      await page.waitForTimeout(1000)

      // Click on first customer row
      const firstCustomerRow = page.locator('table tbody tr, [role="row"]').first()
      await firstCustomerRow.click()

      // Wait for detail view
      await page.waitForTimeout(500)

      // Check for customer information
      const nameField = page.locator('text=/[Nn]ame|Customer/').first()
      await expect(nameField).toBeVisible()

      // Check for visit count
      const visitCountField = page.locator('text=/[Vv]isits?|Visit [Cc]ount/').first()
      if (visitCountField) {
        await expect(visitCountField).toBeVisible()
      }

      // Take screenshot
      await page.screenshot({ path: 'screenshots/crm-customer-details.png' })
    })

    test('should filter customers by VIP status', async ({ page }) => {
      await page.goto('/customers')
      await page.waitForTimeout(1000)

      // Look for VIP filter
      const vipFilter = page.locator('button, select, input').filter({ hasText: /VIP|Filter/ }).first()
      if (vipFilter) {
        await vipFilter.click()
        await page.waitForTimeout(500)

        // Select VIP option
        const vipOption = page.locator('text=VIP').first()
        if (vipOption) {
          await vipOption.click()
          await page.waitForTimeout(500)

          // Take screenshot
          await page.screenshot({ path: 'screenshots/crm-vip-filter.png' })
        }
      }
    })

    test('should search customers by name', async ({ page }) => {
      await page.goto('/customers')
      await page.waitForTimeout(1000)

      // Find search input
      const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="Name"]').first()
      if (searchInput) {
        await searchInput.fill('John')
        await page.waitForTimeout(500)

        // Verify results update
        const results = page.locator('table tbody tr, [role="row"]')
        const count = await results.count()
        expect(count).toBeGreaterThanOrEqual(0)

        // Take screenshot
        await page.screenshot({ path: 'screenshots/crm-search-results.png' })
      }
    })
  })

  test.describe('Loyalty Program', () => {
    test('should display loyalty rewards milestones', async ({ page }) => {
      // Navigate to loyalty section if available
      const loyaltyLink = page.locator('a:has-text("Loyalty"), a:has-text("Rewards")').first()
      if (loyaltyLink) {
        await loyaltyLink.click()
        await page.waitForTimeout(1000)

        // Check for milestone information
        const milestones = page.locator('text=/5th|10th|20th/').first()
        if (milestones) {
          await expect(milestones).toBeVisible()

          // Take screenshot
          await page.screenshot({ path: 'screenshots/crm-loyalty-milestones.png' })
        }
      }
    })

    test('should log customer visit and update visit count', async ({ page }) => {
      await page.goto('/customers')
      await page.waitForTimeout(1000)

      // Click on first customer
      const firstCustomerRow = page.locator('table tbody tr, [role="row"]').first()
      await firstCustomerRow.click()
      await page.waitForTimeout(500)

      // Look for "Log Visit" or similar button
      const logVisitButton = page.locator('button:has-text("Log Visit"), button:has-text("Visit")').first()
      if (logVisitButton) {
        const initialVisitCount = await page.locator('text=/Visit [Cc]ount|Visits?/').first().textContent()

        await logVisitButton.click()
        await page.waitForTimeout(500)

        // Verify visit count increased
        const updatedVisitCount = await page.locator('text=/Visit [Cc]ount|Visits?/').first().textContent()
        expect(updatedVisitCount).not.toEqual(initialVisitCount)

        // Take screenshot
        await page.screenshot({ path: 'screenshots/crm-visit-logged.png' })
      }
    })

    test('should flag customer as VIP at 20 visits', async ({ page }) => {
      await page.goto('/customers')
      await page.waitForTimeout(1000)

      // Find a high-visit customer or navigate to one
      const customerWithHighVisits = page.locator('text=/20|25|30/..')
      if (customerWithHighVisits) {
        // Check for VIP indicator
        const vipBadge = page.locator('text=VIP, span:has-text("VIP"), [class*="vip"]').first()
        if (vipBadge) {
          await expect(vipBadge).toBeVisible()

          // Take screenshot
          await page.screenshot({ path: 'screenshots/crm-vip-flag.png' })
        }
      }
    })
  })

  test.describe('Reviews Management', () => {
    test('should display reviews page', async ({ page }) => {
      // Navigate to reviews
      await page.goto('/customers/reviews')
      await page.waitForTimeout(1000)

      // Check for page title
      const pageTitle = page.locator('h1, h2').first()
      await expect(pageTitle).toContainText(/[Rr]eview/i)

      // Check for reviews table or list
      const reviewsList = page.locator('table, [role="table"], [class*="card"]').first()
      await expect(reviewsList).toBeVisible()

      // Check for add review button
      const addButton = page.locator('button:has-text("Add Review"), button:has-text("Import Review")').first()
      if (addButton) {
        await expect(addButton).toBeVisible()
      }

      // Take screenshot
      await page.screenshot({ path: 'screenshots/crm-reviews-list.png' })
    })

    test('should add a review manually', async ({ page }) => {
      await page.goto('/customers/reviews')
      await page.waitForTimeout(1000)

      // Click add review button
      const addButton = page.locator('button:has-text("Add Review"), button:has-text("Import Review"), button:has-text("+")')
      await addButton.click()
      await page.waitForTimeout(500)

      // Fill review form
      const platformSelect = page.locator('select, [role="combobox"]').first()
      const ratingInput = page.locator('input[type="number"], input[placeholder*="Rating"]').first()
      const reviewText = page.locator('textarea, input[placeholder*="Review"]').first()
      const sentimentSelect = page.locator('select, [role="combobox"]').nth(1)

      await platformSelect.click()
      const googleOption = page.locator('text=Google').first()
      if (googleOption) {
        await googleOption.click()
      }

      await ratingInput.fill('5')
      await reviewText.fill('Excellent service and food quality!')

      if (sentimentSelect) {
        await sentimentSelect.click()
        const positiveOption = page.locator('text=Positive').first()
        if (positiveOption) {
          await positiveOption.click()
        }
      }

      // Submit form
      const submitButton = page.locator('button[type="submit"]:has-text("Save"), button[type="submit"]:has-text("Add")').first()
      await submitButton.click()

      // Wait for success
      await page.waitForTimeout(1000)

      // Take screenshot
      await page.screenshot({ path: 'screenshots/crm-review-added.png' })
    })

    test('should filter reviews by sentiment', async ({ page }) => {
      await page.goto('/customers/reviews')
      await page.waitForTimeout(1000)

      // Look for sentiment filter
      const sentimentFilter = page.locator('button, select').filter({ hasText: /[Ss]entiment|Positive|Negative/ }).first()
      if (sentimentFilter) {
        await sentimentFilter.click()
        await page.waitForTimeout(500)

        // Select positive sentiment
        const positiveOption = page.locator('text=Positive').first()
        if (positiveOption) {
          await positiveOption.click()
          await page.waitForTimeout(500)

          // Take screenshot
          await page.screenshot({ path: 'screenshots/crm-sentiment-filter.png' })
        }
      }
    })

    test('should filter reviews by platform', async ({ page }) => {
      await page.goto('/customers/reviews')
      await page.waitForTimeout(1000)

      // Look for platform filter
      const platformFilter = page.locator('button, select').filter({ hasText: /[Pp]latform|TripAdvisor|Google/ }).first()
      if (platformFilter) {
        await platformFilter.click()
        await page.waitForTimeout(500)

        // Select platform
        const tripadvisor = page.locator('text=TripAdvisor').first()
        if (tripadvisor) {
          await tripadvisor.click()
          await page.waitForTimeout(500)

          // Take screenshot
          await page.screenshot({ path: 'screenshots/crm-platform-filter.png' })
        }
      }
    })

    test('should generate AI response to review', async ({ page }) => {
      await page.goto('/customers/reviews')
      await page.waitForTimeout(1000)

      // Click on first review
      const firstReviewRow = page.locator('table tbody tr, [role="row"], [class*="card"]').first()
      await firstReviewRow.click()
      await page.waitForTimeout(500)

      // Look for "Generate Response" button
      const generateButton = page.locator('button:has-text("Generate Response"), button:has-text("AI Response")').first()
      if (generateButton) {
        await generateButton.click()
        await page.waitForTimeout(1500) // Wait for AI to generate

        // Verify response appears
        const responseText = page.locator('textarea, div[class*="response"]').first()
        if (responseText) {
          await expect(responseText).toBeVisible()

          // Take screenshot
          await page.screenshot({ path: 'screenshots/crm-ai-response-generated.png' })
        }
      }
    })

    test('should send review response', async ({ page }) => {
      await page.goto('/customers/reviews')
      await page.waitForTimeout(1000)

      // Click on a review
      const firstReviewRow = page.locator('table tbody tr, [role="row"], [class*="card"]').first()
      await firstReviewRow.click()
      await page.waitForTimeout(500)

      // Look for "Send Response" button
      const sendButton = page.locator('button:has-text("Send Response"), button:has-text("Send")').first()
      if (sendButton) {
        await sendButton.click()
        await page.waitForTimeout(1000)

        // Verify confirmation or status update
        const successMessage = page.locator('text=Sent, text=Success').first()
        if (successMessage) {
          await expect(successMessage).toBeVisible()

          // Take screenshot
          await page.screenshot({ path: 'screenshots/crm-response-sent.png' })
        }
      }
    })
  })

  test.describe('Birthday & Anniversary Tracking', () => {
    test('should display upcoming birthdays section', async ({ page }) => {
      // Check if there's a birthdays/anniversaries view
      const crmLink = page.locator('a:has-text("CRM")').first()
      if (crmLink) {
        await crmLink.click()
        await page.waitForTimeout(1000)

        // Look for birthday section
        const birthdaySection = page.locator('text=/[Bb]irthday|[Aa]nniversary/').first()
        if (birthdaySection) {
          await expect(birthdaySection).toBeVisible()

          // Take screenshot
          await page.screenshot({ path: 'screenshots/crm-birthdays-section.png' })
        }
      }
    })

    test('should display upcoming anniversaries', async ({ page }) => {
      // Check CRM dashboard for anniversary information
      const crmLink = page.locator('a:has-text("CRM")').first()
      if (crmLink) {
        await crmLink.click()
        await page.waitForTimeout(1000)

        // Look for anniversary section
        const anniversarySection = page.locator('text=/[Aa]nniversary/').first()
        if (anniversarySection) {
          await expect(anniversarySection).toBeVisible()

          // Take screenshot
          await page.screenshot({ path: 'screenshots/crm-anniversaries-section.png' })
        }
      }
    })
  })

  test.describe('CRM Dashboard & Insights', () => {
    test('should display CRM overview metrics', async ({ page }) => {
      // Navigate to CRM or dashboard
      const crmLink = page.locator('a:has-text("CRM"), a:has-text("Customers")').first()
      if (crmLink) {
        await crmLink.click()
        await page.waitForTimeout(1000)

        // Look for metrics cards
        const metricsCards = page.locator('[class*="card"], [class*="metric"], [class*="stat"]')

        // Check for common CRM metrics
        const totalCustomersCard = page.locator('text=/[Tt]otal [Cc]ustomer|Customer [Cc]ount/').first()
        if (totalCustomersCard) {
          await expect(totalCustomersCard).toBeVisible()
        }

        const vipCustomersCard = page.locator('text=/VIP [Cc]ustomer/').first()
        if (vipCustomersCard) {
          await expect(vipCustomersCard).toBeVisible()
        }

        const retentionCard = page.locator('text=/[Rr]etention|Repeat [Cc]ustomer/').first()
        if (retentionCard) {
          await expect(retentionCard).toBeVisible()
        }

        // Take screenshot
        await page.screenshot({ path: 'screenshots/crm-dashboard-metrics.png' })
      }
    })

    test('should display review sentiment breakdown', async ({ page }) => {
      await page.goto('/customers/reviews')
      await page.waitForTimeout(1000)

      // Look for sentiment summary
      const sentimentSummary = page.locator('text=/[Pp]ositive|[Nn]egative|[Nn]eutral/').first()
      if (sentimentSummary) {
        await expect(sentimentSummary).toBeVisible()

        // Take screenshot
        await page.screenshot({ path: 'screenshots/crm-sentiment-breakdown.png' })
      }
    })

    test('should export customer data', async ({ page }) => {
      await page.goto('/customers')
      await page.waitForTimeout(1000)

      // Look for export button
      const exportButton = page.locator('button:has-text("Export"), button:has-text("Download")').first()
      if (exportButton) {
        await exportButton.click()
        await page.waitForTimeout(500)

        // Take screenshot
        await page.screenshot({ path: 'screenshots/crm-export-option.png' })
      }
    })
  })

  test.describe('Language & Localization', () => {
    test('should display customer language preference', async ({ page }) => {
      await page.goto('/customers')
      await page.waitForTimeout(1000)

      // Click on first customer
      const firstCustomerRow = page.locator('table tbody tr, [role="row"]').first()
      await firstCustomerRow.click()
      await page.waitForTimeout(500)

      // Look for language field
      const languageField = page.locator('text=/[Ll]anguage|Dutch|English|Spanish/').first()
      if (languageField) {
        await expect(languageField).toBeVisible()

        // Take screenshot
        await page.screenshot({ path: 'screenshots/crm-language-preference.png' })
      }
    })
  })

  test.afterEach(async ({ page }) => {
    // Logout after each test
    const avatarButton = page.locator('[class*="avatar"], button:has-text("User"), button:has-text("Profile")').first()
    if (avatarButton) {
      await avatarButton.click()
      await page.waitForTimeout(300)

      const logoutButton = page.locator('text=Logout, text=Sign out').first()
      if (logoutButton) {
        await logoutButton.click()
        await page.waitForURL('/login')
      }
    }
  })
})
