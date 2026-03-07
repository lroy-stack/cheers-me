import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { MODELO_347_THRESHOLD } from '@/lib/utils/spanish-tax'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/finance/tax/modelo347
 * Annual operations report (Modelo 347)
 * Query params: year (number)
 * Returns suppliers with total operations > 3,005.06 EUR for the year
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

  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10)

  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`

  try {
    // Fetch all overhead expenses for the year (with date for quarterly breakdown)
    const { data: expenses, error } = await supabase
      .from('overhead_expenses')
      .select('supplier_nif, vendor, amount, date')
      .gte('date', startDate)
      .lte('date', endDate)
      .not('supplier_nif', 'is', null)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch expense data', details: error.message },
        { status: 500 }
      )
    }

    /** Map month → quarter (1-indexed) */
    function monthToQuarter(dateStr: string): 1 | 2 | 3 | 4 {
      const month = new Date(dateStr).getMonth() + 1 // 1-12
      if (month <= 3) return 1
      if (month <= 6) return 2
      if (month <= 9) return 3
      return 4
    }

    // Group by supplier_nif with quarterly breakdown
    const supplierMap = (expenses || []).reduce(
      (acc, expense) => {
        const nif = expense.supplier_nif
        if (!nif) return acc

        if (!acc[nif]) {
          acc[nif] = {
            nif,
            name: expense.vendor || 'Unknown',
            total: 0,
            quarterly: { 1: 0, 2: 0, 3: 0, 4: 0 },
          }
        }
        const amount = expense.amount || 0
        acc[nif].total += amount
        if (expense.date) {
          const q = monthToQuarter(expense.date)
          acc[nif].quarterly[q] += amount
        }
        return acc
      },
      {} as Record<string, {
        nif: string; name: string; total: number
        quarterly: Record<1 | 2 | 3 | 4, number>
      }>
    )

    // Filter suppliers above threshold (€3,005.06) and add quarterly_amounts array
    const suppliersAboveThreshold = Object.values(supplierMap)
      .filter((supplier) => supplier.total > MODELO_347_THRESHOLD)
      .map((supplier) => ({
        nif: supplier.nif,
        name: supplier.name,
        total: Math.round(supplier.total * 100) / 100,
        quarterly_amounts: [
          { quarter: 1, label: '1T', amount: Math.round(supplier.quarterly[1] * 100) / 100 },
          { quarter: 2, label: '2T', amount: Math.round(supplier.quarterly[2] * 100) / 100 },
          { quarter: 3, label: '3T', amount: Math.round(supplier.quarterly[3] * 100) / 100 },
          { quarter: 4, label: '4T', amount: Math.round(supplier.quarterly[4] * 100) / 100 },
        ],
      }))
      .sort((a, b) => b.total - a.total)

    return NextResponse.json({
      year,
      threshold: MODELO_347_THRESHOLD,
      suppliers: suppliersAboveThreshold,
      total_suppliers: suppliersAboveThreshold.length,
      total_amount: Math.round(
        suppliersAboveThreshold.reduce((sum, s) => sum + s.total, 0) * 100
      ) / 100,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Modelo 347 calculation error:', message)
    return NextResponse.json(
      { error: 'Failed to calculate Modelo 347', details: message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/finance/tax/modelo347
 * Save declaration to tax_declarations table
 * Accessible by: admin, manager, owner
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(['admin', 'manager', 'owner'])

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const supabase = await createClient()
  const { data: userData } = authResult

  try {
    const body = await request.json()

    const {
      period_label,
      period_start,
      period_end,
      total_amount,
      supplier_count,
      status = 'draft',
      notes,
    } = body

    if (!period_label || !period_start || !period_end) {
      return NextResponse.json(
        { error: 'period_label, period_start, and period_end are required' },
        { status: 400 }
      )
    }

    const { data: declaration, error } = await supabase
      .from('tax_declarations')
      .insert({
        modelo: '347',
        period_label,
        period_start,
        period_end,
        total_amount: total_amount || 0,
        supplier_count: supplier_count || 0,
        status,
        notes,
        generated_by: userData.user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to save Modelo 347 declaration:', error)
      return NextResponse.json(
        { error: 'Failed to save declaration', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Modelo 347 declaration saved successfully',
        declaration,
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Modelo 347 save error:', message)
    return NextResponse.json(
      { error: 'Invalid request', details: message },
      { status: 400 }
    )
  }
}
