import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating menu item
const updateMenuItemSchema = z.object({
  category_id: z.string().uuid().optional(),
  name_en: z.string().min(1).max(255).optional(),
  name_nl: z.string().min(1).max(255).optional(),
  name_es: z.string().min(1).max(255).optional(),
  description_en: z.string().optional(),
  description_nl: z.string().optional(),
  description_es: z.string().optional(),
  price: z.number().min(0).optional(),
  cost_of_goods: z.number().min(0).optional(),
  photo_url: z.string().url().optional(),
  prep_time_minutes: z.number().int().min(0).optional(),
  available: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
  allergens: z.array(z.enum([
    'celery', 'crustaceans', 'eggs', 'fish', 'gluten', 'lupin',
    'milk', 'molluscs', 'mustard', 'nuts', 'peanuts', 'sesame', 'soy', 'sulfites'
  ])).optional(),
})

/**
 * GET /api/menu/items/[id]
 * Get a single menu item with allergens (public access)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: item, error } = await supabase
    .from('menu_items')
    .select(`
      *,
      category:menu_categories(
        id,
        name_en,
        name_nl,
        name_es,
        sort_order
      ),
      allergens:menu_allergens(allergen)
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Transform allergens array
  const transformedItem = {
    ...item,
    allergens: item.allergens?.map((a: { allergen: string }) => a.allergen) || []
  }

  return NextResponse.json(transformedItem)
}

/**
 * PUT /api/menu/items/[id]
 * Update a menu item (managers/admins only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = updateMenuItemSchema.safeParse(body)
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

  // Update menu item if there are changes
  if (Object.keys(menuItemData).length > 0) {
    const { error: updateError } = await supabase
      .from('menu_items')
      .update(menuItemData)
      .eq('id', id)

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
      }
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
  }

  // Update allergens if provided
  if (allergens !== undefined) {
    // Delete existing allergens
    await supabase
      .from('menu_allergens')
      .delete()
      .eq('menu_item_id', id)

    // Insert new allergens
    if (allergens.length > 0) {
      const allergenData = allergens.map(allergen => ({
        menu_item_id: id,
        allergen,
      }))

      const { error: allergenError } = await supabase
        .from('menu_allergens')
        .insert(allergenData)

      if (allergenError) {
        return NextResponse.json(
          { error: 'Failed to update allergens: ' + allergenError.message },
          { status: 500 }
        )
      }
    }
  }

  // Fetch updated item
  const { data: updatedItem, error: fetchError } = await supabase
    .from('menu_items')
    .select(`
      *,
      category:menu_categories(
        id,
        name_en,
        name_nl,
        name_es,
        sort_order
      ),
      allergens:menu_allergens(allergen)
    `)
    .eq('id', id)
    .single()

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  // Transform allergens array
  const transformedItem = {
    ...updatedItem,
    allergens: updatedItem.allergens?.map((a: { allergen: string }) => a.allergen) || []
  }

  return NextResponse.json(transformedItem)
}

/**
 * DELETE /api/menu/items/[id]
 * Delete a menu item (managers/admins only)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params
  const supabase = await createClient()

  // Delete menu item (allergens will cascade)
  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
