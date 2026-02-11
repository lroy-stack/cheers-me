import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for daily special
const dailySpecialSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  menu_item_id: z.string().uuid().optional(),
  name_en: z.string().min(1).max(255).optional(),
  description_en: z.string().optional(),
  price: z.number().min(0).optional(),
})

/**
 * GET /api/menu/daily-specials
 * List daily specials with optional date filter (public access)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const date = searchParams.get('date')
  const today = new Date().toISOString().split('T')[0]

  let query = supabase
    .from('daily_specials')
    .select(`
      *,
      menu_item:menu_items(
        id,
        name_en,
        name_nl,
        name_es,
        description_en,
        description_nl,
        description_es,
        photo_url,
        prep_time_minutes
      )
    `)
    .order('date', { ascending: false })

  if (date) {
    query = query.eq('date', date)
  } else {
    // Default to today's special
    query = query.eq('date', today)
  }

  const { data: specials, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(specials)
}

/**
 * POST /api/menu/daily-specials
 * Create a daily special (managers/admins only)
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
  const validation = dailySpecialSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: validation.error.errors,
      },
      { status: 400 }
    )
  }

  // Ensure either menu_item_id OR custom name/price is provided
  if (!validation.data.menu_item_id && !validation.data.name_en) {
    return NextResponse.json(
      { error: 'Either menu_item_id or name_en must be provided' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Create daily special
  const { data: newSpecial, error } = await supabase
    .from('daily_specials')
    .insert(validation.data)
    .select(`
      *,
      menu_item:menu_items(
        id,
        name_en,
        name_nl,
        name_es,
        description_en,
        description_nl,
        description_es,
        photo_url,
        prep_time_minutes
      )
    `)
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A daily special already exists for this date' },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(newSpecial, { status: 201 })
}

/**
 * DELETE /api/menu/daily-specials
 * Delete a daily special by date (managers/admins only)
 */
export async function DELETE(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')

  if (!date) {
    return NextResponse.json(
      { error: 'Date parameter is required' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Delete daily special
  const { error } = await supabase
    .from('daily_specials')
    .delete()
    .eq('date', date)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
