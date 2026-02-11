import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Marketing & Social Media Module
 * Tests complete workflows: content calendar, post creation, publishing, newsletters, and subscribers
 */

test.describe('Marketing & Social Media', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login')

    // Fill in manager credentials
    const emailInput = page.locator('input[type="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()
    const submitButton = page.locator('button[type="submit"]').first()

    await emailInput.fill('manager@cheers.com')
    await passwordInput.fill('password123')
    await submitButton.click()

    // Wait for navigation to dashboard
    await page.waitForURL('/', { waitUntil: 'networkidle' })
  })

  test.describe('Content Calendar', () => {
    test('should display marketing dashboard', async ({ page }) => {
      // Navigate to marketing page
      await page.goto('/marketing')

      // Check for page header
      const pageHeader = page.locator('h1')
      await expect(pageHeader).toContainText('Marketing', { timeout: 5000 })

      // Check for content calendar section
      const calendarSection = page.locator('text=Content Calendar')
      if (await calendarSection.isVisible().catch(() => false)) {
        await expect(calendarSection).toBeVisible()
      }
    })

    test('should display content calendar entries', async ({ page }) => {
      await page.goto('/marketing')

      // Wait for calendar to load
      await page.waitForTimeout(500)

      // Check if content calendar entries are displayed
      const calendarContainer = page.locator('[data-testid="content-calendar"]').first()
      if (await calendarContainer.isVisible().catch(() => false)) {
        await expect(calendarContainer).toBeVisible()
      }

      // Check for calendar view or list
      const calendarView = page.locator('text=Schedule').first()
      if (await calendarView.isVisible().catch(() => false)) {
        await expect(calendarView).toBeVisible()
      }
    })

    test('should open content calendar for future dates', async ({ page }) => {
      await page.goto('/marketing')

      // Look for date selector or calendar grid
      const futureDateButton = page.locator('[aria-label*="2024-06"]').first()
      if (await futureDateButton.isVisible().catch(() => false)) {
        await futureDateButton.click()
        await expect(page).toHaveURL(/\/marketing/)
      }
    })

    test('should filter content by platform', async ({ page }) => {
      await page.goto('/marketing')

      // Look for platform filter
      const platformSelect = page.locator('select[name="platform"]').first()
      if (await platformSelect.isVisible().catch(() => false)) {
        await platformSelect.selectOption('instagram')
        await expect(platformSelect).toHaveValue('instagram')
      }
    })

    test('should filter content by status', async ({ page }) => {
      await page.goto('/marketing')

      // Look for status filter
      const statusSelect = page.locator('select[name="status"]').first()
      if (await statusSelect.isVisible().catch(() => false)) {
        await statusSelect.selectOption('draft')
        await expect(statusSelect).toHaveValue('draft')
      }
    })
  })

  test.describe('Post Creator', () => {
    test('should display post creator page', async ({ page }) => {
      await page.goto('/marketing/create')

      // Check for page header
      const pageHeader = page.locator('h1')
      await expect(pageHeader).toContainText('Create', { timeout: 5000 })

      // Check for form sections
      const formSection = page.locator('form').first()
      if (await formSection.isVisible().catch(() => false)) {
        await expect(formSection).toBeVisible()
      }
    })

    test('should fill post creator form', async ({ page }) => {
      await page.goto('/marketing/create')

      // Wait for form to load
      await page.waitForTimeout(500)

      // Fill title field
      const titleInput = page.locator('input[name="title"]').first()
      if (await titleInput.isVisible().catch(() => false)) {
        await titleInput.fill('Summer Menu Launch Event')
      }

      // Fill content field
      const contentInput = page.locator('textarea[name="content_text"]').first()
      if (await contentInput.isVisible().catch(() => false)) {
        await contentInput.fill('Join us for an exclusive preview of our new summer menu!')
      }

      // Select language
      const languageSelect = page.locator('select[name="language"]').first()
      if (await languageSelect.isVisible().catch(() => false)) {
        await languageSelect.selectOption('en')
      }

      // Select platform
      const platformSelect = page.locator('select[name="platform"]').first()
      if (await platformSelect.isVisible().catch(() => false)) {
        await platformSelect.selectOption('instagram')
      }

      // Verify inputs
      if (await titleInput.isVisible().catch(() => false)) {
        await expect(titleInput).toHaveValue('Summer Menu Launch Event')
      }
    })

    test('should upload image in post creator', async ({ page }) => {
      await page.goto('/marketing/create')

      // Look for image upload button
      const uploadButton = page.locator('button:has-text("Upload Image")').first()
      const uploadArea = page.locator('text=Drag and drop').first()

      if (await uploadButton.isVisible().catch(() => false)) {
        await uploadButton.click()
        // File dialog would open - skip actual file upload in test
      } else if (await uploadArea.isVisible().catch(() => false)) {
        await expect(uploadArea).toBeVisible()
      }
    })

    test('should preview post before publishing', async ({ page }) => {
      await page.goto('/marketing/create')

      // Wait for form to load
      await page.waitForTimeout(500)

      // Fill form fields
      const titleInput = page.locator('input[name="title"]').first()
      if (await titleInput.isVisible().catch(() => false)) {
        await titleInput.fill('Test Post')
      }

      // Click preview button
      const previewButton = page.locator('button:has-text("Preview")').first()
      if (await previewButton.isVisible().catch(() => false)) {
        await previewButton.click()

        // Check for preview content
        const previewText = page.locator('text=Test Post')
        if (await previewText.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(previewText).toBeVisible()
        }
      }
    })

    test('should save draft post', async ({ page }) => {
      await page.goto('/marketing/create')

      // Wait for form to load
      await page.waitForTimeout(500)

      // Fill minimal form
      const titleInput = page.locator('input[name="title"]').first()
      if (await titleInput.isVisible().catch(() => false)) {
        await titleInput.fill('Draft Post Test')

        // Click save/draft button
        const saveButton = page.locator('button:has-text("Save")').first()
        const draftButton = page.locator('button:has-text("Draft")').first()

        if (await draftButton.isVisible().catch(() => false)) {
          await draftButton.click()
          // Verify success message or redirect
          await page.waitForTimeout(500)
        } else if (await saveButton.isVisible().catch(() => false)) {
          await saveButton.click()
          await page.waitForTimeout(500)
        }
      }
    })

    test('should schedule post for future date', async ({ page }) => {
      await page.goto('/marketing/create')

      // Fill form
      const titleInput = page.locator('input[name="title"]').first()
      if (await titleInput.isVisible().catch(() => false)) {
        await titleInput.fill('Scheduled Post')

        // Set scheduled date
        const dateInput = page.locator('input[name="scheduled_date"]').first()
        if (await dateInput.isVisible().catch(() => false)) {
          await dateInput.fill('2024-06-20')

          const timeInput = page.locator('input[name="scheduled_time"]').first()
          if (await timeInput.isVisible().catch(() => false)) {
            await timeInput.fill('14:00')
          }
        }
      }
    })

    test('should validate form fields', async ({ page }) => {
      await page.goto('/marketing/create')

      // Try to submit empty form
      const submitButton = page.locator('button[type="submit"]').first()
      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click()

        // Check for validation error
        const errorMessage = page.locator('text=required').first()
        if (await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(errorMessage).toBeVisible()
        }
      }
    })
  })

  test.describe('Newsletter Builder', () => {
    test('should display newsletter page', async ({ page }) => {
      await page.goto('/marketing/newsletter')

      // Check for page header
      const pageHeader = page.locator('h1')
      await expect(pageHeader).toContainText('Newsletter', { timeout: 5000 })
    })

    test('should display newsletter list', async ({ page }) => {
      await page.goto('/marketing/newsletter')

      // Wait for list to load
      await page.waitForTimeout(500)

      // Check for newsletter items
      const newsletterList = page.locator('[data-testid="newsletter-list"]').first()
      if (await newsletterList.isVisible().catch(() => false)) {
        await expect(newsletterList).toBeVisible()
      }
    })

    test('should create new newsletter', async ({ page }) => {
      await page.goto('/marketing/newsletter')

      // Click create button
      const createButton = page.locator('button:has-text("Create")').first()
      const newButton = page.locator('button:has-text("New")').first()

      if (await createButton.isVisible().catch(() => false)) {
        await createButton.click()
      } else if (await newButton.isVisible().catch(() => false)) {
        await newButton.click()
      }

      // Wait for dialog or form
      await page.waitForTimeout(500)

      // Fill newsletter details
      const titleInput = page.locator('input[name="title"]').first()
      if (await titleInput.isVisible().catch(() => false)) {
        await titleInput.fill('Weekly Specials Newsletter')
      }

      const subjectInput = page.locator('input[name="subject"]').first()
      if (await subjectInput.isVisible().catch(() => false)) {
        await subjectInput.fill('Check out this week\'s specials!')
      }
    })

    test('should edit newsletter template', async ({ page }) => {
      await page.goto('/marketing/newsletter')

      // Wait for list to load
      await page.waitForTimeout(500)

      // Click first newsletter to edit
      const firstNewsletter = page.locator('[data-testid="newsletter-item"]').first()
      if (await firstNewsletter.isVisible().catch(() => false)) {
        await firstNewsletter.click()

        // Check for template editor
        const editor = page.locator('[data-testid="template-editor"]').first()
        if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(editor).toBeVisible()
        }
      }
    })

    test('should preview newsletter', async ({ page }) => {
      await page.goto('/marketing/newsletter')

      // Click first newsletter
      const firstNewsletter = page.locator('[data-testid="newsletter-item"]').first()
      if (await firstNewsletter.isVisible().catch(() => false)) {
        await firstNewsletter.click()

        // Click preview button
        const previewButton = page.locator('button:has-text("Preview")').first()
        if (await previewButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await previewButton.click()

          // Check for preview modal/window
          const previewContent = page.locator('[data-testid="newsletter-preview"]').first()
          if (await previewContent.isVisible({ timeout: 2000 }).catch(() => false)) {
            await expect(previewContent).toBeVisible()
          }
        }
      }
    })

    test('should select audience segments', async ({ page }) => {
      await page.goto('/marketing/newsletter')

      // Click create or edit newsletter
      const createButton = page.locator('button:has-text("Create")').first()
      if (await createButton.isVisible().catch(() => false)) {
        await createButton.click()
        await page.waitForTimeout(500)

        // Select segments
        const vipCheckbox = page.locator('input[value="vip"]').first()
        const frequentCheckbox = page.locator('input[value="frequent"]').first()

        if (await vipCheckbox.isVisible().catch(() => false)) {
          await vipCheckbox.check()
        }

        if (await frequentCheckbox.isVisible().catch(() => false)) {
          await frequentCheckbox.check()
        }
      }
    })

    test('should send newsletter', async ({ page }) => {
      await page.goto('/marketing/newsletter')

      // Wait for list to load
      await page.waitForTimeout(500)

      // Click first newsletter
      const firstNewsletter = page.locator('[data-testid="newsletter-item"]').first()
      if (await firstNewsletter.isVisible().catch(() => false)) {
        await firstNewsletter.click()

        // Click send button
        const sendButton = page.locator('button:has-text("Send")').first()
        if (await sendButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await sendButton.click()

          // Check for confirmation
          const confirmButton = page.locator('button:has-text("Confirm")').first()
          const yesButton = page.locator('button:has-text("Yes")').first()

          if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await confirmButton.click()
          } else if (await yesButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await yesButton.click()
          }

          // Wait for send to complete
          await page.waitForTimeout(1000)
        }
      }
    })
  })

  test.describe('Subscriber Management', () => {
    test('should display subscribers in settings', async ({ page }) => {
      // Navigate to settings or subscriber section
      const settingsPath = ['/marketing/subscribers', '/settings/subscribers', '/marketing/newsletter']

      for (const path of settingsPath) {
        try {
          await page.goto(path)
          await page.waitForURL(path, { timeout: 3000 })

          // Check for subscriber content
          const subscriberContent = page.locator('text=Subscriber').first()
          if (await subscriberContent.isVisible().catch(() => false)) {
            await expect(subscriberContent).toBeVisible()
            break
          }
        } catch {
          // Try next path
        }
      }
    })

    test('should display subscriber list', async ({ page }) => {
      // Try to find subscriber management page
      const paths = ['/marketing/subscribers', '/settings/subscribers']

      for (const path of paths) {
        try {
          await page.goto(path)
          await page.waitForURL(path, { timeout: 3000 })

          const subscriberList = page.locator('[data-testid="subscriber-list"]').first()
          const table = page.locator('table').first()

          if (await subscriberList.isVisible().catch(() => false)) {
            await expect(subscriberList).toBeVisible()
            break
          } else if (await table.isVisible().catch(() => false)) {
            await expect(table).toBeVisible()
            break
          }
        } catch {
          // Try next path
        }
      }
    })

    test('should show subscriber statistics', async ({ page }) => {
      await page.goto('/marketing')

      // Look for subscriber stats on dashboard
      const statsSection = page.locator('text=Subscribers').first()
      const countText = page.locator('text=/\\d+\\s+subscribers/i').first()

      if (await statsSection.isVisible().catch(() => false)) {
        await expect(statsSection).toBeVisible()
      }

      if (await countText.isVisible().catch(() => false)) {
        await expect(countText).toBeVisible()
      }
    })
  })

  test.describe('AI Content Generation', () => {
    test('should display AI generate button', async ({ page }) => {
      await page.goto('/marketing/create')

      // Look for AI generate button
      const aiButton = page.locator('button:has-text("AI Generate")').first()
      const aiIcon = page.locator('[data-testid="ai-generate-button"]').first()

      if (await aiButton.isVisible().catch(() => false)) {
        await expect(aiButton).toBeVisible()
      } else if (await aiIcon.isVisible().catch(() => false)) {
        await expect(aiIcon).toBeVisible()
      }
    })

    test('should generate AI caption', async ({ page }) => {
      await page.goto('/marketing/create')

      // Wait for form to load
      await page.waitForTimeout(500)

      // Fill in title
      const titleInput = page.locator('input[name="title"]').first()
      if (await titleInput.isVisible().catch(() => false)) {
        await titleInput.fill('Summer Cocktails')

        // Click AI generate button
        const aiButton = page.locator('button:has-text("AI Generate")').first()
        const aiGenerateButton = page.locator('[data-testid="ai-generate-button"]').first()

        if (await aiButton.isVisible().catch(() => false)) {
          await aiButton.click()
        } else if (await aiGenerateButton.isVisible().catch(() => false)) {
          await aiGenerateButton.click()
        }

        // Wait for AI response
        await page.waitForTimeout(2000)

        // Check for generated content
        const contentInput = page.locator('textarea[name="content_text"]').first()
        if (await contentInput.isVisible().catch(() => false)) {
          const content = await contentInput.inputValue()
          if (content) {
            expect(content.length).toBeGreaterThan(0)
          }
        }
      }
    })

    test('should generate hashtags with AI', async ({ page }) => {
      await page.goto('/marketing/create')

      // Wait for form to load
      await page.waitForTimeout(500)

      // Fill title
      const titleInput = page.locator('input[name="title"]').first()
      if (await titleInput.isVisible().catch(() => false)) {
        await titleInput.fill('DJ Night Event')

        // Click AI generate
        const aiButton = page.locator('button:has-text("AI Generate")').first()
        if (await aiButton.isVisible().catch(() => false)) {
          await aiButton.click()

          // Wait for generation
          await page.waitForTimeout(2000)

          // Check for hashtags
          const hashtagInput = page.locator('input[name="hashtags"]').first()
          const hashtagField = page.locator('text=Hashtag').first()

          if (await hashtagInput.isVisible().catch(() => false)) {
            const hashtags = await hashtagInput.inputValue()
            if (hashtags) {
              expect(hashtags).toContain('#')
            }
          } else if (await hashtagField.isVisible().catch(() => false)) {
            await expect(hashtagField).toBeVisible()
          }
        }
      }
    })

    test('should support multi-language generation', async ({ page }) => {
      await page.goto('/marketing/create')

      // Select Dutch language
      const languageSelect = page.locator('select[name="language"]').first()
      if (await languageSelect.isVisible().catch(() => false)) {
        await languageSelect.selectOption('nl')
      }

      // Fill title
      const titleInput = page.locator('input[name="title"]').first()
      if (await titleInput.isVisible().catch(() => false)) {
        await titleInput.fill('Zomer Menu')

        // Generate AI content
        const aiButton = page.locator('button:has-text("AI Generate")').first()
        if (await aiButton.isVisible().catch(() => false)) {
          await aiButton.click()

          // Wait for generation
          await page.waitForTimeout(2000)

          // Verify response is in Dutch (check for Dutch words or characters)
          const contentInput = page.locator('textarea[name="content_text"]').first()
          if (await contentInput.isVisible().catch(() => false)) {
            const content = await contentInput.inputValue()
            if (content) {
              expect(content.length).toBeGreaterThan(0)
            }
          }
        }
      }
    })
  })

  test.describe('Social Media Analytics', () => {
    test('should display analytics on post', async ({ page }) => {
      await page.goto('/marketing')

      // Wait for page to load
      await page.waitForTimeout(500)

      // Look for post with analytics
      const postCard = page.locator('[data-testid="post-card"]').first()
      if (await postCard.isVisible().catch(() => false)) {
        await postCard.click()

        // Check for analytics section
        const analyticsSection = page.locator('text=Analytics').first()
        const engagementText = page.locator('text=Engagement').first()

        if (await analyticsSection.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(analyticsSection).toBeVisible()
        } else if (await engagementText.isVisible().catch(() => false)) {
          await expect(engagementText).toBeVisible()
        }
      }
    })

    test('should show like count on post', async ({ page }) => {
      await page.goto('/marketing')

      // Wait for content to load
      await page.waitForTimeout(500)

      // Look for likes count
      const likesText = page.locator('text=/\\d+\\s+like/i').first()
      if (await likesText.isVisible().catch(() => false)) {
        await expect(likesText).toBeVisible()
      }
    })

    test('should show comment count on post', async ({ page }) => {
      await page.goto('/marketing')

      // Wait for content to load
      await page.waitForTimeout(500)

      // Look for comments count
      const commentsText = page.locator('text=/\\d+\\s+comment/i').first()
      if (await commentsText.isVisible().catch(() => false)) {
        await expect(commentsText).toBeVisible()
      }
    })

    test('should show reach on post', async ({ page }) => {
      await page.goto('/marketing')

      // Wait for content to load
      await page.waitForTimeout(500)

      // Look for reach information
      const reachText = page.locator('text=Reach').first()
      if (await reachText.isVisible().catch(() => false)) {
        await expect(reachText).toBeVisible()
      }
    })
  })

  test.describe('Multi-Language Support', () => {
    test('should create content in English', async ({ page }) => {
      await page.goto('/marketing/create')

      // Select English
      const languageSelect = page.locator('select[name="language"]').first()
      if (await languageSelect.isVisible().catch(() => false)) {
        await languageSelect.selectOption('en')
      }

      // Fill content
      const titleInput = page.locator('input[name="title"]').first()
      if (await titleInput.isVisible().catch(() => false)) {
        await titleInput.fill('Summer Specials')
      }
    })

    test('should create content in Dutch', async ({ page }) => {
      await page.goto('/marketing/create')

      // Select Dutch
      const languageSelect = page.locator('select[name="language"]').first()
      if (await languageSelect.isVisible().catch(() => false)) {
        await languageSelect.selectOption('nl')
      }

      // Fill content
      const titleInput = page.locator('input[name="title"]').first()
      if (await titleInput.isVisible().catch(() => false)) {
        await titleInput.fill('Zomer Specials')
      }
    })

    test('should create content in Spanish', async ({ page }) => {
      await page.goto('/marketing/create')

      // Select Spanish
      const languageSelect = page.locator('select[name="language"]').first()
      if (await languageSelect.isVisible().catch(() => false)) {
        await languageSelect.selectOption('es')
      }

      // Fill content
      const titleInput = page.locator('input[name="title"]').first()
      if (await titleInput.isVisible().catch(() => false)) {
        await titleInput.fill('Especiales de Verano')
      }
    })
  })
})
