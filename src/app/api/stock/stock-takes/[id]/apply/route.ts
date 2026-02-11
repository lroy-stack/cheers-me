import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/stock/stock-takes/[id]/apply
 * Apply stock take variance to update system stock
 * Access: managers only
 */
export async function POST(
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
  const { data: userData } = authResult

  // Get stock take record
  const { data: stockTake, error: fetchError } = await supabase
    .from('stock_takes')
    .select(`
      *,
      product:products(
        id,
        name,
        current_stock,
        unit
      )
    `)
    .eq('id', id)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Stock take not found' },
        { status: 404 }
      )
    }
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  // Check if variance exists
  if (stockTake.variance === 0) {
    return NextResponse.json(
      { error: 'No variance to apply - physical count matches system count' },
      { status: 400 }
    )
  }

  // Get employee record
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('profile_id', userData.profile.id)
    .single()

  // Update product stock to match physical count
  const { error: updateError } = await supabase
    .from('products')
    .update({ current_stock: stockTake.physical_count })
    .eq('id', stockTake.product_id)

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to update product stock: ' + updateError.message },
      { status: 500 }
    )
  }

  // Create a stock movement record for the adjustment
  const { error: movementError } = await supabase
    .from('stock_movements')
    .insert({
      product_id: stockTake.product_id,
      movement_type: 'adjustment',
      quantity: stockTake.variance,
      reason: `Stock take adjustment - ID: ${id}`,
      recorded_by: employee?.id || null,
    })

  if (movementError) {
    // Log error but don't fail the request - stock was already updated
    console.error('Failed to create movement record:', movementError)
  }

  return NextResponse.json({
    success: true,
    product_id: stockTake.product_id,
    product_name: stockTake.product?.name,
    previous_stock: stockTake.system_count,
    new_stock: stockTake.physical_count,
    variance_applied: stockTake.variance,
  })
}
