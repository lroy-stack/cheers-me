import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for cash register close
const registerCloseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expected_amount: z.number().min(0),
  actual_amount: z.number().min(0),
  notes: z.string().optional(),
  closed_by: z.string().uuid(),
})

/**
 * GET /api/sales/register-close
 * List cash register closes with optional date range
 * Accessible by: admin, manager, owner
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 30

  let query = supabase
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
    .order('date', { ascending: false })
    .limit(limit)

  if (startDate) {
    query = query.gte('date', startDate)
  }

  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data: closes, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(closes)
}

/**
 * POST /api/sales/register-close
 * Create cash register close record
 * Accessible by: admin, manager
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
  const validation = registerCloseSchema.safeParse(body)
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

  // Check if close already exists for this date
  const { data: existingClose } = await supabase
    .from('cash_register_closes')
    .select('id')
    .eq('date', validation.data.date)
    .single()

  if (existingClose) {
    return NextResponse.json(
      { error: 'Cash register close already exists for this date' },
      { status: 400 }
    )
  }

  // Calculate variance
  const variance = validation.data.actual_amount - validation.data.expected_amount

  const { data: registerClose, error } = await supabase
    .from('cash_register_closes')
    .insert({
      date: validation.data.date,
      expected_amount: validation.data.expected_amount,
      actual_amount: validation.data.actual_amount,
      variance,
      notes: validation.data.notes || null,
      closed_by: validation.data.closed_by,
    })
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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(registerClose, { status: 201 })
}
