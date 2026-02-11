#!/usr/bin/env node

/**
 * PWA Screenshots Generator Script
 * Creates screenshot images for PWA manifest
 */

const fs = require('fs')
const path = require('path')

// Create SVG screenshots
const createMobileScreenshot = (width, height) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#0f172a"/>

  <!-- Status bar -->
  <rect width="${width}" height="40" fill="#1a2332"/>

  <!-- Header with Cheers logo -->
  <rect y="40" width="${width}" height="60" fill="#15202f"/>
  <text x="${width / 2}" y="85" font-family="system-ui" font-size="32" font-weight="bold" fill="#f59e0b" text-anchor="middle">Cheers</text>

  <!-- Navigation tabs -->
  <rect y="100" width="${width}" height="50" fill="#1f2937"/>
  <text x="40" y="135" font-family="system-ui" font-size="14" fill="#f59e0b">📊 Dashboard</text>
  <text x="40" y="160" font-family="system-ui" font-size="12" fill="#888">Staff • Menu • Stock</text>

  <!-- Main content cards -->
  <rect x="20" y="160" width="${width - 40}" height="80" fill="#1f2937" rx="8"/>
  <text x="40" y="190" font-family="system-us" font-size="16" font-weight="bold" fill="#fff">Today's Revenue</text>
  <text x="40" y="220" font-family="system-us" font-size="24" font-weight="bold" fill="#f59e0b">€2,450.50</text>

  <rect x="20" y="260" width="${width - 40}" height="80" fill="#1f2937" rx="8"/>
  <text x="40" y="290" font-family="system-us" font-size="16" font-weight="bold" fill="#fff">Staff On Duty</text>
  <text x="40" y="320" font-family="system-us" font-size="24" font-weight="bold" fill="#f59e0b">12 / 15</text>

  <rect x="20" y="360" width="${width - 40}" height="80" fill="#1f2937" rx="8"/>
  <text x="40" y="390" font-family="system-us" font-size="16" font-weight="bold" fill="#fff">Low Stock Items</text>
  <text x="40" y="420" font-family="system-us" font-size="24" font-weight="bold" fill="#f59e0b">3</text>

  <!-- Bottom action button -->
  <rect x="20" y="${height - 80}" width="${width - 40}" height="50" fill="#f59e0b" rx="8"/>
  <text x="${width / 2}" y="${height - 50}" font-family="system-ui" font-size="16" font-weight="bold" fill="#0f172a" text-anchor="middle">View Full Dashboard</text>
</svg>`

const createDesktopScreenshot = (width, height) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#0f172a"/>

  <!-- Top bar -->
  <rect width="${width}" height="60" fill="#1a2332"/>
  <text x="30" y="40" font-family="system-ui" font-size="28" font-weight="bold" fill="#f59e0b">GrandCafe Cheers Manager</text>
  <circle cx="${width - 40}" cy="30" r="20" fill="#f59e0b"/>

  <!-- Sidebar -->
  <rect width="250" height="${height}" fill="#1f2937"/>
  <text x="30" y="120" font-family="system-ui" font-size="14" font-weight="bold" fill="#f59e0b">📊 Dashboard</text>
  <text x="30" y="150" font-family="system-ui" font-size="14" fill="#aaa">👥 Staff</text>
  <text x="30" y="180" font-family="system-ui" font-size="14" fill="#aaa">🍽️ Menu</text>
  <text x="30" y="210" font-family="system-ui" font-size="14" fill="#aaa">📦 Stock</text>
  <text x="30" y="240" font-family="system-ui" font-size="14" fill="#aaa">💰 Sales</text>
  <text x="30" y="270" font-family="system-ui" font-size="14" fill="#aaa">📅 Events</text>
  <text x="30" y="300" font-family="system-ui" font-size="14" fill="#aaa">📱 Marketing</text>
  <text x="30" y="330" font-family="system-ui" font-size="14" fill="#aaa">💳 Finance</text>

  <!-- Main content area -->
  <rect x="280" y="80" width="${width - 300}" height="40" fill="#1a2332" rx="8"/>
  <text x="300" y="110" font-family="system-ui" font-size="24" font-weight="bold" fill="#fff">Dashboard</text>

  <!-- KPI Cards -->
  <rect x="280" y="140" width="300" height="120" fill="#1f2937" rx="8"/>
  <text x="300" y="165" font-family="system-ui" font-size="14" fill="#aaa">Today's Revenue</text>
  <text x="300" y="200" font-family="system-ui" font-size="28" font-weight="bold" fill="#f59e0b">€2,450.50</text>
  <text x="300" y="225" font-family="system-ui" font-size="12" fill="#aaa">↑ 12.5% from yesterday</text>

  <rect x="610" y="140" width="300" height="120" fill="#1f2937" rx="8"/>
  <text x="630" y="165" font-family="system-ui" font-size="14" fill="#aaa">Staff On Duty</text>
  <text x="630" y="200" font-family="system-ui" font-size="28" font-weight="bold" fill="#f59e0b">12 / 15</text>
  <text x="630" y="225" font-family="system-ui" font-size="12" fill="#aaa">1 on break, 2 absent</text>

  <rect x="940" y="140" width="300" height="120" fill="#1f2937" rx="8"/>
  <text x="960" y="165" font-family="system-ui" font-size="14" fill="#aaa">Stock Alerts</text>
  <text x="960" y="200" font-family="system-ui" font-size="28" font-weight="bold" fill="#f59e0b">3</text>
  <text x="960" y="225" font-family="system-ui" font-size="12" fill="#aaa">Items need restocking</text>

  <!-- Chart placeholder -->
  <rect x="280" y="280" width="960" height="200" fill="#1f2937" rx="8"/>
  <text x="300" y="310" font-family="system-ui" font-size="16" font-weight="bold" fill="#fff">Revenue Trend (Last 7 Days)</text>
  <line x1="320" y1="420" x2="1200" y2="420" stroke="#444" stroke-width="2"/>
  <!-- Simple bar chart -->
  <rect x="350" y="380" width="30" height="40" fill="#f59e0b" opacity="0.7"/>
  <rect x="420" y="370" width="30" height="50" fill="#f59e0b" opacity="0.8"/>
  <rect x="490" y="360" width="30" height="60" fill="#f59e0b" opacity="0.9"/>
  <rect x="560" y="350" width="30" height="70" fill="#f59e0b"/>
  <rect x="630" y="360" width="30" height="60" fill="#f59e0b" opacity="0.9"/>
  <rect x="700" y="375" width="30" height="45" fill="#f59e0b" opacity="0.8"/>
  <rect x="770" y="385" width="30" height="35" fill="#f59e0b" opacity="0.7"/>
</svg>`

const generateScreenshots = async () => {
  const screenshotsDir = path.join(__dirname, '../public/screenshots')

  try {
    const svgMobile = createMobileScreenshot(540, 720)
    const svgDesktop = createDesktopScreenshot(1920, 1080)

    // Write SVG files
    fs.writeFileSync(path.join(screenshotsDir, 'mobile.svg'), svgMobile)
    fs.writeFileSync(path.join(screenshotsDir, 'desktop.svg'), svgDesktop)

    console.log('✅ SVG screenshots created successfully')
    console.log('   - mobile.svg (540x720)')
    console.log('   - desktop.svg (1920x1080)')

    // Try to convert to PNG
    const { exec } = require('child_process')
    const util = require('util')
    const execPromise = util.promisify(exec)

    try {
      await execPromise(`convert ${path.join(screenshotsDir, 'mobile.svg')} ${path.join(screenshotsDir, 'mobile.png')}`)
      await execPromise(`convert ${path.join(screenshotsDir, 'desktop.svg')} ${path.join(screenshotsDir, 'desktop.png')}`)

      console.log('\n✅ PNG screenshots generated successfully')
      console.log('   - mobile.png')
      console.log('   - desktop.png')
    } catch (error) {
      console.log('\n⚠️  PNG conversion skipped (ImageMagick not found)')
      console.log('   SVG screenshots will be used.')
    }
  } catch (error) {
    console.error('❌ Error generating screenshots:', error.message)
    process.exit(1)
  }
}

generateScreenshots()
