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
    // Fetch all overhead expenses for the year
    const { data: expenses, error } = await supabase
      .from('overhead_expenses')
      .select('supplier_nif, vendor, amount')
      .gte('date', startDate)
      .lte('date', endDate)
      .not('supplier_nif', 'is', null)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch expense data', details: error.message },
        { status: 500 }
      )
    }

    // Group by supplier_nif and sum amounts
    const supplierTotals = (expenses || []).reduce(
      (acc, expense) => {
        const nif = expense.supplier_nif
        if (!nif) return acc

        if (!acc[nif]) {
          acc[nif] = {
            nif,
            name: expense.vendor || 'Unknown',
            total: 0,
          }
        }
        acc[nif].total += expense.amount || 0
        return acc
      },
      {} as Record<string, { nif: string; name: string; total: number }>
    )

    // Filter suppliers above threshold
    const suppliersAboveThreshold = Object.values(supplierTotals)
      .filter((supplier) => supplier.total > MODELO_347_THRESHOLD)
      .map((supplier) => ({
        nif: supplier.nif,
        name: supplier.name,
        total: Math.round(supplier.total * 100) / 100,
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
