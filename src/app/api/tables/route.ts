import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for creating table
const createTableSchema = z.object({
  table_number: z.string().min(1).max(50),
  capacity: z.number().int().min(1),
  section_id: z.string().uuid().nullable().optional(),
  x_position: z.number().optional(),
  y_position: z.number().optional(),
  status: z.enum(['available', 'occupied', 'reserved', 'cleaning']).default('available'),
  shape: z.enum(['round', 'square', 'rectangle']).default('round'),
  width: z.number().optional(),
  height: z.number().optional(),
  rotation: z.number().min(0).max(360).default(0),
  is_active: z.boolean().default(true),
  notes: z.string().max(500).optional(),
})

// Validation schema for updating table
const updateTableSchema = z.object({
  table_number: z.string().min(1).max(50).optional(),
  capacity: z.number().int().min(1).optional(),
  section_id: z.string().uuid().nullable().optional(),
  x_position: z.number().optional(),
  y_position: z.number().optional(),
  status: z.enum(['available', 'occupied', 'reserved', 'cleaning']).optional(),
  shape: z.enum(['round', 'square', 'rectangle']).optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  rotation: z.number().min(0).max(360).optional(),
  is_active: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
  qr_code_url: z.string().url().nullable().optional(),
})

/**
 * GET /api/tables
 * List all tables (staff access)
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

  // Optional filters
  const status = searchParams.get('status')
  const section_id = searchParams.get('section_id')
  const active_only = searchParams.get('active_only') === 'true'

  let query = supabase
    .from('tables')
    .select(`
      *,
      floor_sections (
        id,
        name,
        description
      )
    `)
    .order('table_number', { ascending: true })

  if (status) {
    query = query.eq('status', status)
  }

  if (section_id) {
    query = query.eq('section_id', section_id)
  }

  if (active_only) {
    query = query.eq('is_active', true)
  }

  const { data: tables, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(tables)
}

/**
 * POST /api/tables
 * Create a new table (managers/admins only)
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
  const validation = createTableSchema.safeParse(body)
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

  // Check if table number already exists
  const { data: existingTable } = await supabase
    .from('tables')
    .select('id')
    .eq('table_number', validation.data.table_number)
    .single()

  if (existingTable) {
    return NextResponse.json(
      { error: 'Table number already exists' },
      { status: 400 }
    )
  }

  // Create table
  const { data: newTable, error } = await supabase
    .from('tables')
    .insert(validation.data)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(newTable, { status: 201 })
}

/**
 * PUT /api/tables
 * Bulk update tables (for floor plan editor) (managers/admins only)
 */
export async function PUT(request: NextRequest) {
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

  // Expect array of table updates
  if (!Array.isArray(body)) {
    return NextResponse.json(
      { error: 'Request body must be an array of table updates' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const updates = []

  for (const tableUpdate of body) {
    const { id, ...data } = tableUpdate

    if (!id) {
      return NextResponse.json(
        { error: 'Each table update must include an id' },
        { status: 400 }
      )
    }

    // Validate update data
    const validation = updateTableSchema.safeParse(data)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: `Validation failed for table ${id}`,
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('tables')
      .update(validation.data)
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { error: `Failed to update table ${id}: ${error.message}` },
        { status: 500 }
      )
    }

    updates.push(id)
  }

  return NextResponse.json({
    success: true,
    updated_count: updates.length,
    updated_ids: updates,
  })
}
