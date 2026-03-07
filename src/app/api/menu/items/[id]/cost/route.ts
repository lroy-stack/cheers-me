import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'owner', 'manager', 'kitchen'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  const supabase = await createClient()

  const { data: ingredients, error } = await supabase
    .from('menu_item_ingredients')
    .select('name, quantity, unit, cost_per_unit, is_garnish, is_optional')
    .eq('menu_item_id', id)
    .order('sort_order')

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch ingredients' }, { status: 500 })
  }

  const { data: item } = await supabase
    .from('menu_items')
    .select('price')
    .eq('id', id)
    .single()

  const totalCost = (ingredients || []).reduce(
    (sum, ing) => sum + (ing.quantity * ing.cost_per_unit),
    0
  )

  const price = item?.price || 0
  const margin = price > 0 ? ((price - totalCost) / price) * 100 : 0

  return NextResponse.json({
    menu_item_id: id,
    ingredients: ingredients || [],
    total_cost: parseFloat(totalCost.toFixed(2)),
    price,
    margin_percent: parseFloat(margin.toFixed(1)),
  })
}
