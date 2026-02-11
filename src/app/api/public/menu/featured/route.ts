import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const SELECT_FIELDS = `
  id, name_en, name_nl, name_es, name_de,
  description_en, description_nl, description_es, description_de,
  price, photo_url,
  menu_categories(name_en, name_nl, name_es, name_de),
  cocktail_recipes(glass_type)
`

/**
 * GET /api/public/menu/featured — Public endpoint (no auth)
 * Returns up to 6 cocktails + 3 food items marked as is_featured=true.
 */
export async function GET() {
  const supabase = await createClient()

  // Fetch all featured items
  const { data: items, error } = await supabase
    .from('menu_items')
    .select(SELECT_FIELDS)
    .eq('is_featured', true)
    .eq('available', true)
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all = (items || []).map((item: any) => {
    const cocktail = item.cocktail_recipes?.[0] || null
    return {
      id: item.id,
      name_en: item.name_en,
      name_nl: item.name_nl,
      name_es: item.name_es,
      name_de: item.name_de,
      description_en: item.description_en,
      description_nl: item.description_nl,
      description_es: item.description_es,
      description_de: item.description_de,
      price: item.price,
      photo_url: item.photo_url,
      category: item.menu_categories,
      type: cocktail ? 'cocktail' as const : 'food' as const,
      glass_type: cocktail?.glass_type || null,
    }
  })

  // Split by type: 6 cocktails, 6 dishes
  const cocktails = all.filter(i => i.type === 'cocktail').slice(0, 6)
  const food = all.filter(i => i.type === 'food').slice(0, 6)

  return NextResponse.json({ cocktails, food }, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
