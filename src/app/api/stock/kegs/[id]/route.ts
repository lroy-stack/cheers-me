import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating keg
const updateKegSchema = z.object({
  current_liters: z.number().min(0).optional(),
  status: z.enum(['active', 'empty', 'removed']).optional(),
  notes: z.string().max(500).optional(),
})

/**
 * GET /api/stock/kegs/[id]
 * Get a single keg by ID
 * Access: kitchen, bar, managers
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'kitchen', 'bar'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { id } = await params
  const supabase = await createClient()

  const { data: keg, error } = await supabase
    .from('kegs')
    .select(`
      *,
      product:products(
        id,
        name,
        category,
        unit,
        cost_per_unit,
        supplier:suppliers(
          id,
          name,
          contact_person
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Keg not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Add calculated fields
  const kegWithCalculations = {
    ...keg,
    percent_remaining: keg.keg_size_liters > 0
      ? Math.round((keg.current_liters / keg.keg_size_liters) * 100)
      : 0,
    liters_consumed: keg.initial_liters - keg.current_liters,
  }

  return NextResponse.json(kegWithCalculations)
}

/**
 * PUT /api/stock/kegs/[id]
 * Update a keg (typically to pour beer and reduce liters)
 * Access: bar, managers
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'bar'])

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
  const validation = updateKegSchema.safeParse(body)
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

  // Get current keg
  const { data: currentKeg, error: fetchError } = await supabase
    .from('kegs')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Keg not found' }, { status: 404 })
    }
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  // Prepare update data
  const updateData: Record<string, unknown> = { ...validation.data }

  // If status is changing to empty, set emptied_at timestamp
  if (validation.data.status === 'empty' && currentKeg.status !== 'empty') {
    updateData.emptied_at = new Date().toISOString()
  }

  // If current_liters is being updated to 0 or less, auto-set status to empty
  if (
    validation.data.current_liters !== undefined &&
    validation.data.current_liters <= 0
  ) {
    updateData.status = 'empty'
    updateData.emptied_at = new Date().toISOString()
  }

  // Update keg
  const { data: updatedKeg, error: updateError } = await supabase
    .from('kegs')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      product:products(
        id,
        name,
        category,
        unit,
        cost_per_unit
      )
    `)
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Add calculated fields
  const kegWithCalculations = {
    ...updatedKeg,
    percent_remaining: updatedKeg.keg_size_liters > 0
      ? Math.round((updatedKeg.current_liters / updatedKeg.keg_size_liters) * 100)
      : 0,
    liters_consumed: updatedKeg.initial_liters - updatedKeg.current_liters,
  }

  return NextResponse.json(kegWithCalculations)
}

/**
 * DELETE /api/stock/kegs/[id]
 * Delete a keg record
 * Access: managers only
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

  const { error } = await supabase.from('kegs').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
