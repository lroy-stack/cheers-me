#!/usr/bin/env npx tsx
/**
 * Seed menu images from free stock photos
 * Usage: npx tsx scripts/seed-menu-images.ts
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 */
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { join } from 'path'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

interface ManifestData {
  categories: Record<string, { default: string; items: Record<string, string> }>
}

async function main() {
  const manifest: ManifestData = JSON.parse(
    readFileSync(join(__dirname, 'data', 'menu-image-manifest.json'), 'utf-8')
  )

  // Fetch all menu items with their categories
  const { data: items, error } = await supabase
    .from('menu_items')
    .select('id, name_en, photo_url, menu_categories!inner(name_en)')
    .is('photo_url', null)
    .order('name_en')

  if (error) {
    console.error('Error fetching items:', error.message)
    process.exit(1)
  }

  console.log(`Found ${items?.length || 0} items without images`)

  let success = 0
  let failed = 0

  for (const item of items || []) {
    const categoryName = (item as any).menu_categories?.name_en
    const category = manifest.categories[categoryName]

    if (!category) {
      console.log(`  SKIP: No manifest for category "${categoryName}"`)
      failed++
      continue
    }

    const imageUrl = category.items[item.name_en] || category.default

    try {
      // Download image
      const response = await fetch(imageUrl)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Optimize with sharp: resize + WebP
      const optimized = await sharp(buffer)
        .resize(800, 600, { fit: 'cover' })
        .webp({ quality: 80 })
        .toBuffer()

      // Upload to Supabase storage
      const path = `${item.id}/${Date.now()}.webp`
      const { error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(path, optimized, {
          contentType: 'image/webp',
          cacheControl: '3600',
        })

      if (uploadError) throw uploadError

      // Get public URL and update item
      const { data: { publicUrl } } = supabase.storage
        .from('menu-images')
        .getPublicUrl(path)

      const { error: updateError } = await supabase
        .from('menu_items')
        .update({ photo_url: publicUrl })
        .eq('id', item.id)

      if (updateError) throw updateError

      success++
      console.log(`  OK: ${item.name_en} (${(optimized.length / 1024).toFixed(0)}KB)`)
    } catch (err) {
      failed++
      console.log(`  FAIL: ${item.name_en}: ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log(`\nDone: ${success} seeded, ${failed} failed out of ${items?.length || 0} items`)
}

main()
