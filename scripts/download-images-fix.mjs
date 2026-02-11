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

// Fixed URLs for items that failed
const FIX_IMAGES = {
  // Serrano ham
  'f0000001-0000-0000-0000-000000000005': { name: 'serrano-ham', url: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600&h=400&fit=crop' },
  // Caipirinha
  'd0000001-0000-0000-0000-000000000002': { name: 'caipirinha', url: 'https://images.unsplash.com/photo-1497534446932-c925d587a741?w=600&h=400&fit=crop' },
  // Pina Colada
  'd0000001-0000-0000-0000-000000000003': { name: 'pina-colada', url: 'https://images.unsplash.com/photo-1582196016295-f8c8bd4b3a99?w=600&h=400&fit=crop' },
  // Daiquiri
  'd0000001-0000-0000-0000-000000000006': { name: 'daiquiri', url: 'https://images.unsplash.com/photo-1497534446932-c925d587a741?w=600&h=400&fit=crop' },
  // Long Island
  'd0000001-0000-0000-0000-000000000009': { name: 'long-island', url: 'https://images.unsplash.com/photo-1582056615449-21ee3508c5d7?w=600&h=400&fit=crop' },
  // Whiskey Sour
  'd0000001-0000-0000-0000-000000000014': { name: 'whiskey-sour', url: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&h=400&fit=crop' },
  // Manhattan
  'd0000001-0000-0000-0000-000000000015': { name: 'manhattan', url: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&h=400&fit=crop' },
  // Martini
  'd0000001-0000-0000-0000-000000000016': { name: 'martini', url: 'https://images.unsplash.com/photo-1582056615449-21ee3508c5d7?w=600&h=400&fit=crop' },
  // Tom Collins
  'd0000001-0000-0000-0000-000000000017': { name: 'tom-collins', url: 'https://images.unsplash.com/photo-1582056615449-21ee3508c5d7?w=600&h=400&fit=crop' },
  // Paloma
  'd0000001-0000-0000-0000-000000000018': { name: 'paloma', url: 'https://images.unsplash.com/photo-1582196016295-f8c8bd4b3a99?w=600&h=400&fit=crop' },
  // Amaretto Sour
  'd0000001-0000-0000-0000-000000000021': { name: 'amaretto-sour', url: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&h=400&fit=crop' },
  // Sex on the Beach
  'd0000001-0000-0000-0000-000000000023': { name: 'sex-on-beach', url: 'https://images.unsplash.com/photo-1582196016295-f8c8bd4b3a99?w=600&h=400&fit=crop' },
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
  console.log(`Fixing ${entries.length} failed images...`)

  let success = 0
  for (const [id, info] of entries) {
    const result = await downloadAndUpload(id, info)
    if (result) success++
    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`Done! ${success}/${entries.length} fixed`)
}

main()
