import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating menu item
const createMenuItemSchema = z.object({
  category_id: z.string().uuid(),
  name_en: z.string().min(1).max(255),
  name_nl: z.string().min(1).max(255).optional(),
  name_es: z.string().min(1).max(255).optional(),
  description_en: z.string().optional(),
  description_nl: z.string().optional(),
  description_es: z.string().optional(),
  name_de: z.string().min(1).max(255).optional(),
  description_de: z.string().optional(),
  price: z.number().min(0),
  cost_of_goods: z.number().min(0).optional(),
  photo_url: z.string().url().optional(),
  prep_time_minutes: z.number().int().min(0).optional(),
  available: z.boolean().default(true),
  sort_order: z.number().int().min(0).optional(),
  allergens: z.array(z.enum([
    'celery', 'crustaceans', 'eggs', 'fish', 'gluten', 'lupin',
    'milk', 'molluscs', 'mustard', 'nuts', 'peanuts', 'sesame', 'soy', 'sulfites'
  ])).optional(),
})

/**
 * GET /api/menu/items
 * List all menu items with optional filters (public access for available items)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  // Optional filters
  const categoryId = searchParams.get('category_id')
  const availableOnly = searchParams.get('available') === 'true'
  const includeAllergens = searchParams.get('include_allergens') === 'true'

  let query = supabase
    .from('menu_items')
    .select(`
      *,
      category:menu_categories(
        id,
        name_en,
        name_nl,
        name_es,
        sort_order
      )
      ${includeAllergens ? ',allergens:menu_allergens(allergen)' : ''}
    `)
    .order('sort_order', { ascending: true })

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  if (availableOnly) {
    query = query.eq('available', true)
  }

  const { data: items, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Transform allergens array if included
  const transformedItems = includeAllergens
    ? (items || []).map((item: any) => ({
        ...item,
        allergens: item.allergens?.map((a: { allergen: string }) => a.allergen) || []
      }))
    : items

  return NextResponse.json(transformedItems)
}

/**
 * POST /api/menu/items
 * Create a new menu item (managers/admins only)
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = createMenuItemSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: validation.error.errors,
      },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Extract allergens from validated data
  const { allergens, ...menuItemData } = validation.data

  // Create menu item
  const { data: newItem, error: itemError } = await supabase
    .from('menu_items')
    .insert(menuItemData)
    .select(`
      *,
      category:menu_categories(
        id,
        name_en,
        name_nl,
        name_es,
        sort_order
      )
    `)
    .single()

  if (itemError) {
    return NextResponse.json({ error: itemError.message }, { status: 500 })
  }

  // Add allergens if provided
  if (allergens && allergens.length > 0) {
    const allergenData = allergens.map(allergen => ({
      menu_item_id: newItem.id,
      allergen,
    }))

    const { error: allergenError } = await supabase
      .from('menu_allergens')
      .insert(allergenData)

    if (allergenError) {
      // Rollback: delete the menu item
      await supabase.from('menu_items').delete().eq('id', newItem.id)
      return NextResponse.json(
        { error: 'Failed to add allergens: ' + allergenError.message },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ ...newItem, allergens: allergens || [] }, { status: 201 })
}
