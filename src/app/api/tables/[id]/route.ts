import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating table
const updateTableSchema = z.object({
  table_number: z.string().min(1).max(50).optional(),
  capacity: z.number().int().min(1).optional(),
  section: z.string().max(100).optional(),
  x_position: z.number().optional(),
  y_position: z.number().optional(),
  status: z.enum(['available', 'occupied', 'reserved', 'cleaning']).optional(),
  qr_code_url: z.string().url().optional(),
})

/**
 * GET /api/tables/[id]
 * Get a single table (staff access)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'waiter', 'kitchen', 'bar'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params
  const supabase = await createClient()

  const { data: table, error } = await supabase
    .from('tables')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(table)
}

/**
 * PUT /api/tables/[id]
 * Update a table (managers/admins only)
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
  const validation = updateTableSchema.safeParse(body)
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

  // If table_number is being updated, check uniqueness
  if (validation.data.table_number) {
    const { data: existingTable } = await supabase
      .from('tables')
      .select('id')
      .eq('table_number', validation.data.table_number)
      .neq('id', id)
      .single()

    if (existingTable) {
      return NextResponse.json(
        { error: 'Table number already exists' },
        { status: 400 }
      )
    }
  }

  // Update table
  const { data: updatedTable, error } = await supabase
    .from('tables')
    .update(validation.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updatedTable)
}

/**
 * DELETE /api/tables/[id]
 * Delete a table (managers/admins only)
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

  // Check if table has active reservations or orders
  const { data: activeReservations } = await supabase
    .from('reservations')
    .select('id')
    .eq('table_id', id)
    .in('status', ['confirmed', 'seated'])
    .limit(1)

  if (activeReservations && activeReservations.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete table with active reservations' },
      { status: 400 }
    )
  }

  const { data: activeOrders } = await supabase
    .from('kitchen_orders')
    .select('id')
    .eq('table_id', id)
    .in('status', ['pending', 'in_progress'])
    .limit(1)

  if (activeOrders && activeOrders.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete table with active orders' },
      { status: 400 }
    )
  }

  // Delete table
  const { error } = await supabase
    .from('tables')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
