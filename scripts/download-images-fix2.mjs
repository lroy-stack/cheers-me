import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const envContent = fs.readFileSync('.env.local', 'utf8')
const env = {}
for (const line of envContent.split('\n')) {
  const idx = line.indexOf('=')
  if (idx > 0 && line[0] !== '#') {
    env[line.substring(0, idx).trim()] = line.substring(idx + 1).trim()
  }
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const BUCKET = 'menu-images'
const BASE_PATH = 'items'
const BASE_URL = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`

// Verified working URLs
const FIX_IMAGES = {
  // Caipirinha - use a lime cocktail image
  'd0000001-0000-0000-0000-000000000002': { name: 'caipirinha', url: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&h=400&fit=crop' },
  // Daiquiri - tropical cocktail
  'd0000001-0000-0000-0000-000000000006': { name: 'daiquiri', url: 'https://images.unsplash.com/photo-1560512823-829485b8bf24?w=600&h=400&fit=crop' },
  // Long Island - tall cocktail glass
  'd0000001-0000-0000-0000-000000000009': { name: 'long-island', url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&h=400&fit=crop' },
  // Martini - classic glass
  'd0000001-0000-0000-0000-000000000016': { name: 'martini', url: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&h=400&fit=crop' },
  // Tom Collins - tall glass lemon
  'd0000001-0000-0000-0000-000000000017': { name: 'tom-collins', url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&h=400&fit=crop' },
}

async function downloadAndUpload(itemId, { name, url }) {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.error(`  FAIL download ${name}: HTTP ${res.status}`)
      return null
    }
    const buffer = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('content-type') || 'image/jpeg'

    const storagePath = `${BASE_PATH}/${name}.jpg`
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType, upsert: true })

    if (uploadError) {
      console.error(`  FAIL upload ${name}:`, uploadError.message)
      return null
    }

    const publicUrl = `${BASE_URL}/${storagePath}`

    const { error: dbError } = await supabase
      .from('menu_items')
      .update({ photo_url: publicUrl })
      .eq('id', itemId)

    if (dbError) {
      console.error(`  FAIL db update ${name}:`, dbError.message)
      return null
    }

    console.log(`  OK ${name} -> ${publicUrl}`)
    return publicUrl
  } catch (err) {
    console.error(`  ERROR ${name}:`, err.message)
    return null
  }
}

async function main() {
  const entries = Object.entries(FIX_IMAGES)
  console.log(`Fixing ${entries.length} remaining images...`)

  let success = 0
  for (const [id, info] of entries) {
    const result = await downloadAndUpload(id, info)
    if (result) success++
    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`Done! ${success}/${entries.length} fixed`)
}

main()
