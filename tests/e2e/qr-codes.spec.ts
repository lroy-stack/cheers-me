import { test, expect } from '@playwright/test'

test.describe('QR Codes', () => {
  // These tests require authentication as manager
  test.skip(true, 'Requires auth setup - run manually with test user')

  test('displays QR code for selected table', async ({ page }) => {
    await page.goto('/reservations/floorplan')

    // Select a table
    const table = page.locator('[data-testid="table"], .table-element').first()
    await table.click()

    // QR section should be visible
    await expect(page.getByText('QR Code')).toBeVisible()
  })

  test('generates all QR codes', async ({ page }) => {
    await page.goto('/reservations/floorplan')

    // Click generate all button
    const generateBtn = page.getByText(/Generate All QR|Generar todos/)
    await generateBtn.click()

    // Wait for success toast
    await expect(page.getByText(/generated|generado/i)).toBeVisible({ timeout: 30000 })
  })

  test('downloads QR PDF', async ({ page }) => {
    await page.goto('/reservations/floorplan')

    // Click download button
    const downloadPromise = page.waitForEvent('download')
    const downloadBtn = page.getByText(/Download QR PDF|Descargar QR/)
    await downloadBtn.click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('qr-codes')
  })

  test('QR code links to digital menu', async ({ page }) => {
    // Navigate to a QR image URL directly
    const response = await page.goto('/menu/digital?table=T01')
    expect(response?.ok()).toBeTruthy()

    // Menu should load
    await expect(page.getByText('GrandCafe Cheers')).toBeVisible()
  })
})
