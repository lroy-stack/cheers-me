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

const { data, error } = await supabase
  .from('menu_items')
  .select('id, name_en, photo_url, menu_categories(name_en)')
  .order('name_en')

if (error) { console.error(error); process.exit(1) }

const withPhoto = data.filter(i => i.photo_url)
const withoutPhoto = data.filter(i => !i.photo_url)

console.log(`Total items: ${data.length}`)
console.log(`Con foto: ${withPhoto.length}`)
console.log(`Sin foto: ${withoutPhoto.length}`)
console.log('')
console.log('=== SIN FOTO ===')
withoutPhoto.forEach(i => console.log(`  [${i.menu_categories?.name_en || '?'}] ${i.name_en} | ${i.id}`))
