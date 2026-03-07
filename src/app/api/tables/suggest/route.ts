import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/tables/suggest?party_size=N
 * Returns best-matching available tables for a given party size.
 * Sorted by: exact capacity match first, then smallest table that fits.
 * Access: admin, manager, waiter, bar
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'waiter', 'bar'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { searchParams } = new URL(request.url)
  const partySizeParam = searchParams.get('party_size')

  if (!partySizeParam) {
    return NextResponse.json(
      { error: 'party_size query parameter is required' },
      { status: 400 }
    )
  }

  const partySize = parseInt(partySizeParam, 10)
  if (isNaN(partySize) || partySize < 1 || partySize > 100) {
    return NextResponse.json(
      { error: 'party_size must be a positive integer between 1 and 100' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Get all available active tables that can seat the party
  const { data: tables, error } = await supabase
    .from('tables')
    .select(`
      id,
      table_number,
      capacity,
      section_id,
      shape,
      status,
      x_position,
      y_position,
      floor_sections (
        id,
        name
      )
    `)
    .eq('status', 'available')
    .eq('is_active', true)
    .gte('capacity', partySize)
    .order('capacity', { ascending: true })

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch available tables' },
      { status: 500 }
    )
  }

  if (!tables || tables.length === 0) {
    return NextResponse.json({
      tables: [],
      message: `No available tables for party size ${partySize}`,
    })
  }

  // Sort by best fit: exact match first, then smallest overage
  const sorted = tables.sort((a, b) => {
    const aOverage = a.capacity - partySize
    const bOverage = b.capacity - partySize
    return aOverage - bOverage
  })

  // Tag each table with fit quality
  const suggested = sorted.map((table) => ({
    ...table,
    fit: table.capacity === partySize ? 'exact' : 'fits',
    overage: table.capacity - partySize,
  }))

  return NextResponse.json({
    tables: suggested,
    party_size: partySize,
    count: suggested.length,
  })
}
