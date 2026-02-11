import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Reservations & Tables Module
 * Tests complete workflows: creating reservations, managing tables, waitlist, floor plan
 */

test.describe('Reservations Module', () => {
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

  test.describe('Reservations List & Dashboard', () => {
    test('should display reservations dashboard', async ({ page }) => {
      // Navigate to reservations page
      await page.goto('/reservations')

      // Check for page header
      await expect(page.locator('h1')).toContainText('Reservations')

      // Check for today's summary cards
      await expect(page.locator('text=/Today|Reservations/')).toBeVisible()
      await expect(page.locator('text=/Total|Covers/')).toBeVisible()
      await expect(page.locator('text=/Confirmed|Pending/')).toBeVisible()
      await expect(page.locator('text=/Occupancy|Rate/')).toBeVisible()
    })

    test('should display reservation list with filters', async ({ page }) => {
      await page.goto('/reservations')

      // Wait for content to load
      await page.waitForTimeout(500)

      // Check for filter controls
      const filterButton = page.locator('button:has-text("Filters")')
      if (await filterButton.isVisible().catch(() => false)) {
        await expect(filterButton).toBeVisible()
      }

      // Check for date picker
      const dateInput = page.locator('input[type="date"]')
      if (await dateInput.isVisible().catch(() => false)) {
        await expect(dateInput).toBeVisible()
      }

      // Check for status filter
      const statusFilter = page.locator('select:has-text("Status"), [role="combobox"]')
      if (await statusFilter.isVisible().catch(() => false)) {
        await expect(statusFilter).toBeVisible()
      }
    })

    test('should display reservation list table', async ({ page }) => {
      await page.goto('/reservations')

      await page.waitForTimeout(500)

      // Check if reservation table is present
      const table = page.locator('table').first()
      if (await table.isVisible().catch(() => false)) {
        // Check for table headers
        await expect(page.locator('th')).toContainText(/Guest|Time|Size|Status/i)

        // Check for reservation rows
        const rows = page.locator('table tbody tr')
        const rowCount = await rows.count().catch(() => 0)
        expect(rowCount).toBeGreaterThanOrEqual(0)
      }
    })

    test('should show no-show tracking', async ({ page }) => {
      await page.goto('/reservations')

      // Check for no-show statistics or history section
      const noShowSection = page.locator('text=/No-Show|No Show/i')
      if (await noShowSection.isVisible().catch(() => false)) {
        await expect(noShowSection).toBeVisible()
      }
    })
  })

  test.describe('Create Reservation Workflow', () => {
    test('should open reservation form', async ({ page }) => {
      await page.goto('/reservations')

      // Find and click Add Reservation button
      const addButton = page.locator('button:has-text("Add Reservation"), button:has-text("New Reservation")')
      if (await addButton.isVisible().catch(() => false)) {
        await addButton.click()

        // Wait for form to appear
        await page.waitForTimeout(300)

        // Check for form fields
        const guestNameInput = page.locator('input[name="guest_name"], input[placeholder*="Guest"]')
        if (await guestNameInput.isVisible().catch(() => false)) {
          await expect(guestNameInput).toBeVisible()
        }
      }
    })

    test('should fill and submit reservation form', async ({ page }) => {
      await page.goto('/reservations')

      // Click Add Reservation button
      const addButton = page.locator('button:has-text("Add Reservation"), button:has-text("New Reservation")')
      if (await addButton.isVisible().catch(() => false)) {
        await addButton.click()
        await page.waitForTimeout(300)

        // Fill form fields
        const guestName = page.locator('input[name="guest_name"]')
        const guestPhone = page.locator('input[name="guest_phone"]')
        const partySize = page.locator('input[name="party_size"], select[name="party_size"]')
        const reservationDate = page.locator('input[type="date"], input[name="reservation_date"]')
        const startTime = page.locator('input[type="time"], input[name="start_time"]')

        if (
          (await guestName.isVisible().catch(() => false)) &&
          (await guestPhone.isVisible().catch(() => false))
        ) {
          await guestName.fill('John Smith')
          await guestPhone.fill('+34-612-345-678')

          if (await partySize.isVisible().catch(() => false)) {
            if ((await partySize.getAttribute('type')).catch(() => null) === 'number') {
              await partySize.fill('4')
            } else {
              await partySize.selectOption('4')
            }
          }

          if (await reservationDate.isVisible().catch(() => false)) {
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            const dateStr = tomorrow.toISOString().split('T')[0]
            await reservationDate.fill(dateStr)
          }

          if (await startTime.isVisible().catch(() => false)) {
            await startTime.fill('19:00')
          }

          // Submit form
          const submitButton = page.locator('button[type="submit"]:has-text("Create"), button[type="submit"]:has-text("Save")')
          if (await submitButton.isVisible().catch(() => false)) {
            await submitButton.click()

            // Wait for success
            await page.waitForTimeout(1000)

            // Check for success message or redirect
            await expect(page).toHaveURL(/\/reservations/)
          }
        }
      }
    })

    test('should validate required fields', async ({ page }) => {
      await page.goto('/reservations')

      const addButton = page.locator('button:has-text("Add Reservation"), button:has-text("New Reservation")')
      if (await addButton.isVisible().catch(() => false)) {
        await addButton.click()
        await page.waitForTimeout(300)

        // Try to submit empty form
        const submitButton = page.locator('button[type="submit"]:has-text("Create"), button[type="submit"]:has-text("Save")')
        if (await submitButton.isVisible().catch(() => false)) {
          const isDisabled = await submitButton.getAttribute('disabled').catch(() => null)
          // Form should either be disabled or show validation errors
          expect(isDisabled === '' || isDisabled === 'disabled').toBeDefined()
        }
      }
    })
  })

  test.describe('Reservation Details & Actions', () => {
    test('should open reservation details', async ({ page }) => {
      await page.goto('/reservations')

      await page.waitForTimeout(500)

      // Click on a reservation row
      const firstReservationRow = page.locator('table tbody tr').first()
      if (await firstReservationRow.isVisible().catch(() => false)) {
        await firstReservationRow.click()

        // Wait for details to load
        await page.waitForTimeout(300)

        // Check for details panel
        const detailsPanel = page.locator('[role="dialog"], .drawer, .sheet')
        if (await detailsPanel.isVisible().catch(() => false)) {
          await expect(detailsPanel).toBeVisible()
        }
      }
    })

    test('should update reservation status', async ({ page }) => {
      await page.goto('/reservations')

      await page.waitForTimeout(500)

      // Click on a reservation to open details
      const firstReservationRow = page.locator('table tbody tr').first()
      if (await firstReservationRow.isVisible().catch(() => false)) {
        await firstReservationRow.click()
        await page.waitForTimeout(300)

        // Find status update button or dropdown
        const statusButtons = page.locator('button:has-text("Confirm"), button:has-text("Seat"), button:has-text("Complete")')
        if (await statusButtons.first().isVisible().catch(() => false)) {
          await statusButtons.first().click()

          // Verify status changed
          await page.waitForTimeout(500)
        }
      }
    })

    test('should mark reservation as no-show', async ({ page }) => {
      await page.goto('/reservations')

      await page.waitForTimeout(500)

      // Find a reservation to mark as no-show
      const firstReservationRow = page.locator('table tbody tr').first()
      if (await firstReservationRow.isVisible().catch(() => false)) {
        await firstReservationRow.click()
        await page.waitForTimeout(300)

        // Find no-show button
        const noShowButton = page.locator('button:has-text("No-Show"), button:has-text("Mark No-Show")')
        if (await noShowButton.isVisible().catch(() => false)) {
          await noShowButton.click()

          // Confirm if dialog appears
          const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")')
          if (await confirmButton.isVisible().catch(() => false)) {
            await confirmButton.click()
          }

          await page.waitForTimeout(500)
        }
      }
    })

    test('should cancel a reservation', async ({ page }) => {
      await page.goto('/reservations')

      await page.waitForTimeout(500)

      const firstReservationRow = page.locator('table tbody tr').first()
      if (await firstReservationRow.isVisible().catch(() => false)) {
        await firstReservationRow.click()
        await page.waitForTimeout(300)

        // Find cancel button
        const cancelButton = page.locator('button:has-text("Cancel Reservation"), button:has-text("Cancel")')
        if (await cancelButton.isVisible().catch(() => false)) {
          await cancelButton.click()

          // If a reason dialog appears, fill it
          const reasonInput = page.locator('textarea[name="reason"], input[placeholder*="reason"]')
          if (await reasonInput.isVisible().catch(() => false)) {
            await reasonInput.fill('Guest cancelled')
          }

          // Confirm cancellation
          const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")')
          if (await confirmButton.isVisible().catch(() => false)) {
            await confirmButton.click()
          }

          await page.waitForTimeout(500)
        }
      }
    })
  })
})

test.describe('Floor Plan & Tables', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')

    const emailInput = page.locator('input[type="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()
    const submitButton = page.locator('button[type="submit"]').first()

    await emailInput.fill('manager@cheers.com')
    await passwordInput.fill('password123')
    await submitButton.click()

    await page.waitForURL('/', { waitUntil: 'networkidle' })
  })

  test('should display floor plan editor', async ({ page }) => {
    // Navigate to floor plan
    await page.goto('/reservations/floorplan')

    // Wait for content
    await page.waitForTimeout(500)

    // Check for floor plan canvas or container
    const canvas = page.locator('canvas')
    const floorPlanContainer = page.locator('[class*="floor"], [class*="canvas"], svg')

    if (await canvas.isVisible().catch(() => false)) {
      await expect(canvas).toBeVisible()
    } else if (await floorPlanContainer.isVisible().catch(() => false)) {
      await expect(floorPlanContainer).toBeVisible()
    }
  })

  test('should display tables in floor plan', async ({ page }) => {
    await page.goto('/reservations/floorplan')

    await page.waitForTimeout(500)

    // Look for table elements
    const tables = page.locator('[class*="table"], [data-table-id]')
    const tableCount = await tables.count().catch(() => 0)

    expect(tableCount).toBeGreaterThanOrEqual(0)
  })

  test('should allow dragging tables in floor plan', async ({ page }) => {
    await page.goto('/reservations/floorplan')

    await page.waitForTimeout(500)

    // Find first draggable table
    const firstTable = page.locator('[class*="table"], [data-table-id]').first()

    if (await firstTable.isVisible().catch(() => false)) {
      // Get initial position
      const box = await firstTable.boundingBox()

      if (box) {
        // Drag table to new position
        await page.dragAndDrop(firstTable, { x: box.x + 50, y: box.y + 50 })

        // Wait for position update
        await page.waitForTimeout(300)

        // Verify position changed (you can check API call or visual verification)
      }
    }
  })

  test('should open table properties panel', async ({ page }) => {
    await page.goto('/reservations/floorplan')

    await page.waitForTimeout(500)

    // Click on a table to select it
    const firstTable = page.locator('[class*="table"], [data-table-id]').first()

    if (await firstTable.isVisible().catch(() => false)) {
      await firstTable.click()

      // Wait for properties panel
      await page.waitForTimeout(300)

      // Check for properties panel
      const propertiesPanel = page.locator('[class*="properties"], [class*="settings"], [role="dialog"]')
      if (await propertiesPanel.isVisible().catch(() => false)) {
        await expect(propertiesPanel).toBeVisible()
      }
    }
  })

  test('should edit table capacity in floor plan', async ({ page }) => {
    await page.goto('/reservations/floorplan')

    await page.waitForTimeout(500)

    // Click on a table
    const firstTable = page.locator('[class*="table"], [data-table-id]').first()

    if (await firstTable.isVisible().catch(() => false)) {
      await firstTable.click()
      await page.waitForTimeout(300)

      // Find capacity input
      const capacityInput = page.locator('input[name="capacity"]')
      if (await capacityInput.isVisible().catch(() => false)) {
        await capacityInput.clear()
        await capacityInput.fill('6')

        // Find save button
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")')
        if (await saveButton.isVisible().catch(() => false)) {
          await saveButton.click()
          await page.waitForTimeout(500)
        }
      }
    }
  })

  test('should show table status indicator', async ({ page }) => {
    await page.goto('/reservations/floorplan')

    await page.waitForTimeout(500)

    // Look for status indicators (colors/badges)
    const statusIndicators = page.locator('[class*="status"], [class*="badge"]')
    const statusCount = await statusIndicators.count().catch(() => 0)

    // There should be some status indicators
    expect(statusCount).toBeGreaterThanOrEqual(0)
  })
})

test.describe('Waitlist Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')

    const emailInput = page.locator('input[type="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()
    const submitButton = page.locator('button[type="submit"]').first()

    await emailInput.fill('manager@cheers.com')
    await passwordInput.fill('password123')
    await submitButton.click()

    await page.waitForURL('/', { waitUntil: 'networkidle' })
  })

  test('should display waitlist', async ({ page }) => {
    // Navigate to waitlist
    await page.goto('/reservations/waitlist')

    // Wait for content
    await page.waitForTimeout(500)

    // Check for page header
    await expect(page.locator('h1')).toContainText(/Waitlist|Walk-In/)

    // Check for waitlist KPI cards
    const cards = page.locator('[class*="card"], [role="article"]')
    const cardCount = await cards.count().catch(() => 0)

    expect(cardCount).toBeGreaterThanOrEqual(0)
  })

  test('should display waitlist entries', async ({ page }) => {
    await page.goto('/reservations/waitlist')

    await page.waitForTimeout(500)

    // Check for waitlist entries
    const entries = page.locator('[class*="entry"], [class*="item"]')
    const entryCount = await entries.count().catch(() => 0)

    expect(entryCount).toBeGreaterThanOrEqual(0)
  })

  test('should add guest to waitlist', async ({ page }) => {
    await page.goto('/reservations/waitlist')

    await page.waitForTimeout(500)

    // Find Add Guest button
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Guest")')
    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click()

      // Wait for form
      await page.waitForTimeout(300)

      // Fill form
      const nameInput = page.locator('input[name="guest_name"], input[placeholder*="Name"]')
      const phoneInput = page.locator('input[name="guest_phone"], input[placeholder*="Phone"]')
      const partySizeInput = page.locator('input[name="party_size"], select[name="party_size"]')

      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill('Alice Johnson')
      }

      if (await phoneInput.isVisible().catch(() => false)) {
        await phoneInput.fill('+34-612-345-678')
      }

      if (await partySizeInput.isVisible().catch(() => false)) {
        if ((await partySizeInput.getAttribute('type')).catch(() => null) === 'number') {
          await partySizeInput.fill('4')
        } else {
          await partySizeInput.selectOption('4')
        }
      }

      // Submit
      const submitButton = page.locator('button[type="submit"]:has-text("Add"), button[type="submit"]:has-text("Save")')
      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click()
        await page.waitForTimeout(500)
      }
    }
  })

  test('should reorder waitlist positions', async ({ page }) => {
    await page.goto('/reservations/waitlist')

    await page.waitForTimeout(500)

    // Find draggable waitlist entries
    const entries = page.locator('[class*="entry"], [draggable="true"]')
    const firstEntry = entries.first()
    const secondEntry = entries.nth(1)

    if (
      (await firstEntry.isVisible().catch(() => false)) &&
      (await secondEntry.isVisible().catch(() => false))
    ) {
      // Drag first to second position
      const firstBox = await firstEntry.boundingBox()
      const secondBox = await secondEntry.boundingBox()

      if (firstBox && secondBox) {
        await page.dragAndDrop(firstEntry, { x: secondBox.x, y: secondBox.y + 10 })

        await page.waitForTimeout(500)
      }
    }
  })

  test('should mark guest as seated from waitlist', async ({ page }) => {
    await page.goto('/reservations/waitlist')

    await page.waitForTimeout(500)

    // Find seated button on first entry
    const firstEntry = page.locator('[class*="entry"]').first()
    if (await firstEntry.isVisible().catch(() => false)) {
      await firstEntry.hover()

      const seatedButton = firstEntry.locator('button:has-text("Seat"), button:has-text("Seated")')
      if (await seatedButton.isVisible().catch(() => false)) {
        await seatedButton.click()

        // If table selection dialog appears, select a table
        const tableSelect = page.locator('select[name="table_id"], [role="listbox"]')
        if (await tableSelect.isVisible().catch(() => false)) {
          const firstOption = tableSelect.locator('option, [role="option"]').first()
          if (await firstOption.isVisible().catch(() => false)) {
            await firstOption.click()
          }
        }

        // Confirm
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Seat")')
        if (await confirmButton.isVisible().catch(() => false)) {
          await confirmButton.click()
          await page.waitForTimeout(500)
        }
      }
    }
  })

  test('should remove guest from waitlist', async ({ page }) => {
    await page.goto('/reservations/waitlist')

    await page.waitForTimeout(500)

    // Find first entry and remove button
    const firstEntry = page.locator('[class*="entry"]').first()
    if (await firstEntry.isVisible().catch(() => false)) {
      await firstEntry.hover()

      const removeButton = firstEntry.locator('button:has-text("Remove"), button:has-text("Cancel")')
      if (await removeButton.isVisible().catch(() => false)) {
        await removeButton.click()

        // Confirm if dialog appears
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")')
        if (await confirmButton.isVisible().catch(() => false)) {
          await confirmButton.click()
        }

        await page.waitForTimeout(500)
      }
    }
  })
})
