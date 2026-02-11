#!/usr/bin/env node

/**
 * PWA Icon Generator Script
 * Creates 192x192 and 512x512 icons for PWA manifest
 * Also creates maskable versions for adaptive icons
 */

const fs = require('fs')
const path = require('path')

// SVG logo data (warm neutrals + amber accent for GrandCafe theme)
const createSvgIcon = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="#0f172a"/>

  <!-- Cheers glass icon with amber accent -->
  <g transform="translate(${size / 4}, ${size / 4}) scale(${size / 512})">
    <!-- Glass body -->
    <path d="M 180 80 L 170 240 Q 170 280 200 290 L 260 290 Q 290 280 290 240 L 280 80 Z"
          fill="none" stroke="#f59e0b" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- Bubbles for drinks -->
    <circle cx="200" cy="140" r="12" fill="#f59e0b" opacity="0.7"/>
    <circle cx="240" cy="160" r="10" fill="#f59e0b" opacity="0.6"/>
    <circle cx="220" cy="200" r="14" fill="#f59e0b" opacity="0.5"/>
    <circle cx="255" cy="220" r="9" fill="#f59e0b" opacity="0.4"/>

    <!-- Handle -->
    <path d="M 290 140 Q 340 140 340 190 Q 340 240 290 240"
          fill="none" stroke="#f59e0b" stroke-width="12" stroke-linecap="round"/>
  </g>

  <!-- App title -->
  <text x="${size / 2}" y="${size - 40}"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="${Math.round(size / 6)}"
        font-weight="bold"
        fill="#f59e0b"
        text-anchor="middle">CHEERS</text>
</svg>`

const createMaskableSvgIcon = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Full circle background for maskable icon -->
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2.2}" fill="#0f172a"/>

  <!-- Cheers glass icon with amber accent -->
  <g transform="translate(${size / 4}, ${size / 4}) scale(${size / 512})">
    <!-- Glass body -->
    <path d="M 180 80 L 170 240 Q 170 280 200 290 L 260 290 Q 290 280 290 240 L 280 80 Z"
          fill="none" stroke="#f59e0b" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- Bubbles for drinks -->
    <circle cx="200" cy="140" r="12" fill="#f59e0b" opacity="0.7"/>
    <circle cx="240" cy="160" r="10" fill="#f59e0b" opacity="0.6"/>
    <circle cx="220" cy="200" r="14" fill="#f59e0b" opacity="0.5"/>
    <circle cx="255" cy="220" r="9" fill="#f59e0b" opacity="0.4"/>

    <!-- Handle -->
    <path d="M 290 140 Q 340 140 340 190 Q 340 240 290 240"
          fill="none" stroke="#f59e0b" stroke-width="12" stroke-linecap="round"/>
  </g>
</svg>`

// Create icon files using Python with PIL if available, otherwise fallback to base64 SVG
const generateIcons = async () => {
  const iconsDir = path.join(__dirname, '../public/icons')

  try {
    // Create SVG versions first
    const svg192 = createSvgIcon(192)
    const svg512 = createSvgIcon(512)
    const svgMaskable192 = createMaskableSvgIcon(192)
    const svgMaskable512 = createMaskableSvgIcon(512)

    // Write SVG files
    fs.writeFileSync(path.join(iconsDir, 'icon-192.svg'), svg192)
    fs.writeFileSync(path.join(iconsDir, 'icon-512.svg'), svg512)
    fs.writeFileSync(path.join(iconsDir, 'icon-192-maskable.svg'), svgMaskable192)
    fs.writeFileSync(path.join(iconsDir, 'icon-512-maskable.svg'), svgMaskable512)

    console.log('✅ SVG icons created successfully')
    console.log('   - icon-192.svg')
    console.log('   - icon-512.svg')
    console.log('   - icon-192-maskable.svg')
    console.log('   - icon-512-maskable.svg')

    // Try to convert to PNG using ImageMagick or similar
    const { exec } = require('child_process')
    const util = require('util')
    const execPromise = util.promisify(exec)

    try {
      // Try converting SVG to PNG using ImageMagick
      await execPromise(`convert ${path.join(iconsDir, 'icon-192.svg')} ${path.join(iconsDir, 'icon-192.png')}`)
      await execPromise(`convert ${path.join(iconsDir, 'icon-512.svg')} ${path.join(iconsDir, 'icon-512.png')}`)
      await execPromise(`convert ${path.join(iconsDir, 'icon-192-maskable.svg')} ${path.join(iconsDir, 'icon-192-maskable.png')}`)
      await execPromise(`convert ${path.join(iconsDir, 'icon-512-maskable.svg')} ${path.join(iconsDir, 'icon-512-maskable.png')}`)

      console.log('\n✅ PNG icons generated successfully')
      console.log('   - icon-192.png')
      console.log('   - icon-512.png')
      console.log('   - icon-192-maskable.png')
      console.log('   - icon-512-maskable.png')
    } catch (error) {
      console.log('\n⚠️  ImageMagick not found - PNG conversion skipped')
      console.log('   SVG icons will be used. To generate PNG versions, install ImageMagick:')
      console.log('   macOS: brew install imagemagick')
      console.log('   Linux: sudo apt-get install imagemagick')
      console.log('   Then run: convert icon-192.svg icon-192.png')
    }
  } catch (error) {
    console.error('❌ Error generating icons:', error.message)
    process.exit(1)
  }
}

generateIcons()
