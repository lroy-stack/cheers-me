import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating menu category
const updateCategorySchema = z.object({
  name_en: z.string().min(1).max(100).optional(),
  name_nl: z.string().min(1).max(100).optional(),
  name_es: z.string().min(1).max(100).optional(),
  name_de: z.string().min(1).max(100).optional(),
  sort_order: z.number().int().min(0).optional(),
})

/**
 * GET /api/menu/categories/[id]
 * Get a single menu category (public access)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: category, error } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(category)
}

/**
 * PUT /api/menu/categories/[id]
 * Update a menu category (managers/admins only)
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
  const validation = updateCategorySchema.safeParse(body)
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

  // Update category
  const { data: updatedCategory, error } = await supabase
    .from('menu_categories')
    .update(validation.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updatedCategory)
}

/**
 * DELETE /api/menu/categories/[id]
 * Delete a menu category (managers/admins only)
 * Note: Will fail if category has menu items (FK constraint)
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

  // Delete category
  const { error } = await supabase
    .from('menu_categories')
    .delete()
    .eq('id', id)

  if (error) {
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'Cannot delete category with existing menu items' },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
