import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const ingredientSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().min(0),
  unit: z.string().min(1),
  cost_per_unit: z.number().min(0).default(0),
  product_id: z.string().uuid().optional(),
  is_garnish: z.boolean().default(false),
  is_optional: z.boolean().default(false),
  sort_order: z.number().int().default(0),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('menu_item_ingredients')
    .select('*, product:products(id, name, category, unit, cost_per_unit)')
    .eq('menu_item_id', id)
    .order('sort_order')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  const body = await request.json()
  const validation = ingredientSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error.errors }, { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('menu_item_ingredients')
    .insert({ menu_item_id: id, ...validation.data })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const ingredientId = searchParams.get('ingredient_id')

  if (!ingredientId) {
    return NextResponse.json({ error: 'ingredient_id required' }, { status: 400 })
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('menu_item_ingredients')
    .delete()
    .eq('id', ingredientId)
    .eq('menu_item_id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
