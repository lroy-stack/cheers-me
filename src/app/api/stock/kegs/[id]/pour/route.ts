import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for pouring beer
const pourBeerSchema = z.object({
  liters_poured: z.number().min(0.1).max(50), // Pour between 0.1L and 50L
})

/**
 * POST /api/stock/kegs/[id]/pour
 * Pour beer from a keg (decrements current_liters)
 * Access: bar, managers
 *
 * This is a convenience endpoint that wraps the PUT /kegs/[id]
 * but provides a more intuitive API for the common "pour" operation.
 */
export async function POST(
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
  const validation = pourBeerSchema.safeParse(body)
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

  // Check if keg is active
  if (currentKeg.status !== 'active') {
    return NextResponse.json(
      { error: 'Cannot pour from inactive keg' },
      { status: 400 }
    )
  }

  // Calculate new liters
  const newLiters = currentKeg.current_liters - validation.data.liters_poured

  // Check if we're trying to pour more than available
  if (newLiters < 0) {
    return NextResponse.json(
      {
        error: 'Cannot pour more than available',
        available_liters: currentKeg.current_liters,
        requested_liters: validation.data.liters_poured,
      },
      { status: 400 }
    )
  }

  // Update keg
  const updateData: Record<string, unknown> = {
    current_liters: newLiters,
  }

  // If keg is now empty (or very close), mark it
  if (newLiters <= 0.1) {
    updateData.current_liters = 0
    updateData.status = 'empty'
    updateData.emptied_at = new Date().toISOString()
  }

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
    liters_poured: validation.data.liters_poured,
  }

  return NextResponse.json(kegWithCalculations)
}
