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
  // === REMAINING COCKTAILS (unique URLs) ===
  'd0000001-0000-0000-0000-000000000024': { name: 'blue-lagoon', url: 'https://images.unsplash.com/photo-1630071121741-d52aa221e9e0?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000025': { name: 'midori-sour', url: 'https://images.unsplash.com/photo-1603213339651-f39f388f479f?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000026': { name: 'bramble', url: 'https://images.unsplash.com/photo-1713774786475-95a1e13b5572?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000027': { name: 'gimlet', url: 'https://images.unsplash.com/photo-1632739186268-832c6a1b8850?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000028': { name: 'sidecar', url: 'https://images.unsplash.com/photo-1582084954495-05dbef5a25be?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000029': { name: 'rum-punch', url: 'https://images.unsplash.com/photo-1692746931486-22b6c7feb80e?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000030': { name: 'hurricane', url: 'https://images.unsplash.com/photo-1700760933412-d396694e703e?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000031': { name: 'zombie', url: 'https://images.unsplash.com/photo-1571183911579-687725adb5f8?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000032': { name: 'malibu-sunset', url: 'https://images.unsplash.com/photo-1618924385085-aa725b876250?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000033': { name: 'gin-fizz', url: 'https://images.unsplash.com/photo-1587223962930-cb7f31384c19?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000034': { name: 'vodka-martini', url: 'https://images.unsplash.com/photo-1651381850425-204da28f1cf8?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000035': { name: 'strawberry-daiquiri', url: 'https://images.unsplash.com/photo-1625311207423-a570466f1d15?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000036': { name: 'passion-fruit-martini', url: 'https://images.unsplash.com/photo-1629716919693-87f3080cb2a8?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000037': { name: 'french-75', url: 'https://images.unsplash.com/photo-1664459826230-5952f6f7eed4?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000038': { name: 'boulevardier', url: 'https://images.unsplash.com/photo-1643068476805-0385f7d11b6d?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000039': { name: 'last-word', url: 'https://images.unsplash.com/photo-1682630064338-e114ade226a2?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000040': { name: 'jungle-bird', url: 'https://images.unsplash.com/photo-1633151361353-0c9fb8f72c46?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000041': { name: 'cheers-to-you', url: 'https://images.unsplash.com/photo-1548808928-20b406573d30?w=600&h=400&fit=crop' },
  'd0000001-0000-0000-0000-000000000022': { name: 'pisco-sour', url: 'https://images.unsplash.com/photo-1696594935685-1ad6ba69e83e?w=600&h=400&fit=crop' },

  // === BEERS (unique per brand type) ===
  '3c589659-8319-41b0-ab60-2fa813296abf': { name: 'guinness', url: 'https://images.unsplash.com/photo-1612707584807-c89a4a3764a9?w=600&h=400&fit=crop' },
  '73181014-00f6-4500-944d-51fe505f6de9': { name: 'corona', url: 'https://images.unsplash.com/photo-1592311421893-b22f382c1aa9?w=600&h=400&fit=crop' },
  '90a6e798-cc3a-459d-8445-097942cef23c': { name: 'heineken', url: 'https://images.unsplash.com/photo-1618885472179-5e474019f2a9?w=600&h=400&fit=crop' },
  // Generic craft/lager beer for the rest
  'e8a5a0c2-da64-4e67-89a6-b401231fa43f': { name: 'alhambra-reserva', url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&h=400&fit=crop' },
  'f70e3916-2970-4fc2-aa91-85cba9ea2c8a': { name: 'amstel', url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&h=400&fit=crop' },
  '89e8d3c7-8f11-405c-870a-4b8b241c61d8': { name: 'cruzcampo', url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&h=400&fit=crop' },
  '8992084c-3378-4a52-85b8-fee7180a489d': { name: 'desperados', url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&h=400&fit=crop' },
  'aeaa12cb-1a7e-4489-9022-2de64da48dca': { name: 'duvel', url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&h=400&fit=crop' },
  '5b635793-ae26-4944-973b-6bb9dd99b39d': { name: 'erdinger', url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&h=400&fit=crop' },
  '5d94c36c-38e1-40f1-8cbd-e1040f6e5afe': { name: 'estrella-damm', url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&h=400&fit=crop' },
  'cda6d61c-315d-416c-ae45-2c623a2c007d': { name: 'grimbergen', url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&h=400&fit=crop' },
  'be405f99-6bec-4365-ab06-1d7124d5513e': { name: 'inedit', url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&h=400&fit=crop' },
  'bb1a0779-fe9c-40d8-abd2-2c2f79f73dce': { name: 'kilkenny', url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&h=400&fit=crop' },
  'db7f0299-0ac9-4627-8380-54d03a844af7': { name: 'la-trappe', url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&h=400&fit=crop' },
  '88d9e323-fb47-4d2e-a544-66e560ba769f': { name: 'la-virgen-ipa', url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&h=400&fit=crop' },
  'f2ba511f-67f4-419f-8f0a-5a6e36d7dd2b': { name: 'leffe', url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&h=400&fit=crop' },
  'e6a6cbbf-dbbe-413b-a731-352cff49c498': { name: 'mahou', url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&h=400&fit=crop' },
  '060ff13e-d47f-486a-bab6-dd1059ee3b61': { name: 'moritz', url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&h=400&fit=crop' },
  'c190c043-d61b-42d6-a420-ebe9c667f9de': { name: 'paulaner', url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&h=400&fit=crop' },
  '10db599f-e081-47c9-96da-8dc45b963dc0': { name: 'peroni', url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&h=400&fit=crop' },
  '8addf07d-9b2f-4b32-860c-b0a3e550f457': { name: 'san-miguel', url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&h=400&fit=crop' },
  'f18b4026-918c-4412-a56f-fac6fd00b581': { name: 'voll-damm', url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&h=400&fit=crop' },

  // === WINES & CHAMPAGNE ===
  '29115e69-0e96-49b1-97bd-1caf72b3cc5b': { name: 'bottle-red-wine', url: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=600&h=400&fit=crop' },
  '120340d1-957f-4f79-8e0d-81586e64b7ff': { name: 'bottle-rose-wine', url: 'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?w=600&h=400&fit=crop' },
  '1598e245-f5ab-4fbb-8689-52abc74c0b42': { name: 'bottle-white-wine', url: 'https://images.unsplash.com/photo-1597905722448-a1df7c00000a?w=600&h=400&fit=crop' },
  'ecd4b309-f992-4a20-a615-35f73ec4be7f': { name: 'bottle-champagne', url: 'https://images.unsplash.com/photo-1640947111243-af3c6432d867?w=600&h=400&fit=crop' },
  '60ce1aab-05cd-489e-b209-18cee9f4ad42': { name: 'cava-glass', url: 'https://images.unsplash.com/photo-1640947111243-af3c6432d867?w=600&h=400&fit=crop' },
  'f404d52e-44e7-45f0-947b-54f9349169f4': { name: 'champagne-glass', url: 'https://images.unsplash.com/photo-1640947111243-af3c6432d867?w=600&h=400&fit=crop' },
  '49e01e55-bbe8-4ba8-8351-322914737e95': { name: 'red-wine-glass', url: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=600&h=400&fit=crop' },
  '4e8655ad-0e06-424a-b482-d34c6da3424b': { name: 'rose-wine-glass', url: 'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?w=600&h=400&fit=crop' },
  '8b7ff68f-9717-438e-a058-d27c506d6945': { name: 'white-wine-glass', url: 'https://images.unsplash.com/photo-1597905722448-a1df7c00000a?w=600&h=400&fit=crop' },
  '308cd541-a956-4109-a981-257fbab94a58': { name: 'sangria-jug', url: 'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?w=600&h=400&fit=crop' },

  // === SOFT DRINKS ===
  '7c186360-47f0-4aad-b844-dd5e574def72': { name: 'coca-cola', url: 'https://images.unsplash.com/photo-1610732477615-76efa5bd41f2?w=600&h=400&fit=crop' },
  'c4184e3e-1a1f-4c3d-b95d-cfe8b9446cbd': { name: 'coca-cola-zero', url: 'https://images.unsplash.com/photo-1610732477615-76efa5bd41f2?w=600&h=400&fit=crop' },
  '657f618c-6bb1-434c-9af3-f85aad8d0f4a': { name: 'coffee-tea', url: 'https://images.unsplash.com/photo-1635090976010-d3f6dfbb1bac?w=600&h=400&fit=crop' },
  '69951494-2a0c-490f-ad57-6cf204fc021f': { name: 'fanta-orange', url: 'https://images.unsplash.com/photo-1610732477615-76efa5bd41f2?w=600&h=400&fit=crop' },
  '14556ad6-fa7a-4962-b0e4-fa0bfa8786f0': { name: 'orange-juice', url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&h=400&fit=crop' },
  '0e9c2fcd-6f36-401b-8494-bbd168a6926e': { name: 'red-bull', url: 'https://images.unsplash.com/photo-1610732477615-76efa5bd41f2?w=600&h=400&fit=crop' },
  '123905d3-f2a0-4485-b433-199eb2abdc40': { name: 'sprite', url: 'https://images.unsplash.com/photo-1610732477615-76efa5bd41f2?w=600&h=400&fit=crop' },
  '829fa78c-2780-4760-95a9-699f36907bfe': { name: 'tonic-water', url: 'https://images.unsplash.com/photo-1610732477615-76efa5bd41f2?w=600&h=400&fit=crop' },
  '1e82a49f-6518-4f94-ab25-7059c75ae81e': { name: 'sparkling-water', url: 'https://images.unsplash.com/photo-1610732477615-76efa5bd41f2?w=600&h=400&fit=crop' },
  'eeacd68c-3bc3-41cd-8972-defe4a4d9968': { name: 'still-water', url: 'https://images.unsplash.com/photo-1610732477615-76efa5bd41f2?w=600&h=400&fit=crop' },

  // === SAUCES ===
  'f0000006-0000-0000-0000-000000000001': { name: 'pepper-sauce', url: 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?w=600&h=400&fit=crop' },
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
  console.log(`Processing ${entries.length} remaining images...`)

  let success = 0
  let fail = 0

  for (let i = 0; i < entries.length; i += 5) {
    const batch = entries.slice(i, i + 5)
    const results = await Promise.all(
      batch.map(([id, info]) => downloadAndUpload(id, info))
    )
    success += results.filter(Boolean).length
    fail += results.filter(r => !r).length

    if (i + 5 < entries.length) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  console.log(`\nDone! ${success} ok, ${fail} failed out of ${entries.length} total`)
}

main()
