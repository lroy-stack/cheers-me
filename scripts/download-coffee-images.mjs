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

const IMAGES = {
  'f0000007-0000-0000-0000-000000000001': { name: 'espresso', url: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=600&h=400&fit=crop' },
  'f0000007-0000-0000-0000-000000000002': { name: 'double-espresso', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefda?w=600&h=400&fit=crop' },
  'f0000007-0000-0000-0000-000000000003': { name: 'americano', url: 'https://images.unsplash.com/photo-1551030173-122aabc4489c?w=600&h=400&fit=crop' },
  'f0000007-0000-0000-0000-000000000004': { name: 'cappuccino', url: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&h=400&fit=crop' },
  'f0000007-0000-0000-0000-000000000005': { name: 'latte', url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&h=400&fit=crop' },
  'f0000007-0000-0000-0000-000000000006': { name: 'flat-white', url: 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=600&h=400&fit=crop' },
  'f0000007-0000-0000-0000-000000000007': { name: 'latte-macchiato', url: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&h=400&fit=crop' },
  'f0000007-0000-0000-0000-000000000008': { name: 'tea', url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&h=400&fit=crop' },
  'f0000007-0000-0000-0000-000000000009': { name: 'hot-chocolate', url: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=600&h=400&fit=crop' },
  'f0000007-0000-0000-0000-000000000010': { name: 'iced-coffee', url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&h=400&fit=crop' },
  'f0000007-0000-0000-0000-000000000011': { name: 'iced-latte', url: 'https://images.unsplash.com/photo-1592663527359-cf6642f54cff?w=600&h=400&fit=crop' },
  'f0000007-0000-0000-0000-000000000012': { name: 'cortado', url: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=600&h=400&fit=crop' },
  'f0000007-0000-0000-0000-000000000013': { name: 'affogato', url: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=600&h=400&fit=crop' },
  'f0000007-0000-0000-0000-000000000014': { name: 'chai-latte', url: 'https://images.unsplash.com/photo-1557006021-b85faa2bc5e2?w=600&h=400&fit=crop' },
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

    console.log(`  OK ${name}`)
    return publicUrl
  } catch (err) {
    console.error(`  ERROR ${name}:`, err.message)
    return null
  }
}

async function main() {
  const entries = Object.entries(IMAGES)
  console.log(`Uploading ${entries.length} coffee images...`)

  let success = 0
  for (const [id, info] of entries) {
    const result = await downloadAndUpload(id, info)
    if (result) success++
    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`\nDone! ${success}/${entries.length}`)
}

main()
