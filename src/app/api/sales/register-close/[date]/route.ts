import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updating register close
const updateRegisterCloseSchema = z.object({
  expected_amount: z.number().min(0).optional(),
  actual_amount: z.number().min(0).optional(),
  notes: z.string().optional(),
})

/**
 * GET /api/sales/register-close/[date]
 * Get cash register close for specific date
 * Accessible by: admin, manager, owner
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { date } = await params

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: registerClose, error } = await supabase
    .from('cash_register_closes')
    .select(`
      *,
      closed_by_employee:employees!closed_by(
        id,
        profile:profiles(
          full_name
        )
      )
    `)
    .eq('date', date)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Register close not found for this date' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(registerClose)
}

/**
 * PATCH /api/sales/register-close/[date]
 * Update cash register close for specific date
 * Accessible by: admin, manager
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const authResult = await requireRole(['admin', 'manager'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { date } = await params

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate request body
  const validation = updateRegisterCloseSchema.safeParse(body)
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

  // Get existing record to recalculate variance if needed
  const { data: existingClose, error: fetchError } = await supabase
    .from('cash_register_closes')
    .select('*')
    .eq('date', date)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Register close not found for this date' }, { status: 404 })
    }
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  // Calculate new variance if amounts changed
  const updatedData: Record<string, unknown> = {
    ...validation.data,
  }

  if (
    validation.data.expected_amount !== undefined ||
    validation.data.actual_amount !== undefined
  ) {
    const newExpected = validation.data.expected_amount ?? existingClose.expected_amount
    const newActual = validation.data.actual_amount ?? existingClose.actual_amount
    updatedData.variance = newActual - newExpected
  }

  const { data: updatedClose, error: updateError } = await supabase
    .from('cash_register_closes')
    .update(updatedData)
    .eq('date', date)
    .select(`
      *,
      closed_by_employee:employees!closed_by(
        id,
        profile:profiles(
          full_name
        )
      )
    `)
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(updatedClose)
}

/**
 * DELETE /api/sales/register-close/[date]
 * Delete cash register close for specific date
 * Accessible by: admin
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const authResult = await requireRole(['admin'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { date } = await params

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
  }

  const supabase = await createClient()

  const { error } = await supabase.from('cash_register_closes').delete().eq('date', date)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Register close deleted successfully' })
}
