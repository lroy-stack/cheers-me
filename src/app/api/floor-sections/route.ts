import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating floor section
const createFloorSectionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().default(true),
})

// Validation schema for updating floor section
const updateFloorSectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
})

/**
 * GET /api/floor-sections
 * List all floor sections
 * Access: All authenticated staff
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'waiter', 'kitchen', 'bar'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const active_only = searchParams.get('active_only') === 'true'

  let query = supabase
    .from('floor_sections')
    .select(`
      *,
      tables:tables(count)
    `)
    .order('sort_order', { ascending: true })

  if (active_only) {
    query = query.eq('is_active', true)
  }

  const { data: sections, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(sections)
}

/**
 * POST /api/floor-sections
 * Create a new floor section
 * Access: admin, manager
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
  const validation = createFloorSectionSchema.safeParse(body)
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
  const data = validation.data

  // Check if section name already exists
  const { data: existingSection } = await supabase
    .from('floor_sections')
    .select('id')
    .eq('name', data.name)
    .single()

  if (existingSection) {
    return NextResponse.json(
      { error: 'Floor section with this name already exists' },
      { status: 400 }
    )
  }

  // If sort_order not provided, set it to max + 1
  if (!data.sort_order) {
    const { data: lastSection } = await supabase
      .from('floor_sections')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    data.sort_order = (lastSection?.sort_order || 0) + 1
  }

  // Create floor section
  const { data: newSection, error } = await supabase
    .from('floor_sections')
    .insert(data)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(newSection, { status: 201 })
}

/**
 * PATCH /api/floor-sections/[id]
 * Update a floor section
 * Access: admin, manager
 */
export async function PATCH(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json(
      { error: 'Missing section ID' },
      { status: 400 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = updateFloorSectionSchema.safeParse(body)
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

  // Update floor section
  const { data: updatedSection, error } = await supabase
    .from('floor_sections')
    .update(validation.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Floor section not found' },
        { status: 404 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updatedSection)
}

/**
 * DELETE /api/floor-sections/[id]
 * Delete a floor section
 * Access: admin, manager
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
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json(
      { error: 'Missing section ID' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Check if any tables are assigned to this section
  const { data: tablesInSection, error: checkError } = await supabase
    .from('tables')
    .select('id')
    .eq('section_id', id)

  if (checkError) {
    return NextResponse.json({ error: checkError.message }, { status: 500 })
  }

  if (tablesInSection && tablesInSection.length > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete section with ${tablesInSection.length} assigned table(s). Please reassign or remove tables first.`,
      },
      { status: 400 }
    )
  }

  // Delete floor section
  const { error } = await supabase
    .from('floor_sections')
    .delete()
    .eq('id', id)

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Floor section not found' },
        { status: 404 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
