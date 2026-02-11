import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/finance/calculate
 * Trigger daily financial calculation for a specific date
 * Body: { date: string } (optional, defaults to yesterday)
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

  const supabase = await createClient()

  try {
    const body = await request.json()

    // Default to yesterday if no date provided
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const targetDate = body.date || yesterday.toISOString().split('T')[0]

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Call the database function to calculate daily financials
    const { error } = await supabase.rpc('calculate_daily_financials', {
      target_date: targetDate,
    })

    if (error) {
      console.error('Failed to calculate daily financials:', error)
      return NextResponse.json(
        { error: 'Failed to calculate financials', details: error.message },
        { status: 500 }
      )
    }

    // Fetch the calculated data to return
    const { data: calculatedFinancials, error: fetchError } = await supabase
      .from('daily_financials')
      .select('*')
      .eq('date', targetDate)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { error: 'Calculated but failed to fetch results', details: fetchError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Financial calculation completed successfully',
      date: targetDate,
      financials: calculatedFinancials,
    })
  } catch (err) {
    console.error('Error in calculate endpoint:', err)
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
