import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating/updating menu category
const categorySchema = z.object({
  name_en: z.string().min(1).max(100),
  name_nl: z.string().min(1).max(100).optional(),
  name_es: z.string().min(1).max(100).optional(),
  name_de: z.string().min(1).max(100).optional(),
  sort_order: z.number().int().min(0).optional(),
})

/**
 * GET /api/menu/categories
 * List all menu categories (public access)
 */
export async function GET() {
  const supabase = await createClient()

  const { data: categories, error } = await supabase
    .from('menu_categories')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(categories)
}

/**
 * POST /api/menu/categories
 * Create a new menu category (managers/admins only)
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
  const validation = categorySchema.safeParse(body)
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

  // Create category
  const { data: newCategory, error } = await supabase
    .from('menu_categories')
    .insert(validation.data)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(newCategory, { status: 201 })
}
