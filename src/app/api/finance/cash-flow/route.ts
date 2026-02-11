import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/finance/cash-flow
 * Get cash flow summary with payment method breakdown
 * Query params: start_date, end_date (required for range), date (for single day)
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

  const date = searchParams.get('date')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')

  // Require either single date or date range
  if (!date && (!startDate || !endDate)) {
    return NextResponse.json(
      { error: 'Either date or start_date and end_date are required' },
      { status: 400 }
    )
  }

  // Build query
  let query = supabase
    .from('cash_flow_transactions')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (date) {
    query = query.eq('date', date)
  } else if (startDate && endDate) {
    query = query.gte('date', startDate).lte('date', endDate)
  }

  const { data: transactions, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Calculate totals by transaction type
  const byType = transactions?.reduce(
    (acc, txn) => {
      const type = txn.transaction_type
      if (!acc[type]) {
        acc[type] = { count: 0, amount: 0 }
      }
      acc[type].count += 1
      acc[type].amount += txn.amount || 0
      return acc
    },
    {} as Record<string, { count: number; amount: number }>
  )

  // Calculate totals by payment method
  const byPaymentMethod = transactions?.reduce(
    (acc, txn) => {
      const method = txn.payment_method
      if (!acc[method]) {
        acc[method] = { count: 0, amount: 0 }
      }
      acc[method].count += 1
      acc[method].amount += txn.amount || 0
      return acc
    },
    {} as Record<string, { count: number; amount: number }>
  )

  // Calculate totals by category
  const byCategory = transactions?.reduce(
    (acc, txn) => {
      const category = txn.category
      if (!acc[category]) {
        acc[category] = { count: 0, amount: 0 }
      }
      acc[category].count += 1
      acc[category].amount += txn.amount || 0
      return acc
    },
    {} as Record<string, { count: number; amount: number }>
  )

  // Calculate overall totals
  const totals = transactions?.reduce(
    (acc, txn) => {
      if (txn.transaction_type === 'sale') {
        acc.inflow += txn.amount || 0
      } else if (
        ['purchase', 'labor', 'overhead', 'tax', 'withdrawal'].includes(txn.transaction_type)
      ) {
        acc.outflow += txn.amount || 0
      }
      return acc
    },
    { inflow: 0, outflow: 0 }
  )

  const netCashFlow = totals ? totals.inflow - totals.outflow : 0

  return NextResponse.json({
    period: date
      ? { date }
      : {
          start_date: startDate,
          end_date: endDate,
        },
    transactions: transactions || [],
    summary: {
      total_inflow: totals?.inflow || 0,
      total_outflow: totals?.outflow || 0,
      net_cash_flow: netCashFlow,
      transaction_count: transactions?.length || 0,
    },
    breakdown: {
      by_type: byType || {},
      by_payment_method: byPaymentMethod || {},
      by_category: byCategory || {},
    },
  })
}
