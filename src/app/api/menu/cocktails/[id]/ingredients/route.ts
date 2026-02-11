import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

interface IngredientInput {
  name: string
  quantity: number
  unit: string
  cost_per_unit?: number
  product_id?: string
  is_garnish?: boolean
  is_optional?: boolean
  sort_order?: number
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner', 'bar'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  const body = await request.json()
  const { ingredients } = body as { ingredients: IngredientInput[] }

  if (!Array.isArray(ingredients)) {
    return NextResponse.json({ error: 'ingredients must be an array' }, { status: 400 })
  }

  const supabase = await createClient()

  // Get menu_item_id from cocktail_recipes
  const { data: recipe, error: recipeError } = await supabase
    .from('cocktail_recipes')
    .select('menu_item_id')
    .eq('id', id)
    .single()

  if (recipeError || !recipe) {
    return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
  }

  const menuItemId = recipe.menu_item_id

  // Transactional: delete existing + insert new
  const { error: deleteError } = await supabase
    .from('menu_ingredients')
    .delete()
    .eq('menu_item_id', menuItemId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  if (ingredients.length === 0) {
    return NextResponse.json({ success: true, ingredients: [] })
  }

  const rows = ingredients.map((ing, idx) => ({
    menu_item_id: menuItemId,
    name: ing.name,
    quantity: ing.quantity,
    unit: ing.unit,
    cost_per_unit: ing.cost_per_unit ?? 0,
    product_id: ing.product_id || null,
    is_garnish: ing.is_garnish ?? false,
    is_optional: ing.is_optional ?? false,
    sort_order: ing.sort_order ?? idx + 1,
  }))

  const { data, error: insertError } = await supabase
    .from('menu_ingredients')
    .insert(rows)
    .select()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, ingredients: data })
}
