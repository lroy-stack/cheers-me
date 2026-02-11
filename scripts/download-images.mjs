import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Parse .env.local
const envContent = fs.readFileSync('.env.local', 'utf8')
const env = {}
for (const line of envContent.split('\n')) {
  const idx = line.indexOf('=')
  if (idx > 0 && line[0] !== '#') {
    env[line.substring(0, idx).trim()] = line.substring(idx + 1).trim()
  }
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// Unsplash source URLs (free, no API key needed for hotlinking via source.unsplash.com)
// Format: https://images.unsplash.com/photo-ID?w=600&h=400&fit=crop

// Maps: item_id -> { filename, unsplash_url }
const FOOD_IMAGES = {
  // Breakfast & Lunch
  'f0000001-0000-0000-0000-000000000001': { name: 'fried-eggs-bread', url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&h=400&fit=crop' },
  'f0000001-0000-0000-0000-000000000002': { name: 'scrambled-eggs', url: 'https://images.unsplash.com/photo-1551404973-761c83cd8339?w=600&h=400&fit=crop' },
  'f0000001-0000-0000-0000-000000000003': { name: 'tuna-sandwich', url: 'https://images.unsplash.com/photo-1554433607-66b5efe9d304?w=600&h=400&fit=crop' },
  'f0000001-0000-0000-0000-000000000004': { name: 'carpaccio-sandwich', url: 'https://images.unsplash.com/photo-1539252554453-80ab65ce3586?w=600&h=400&fit=crop' },
  'f0000001-0000-0000-0000-000000000005': { name: 'serrano-ham', url: 'https://images.unsplash.com/photo-1619221882266-c3a6e02e4de0?w=600&h=400&fit=crop' },
  'f0000001-0000-0000-0000-000000000006': { name: 'cheese-salami-sandwich', url: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=600&h=400&fit=crop' },
  'f0000001-0000-0000-0000-000000000007': { name: 'goat-cheese-sandwich', url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&h=400&fit=crop' },
  'f0000001-0000-0000-0000-000000000008': { name: 'avocado-toast', url: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=600&h=400&fit=crop' },
  'f0000001-0000-0000-0000-000000000009': { name: 'croquettes', url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&h=400&fit=crop' },
  'f0000001-0000-0000-0000-000000000010': { name: 'chicken-club', url: 'https://images.unsplash.com/photo-1550507992-eb63ffee0847?w=600&h=400&fit=crop' },
  'f0000001-0000-0000-0000-000000000011': { name: 'salmon-club', url: 'https://images.unsplash.com/photo-1521390188846-e2a3a97453a0?w=600&h=400&fit=crop' },
  'f0000001-0000-0000-0000-000000000012': { name: 'chicken-satay', url: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600&h=400&fit=crop' },
  'f0000001-0000-0000-0000-000000000013': { name: 'soup-day', url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&h=400&fit=crop' },

  // Burgers & Schnitzel
  'f0000002-0000-0000-0000-000000000002': { name: 'chicken-cheese-burger', url: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=600&h=400&fit=crop' },
  'f0000002-0000-0000-0000-000000000003': { name: 'wiener-schnitzel', url: 'https://images.unsplash.com/photo-1599921841143-819065a55cc6?w=600&h=400&fit=crop' },

  // Pasta
  'f0000003-0000-0000-0000-000000000001': { name: 'spaghetti-bolognese', url: 'https://images.unsplash.com/photo-1622973536968-3ead9e780960?w=600&h=400&fit=crop' },
  'f0000003-0000-0000-0000-000000000003': { name: 'salmon-pasta', url: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600&h=400&fit=crop' },
  'f0000003-0000-0000-0000-000000000004': { name: 'vegetarian-pasta', url: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600&h=400&fit=crop' },

  // Salads
  'f0000004-0000-0000-0000-000000000002': { name: 'caesar-salad', url: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=600&h=400&fit=crop' },
  'f0000004-0000-0000-0000-000000000003': { name: 'greek-salad', url: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&h=400&fit=crop' },
  'f0000004-0000-0000-0000-000000000004': { name: 'carpaccio-truffle-salad', url: 'https://images.unsplash.com/photo-1608032077018-c9aad9565d29?w=600&h=400&fit=crop' },

  // Desserts
  'f0000005-0000-0000-0000-000000000001': { name: 'brownie', url: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=600&h=400&fit=crop' },
  'f0000005-0000-0000-0000-000000000003': { name: 'ny-cheesecake', url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&h=400&fit=crop' },
  'f0000005-0000-0000-0000-000000000004': { name: 'apple-crumble', url: 'https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?w=600&h=400&fit=crop' },
  'f0000005-0000-0000-0000-000000000005': { name: 'carrot-cake', url: 'https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=600&h=400&fit=crop' },
  'f0000005-0000-0000-0000-000000000006': { name: 'dame-blanche', url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&h=400&fit=crop' },
  'f0000005-0000-0000-0000-000000000007': { name: 'strawberry-coupe', url: 'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=600&h=400&fit=crop' },

  // Sauces & Sides
  'f0000006-0000-0000-0000-000000000002': { name: 'side-salad', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop' },
}

const COCKTAIL_IMAGES = {
  'd0000001-0000-0000-0000-000000000002': { name: 'caipirinha', url: 'https://images.unsplash.com/photo-1541546006121-e8e0e6bfa45f?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000003': { name: 'pina-colada', url: 'https://images.unsplash.com/photo-1587223962217-f4fd24e8e4b4?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000004': { name: 'margarita', url: 'https://images.unsplash.com/photo-1556855810-ac404aa91e85?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000005': { name: 'cosmopolitan', url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000006': { name: 'daiquiri', url: 'https://images.unsplash.com/photo-1587223962217-f4fd24e8e4b4?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000008': { name: 'dark-stormy', url: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000009': { name: 'long-island', url: 'https://images.unsplash.com/photo-1609345265499-2133bbeb0ce5?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000010': { name: 'mai-tai', url: 'https://images.unsplash.com/photo-1510626176961-4b57d4fbad03?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000011': { name: 'gin-tonic', url: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000012': { name: 'negroni', url: 'https://images.unsplash.com/photo-1551751299-1b51cab2694c?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000013': { name: 'old-fashioned', url: 'https://images.unsplash.com/photo-1470338745628-171cf53de3a8?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000014': { name: 'whiskey-sour', url: 'https://images.unsplash.com/photo-1560963689-b95c40be5d49?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000015': { name: 'manhattan', url: 'https://images.unsplash.com/photo-1575023782532-2ebb27df7448?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000016': { name: 'martini', url: 'https://images.unsplash.com/photo-1575650772416-627f5ca5ff3e?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000017': { name: 'tom-collins', url: 'https://images.unsplash.com/photo-1560963689-02f8f5ce4d5a?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000018': { name: 'paloma', url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed514?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000019': { name: 'tequila-sunrise', url: 'https://images.unsplash.com/photo-1546171753-97d7676e4602?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000020': { name: 'cuba-libre', url: 'https://images.unsplash.com/photo-1570598912132-0ba1dc952b7d?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000021': { name: 'amaretto-sour', url: 'https://images.unsplash.com/photo-1587223962217-f4fd24e8e4b4?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000023': { name: 'sex-on-beach', url: 'https://images.unsplash.com/photo-1587223962217-f4fd24e8e4b4?w=600&h=400&fit=crop' },
  // Coffee cocktails
  'd0000002-0000-0000-0000-000000000002': { name: 'irish-coffee', url: 'https://images.unsplash.com/photo-1521302080334-4bebac2763a6?w=600&h=400&fit=crop' },
  'd0000002-0000-0000-0000-000000000003': { name: 'baileys-coffee', url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&h=400&fit=crop' },
  'd0000002-0000-0000-0000-000000000004': { name: 'amaretto-coffee', url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&h=400&fit=crop' },
  // Spritz & Sangria
  'd0000003-0000-0000-0000-000000000002': { name: 'limoncello-spritz', url: 'https://images.unsplash.com/photo-1560512823-829485b8bf24?w=600&h=400&fit=crop' },
  'd0000003-0000-0000-0000-000000000003': { name: 'hugo-spritz', url: 'https://images.unsplash.com/photo-1560512823-829485b8bf24?w=600&h=400&fit=crop' },
  'd0000003-0000-0000-0000-000000000004': { name: 'red-sangria', url: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=600&h=400&fit=crop' },
  'd0000003-0000-0000-0000-000000000005': { name: 'white-sangria', url: 'https://images.unsplash.com/photo-1560512823-829485b8bf24?w=600&h=400&fit=crop' },
}

const ALL_IMAGES = { ...FOOD_IMAGES, ...COCKTAIL_IMAGES }

const BUCKET = 'menu-images'
const BASE_PATH = 'items'
const BASE_URL = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`

async function downloadAndUpload(itemId, { name, url }) {
  try {
    // Download image
    const res = await fetch(url)
    if (!res.ok) {
      console.error(`  FAIL download ${name}: HTTP ${res.status}`)
      return null
    }
    const buffer = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('content-type') || 'image/jpeg'

    // Upload to Supabase
    const storagePath = `${BASE_PATH}/${name}.jpg`
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType,
        upsert: true,
      })

    if (uploadError) {
      console.error(`  FAIL upload ${name}:`, uploadError.message)
      return null
    }

    const publicUrl = `${BASE_URL}/${storagePath}`

    // Update DB
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
  const entries = Object.entries(ALL_IMAGES)
  console.log(`Processing ${entries.length} images...`)
  console.log(`  Food: ${Object.keys(FOOD_IMAGES).length}`)
  console.log(`  Cocktails: ${Object.keys(COCKTAIL_IMAGES).length}`)
  console.log('')

  let success = 0
  let fail = 0

  // Process in batches of 5 to avoid rate limiting
  for (let i = 0; i < entries.length; i += 5) {
    const batch = entries.slice(i, i + 5)
    const results = await Promise.all(
      batch.map(([id, info]) => downloadAndUpload(id, info))
    )
    success += results.filter(Boolean).length
    fail += results.filter(r => !r).length

    // Small delay between batches
    if (i + 5 < entries.length) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  console.log('')
  console.log(`Done! ${success} ok, ${fail} failed out of ${entries.length} total`)
}

main()
