import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { getQuarterDateRange } from '@/lib/utils/spanish-tax'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/finance/tax/modelo303
 * Calculate quarterly Modelo 303 IVA declaration
 * Query params: year (number), quarter (1-4)
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
  const quarter = parseInt(searchParams.get('quarter') || '1', 10)

  if (quarter < 1 || quarter > 4) {
    return NextResponse.json(
      { error: 'Quarter must be between 1 and 4' },
      { status: 400 }
    )
  }

  const { start, end } = getQuarterDateRange(year, quarter)

  try {
    // IVA Repercutido: Sum of sales IVA breakdown for the quarter
    const { data: salesIVA, error: salesError } = await supabase
      .from('sales_iva_breakdown')
      .select('iva_rate, base_imponible, iva_amount, total')
      .gte('date', start)
      .lte('date', end)

    if (salesError) {
      return NextResponse.json(
        { error: 'Failed to fetch sales IVA data', details: salesError.message },
        { status: 500 }
      )
    }

    // Group IVA Repercutido by rate
    const repercutidoByRate = (salesIVA || []).reduce(
      (acc, row) => {
        const rate = row.iva_rate || 0
        const key = String(rate)
        if (!acc[key]) {
          acc[key] = { rate, base: 0, iva: 0 }
        }
        acc[key].base += row.base_imponible || 0
        acc[key].iva += row.iva_amount || 0
        return acc
      },
      {} as Record<string, { rate: number; base: number; iva: number }>
    )

    const ivaRepercutido = (salesIVA || []).reduce(
      (sum, row) => sum + (row.iva_amount || 0),
      0
    )

    // IVA Soportado: Sum of deductible overhead expenses IVA for the quarter
    const { data: expenses, error: expensesError } = await supabase
      .from('overhead_expenses')
      .select('category, iva_rate, iva_amount, base_imponible')
      .eq('is_deductible', true)
      .gte('date', start)
      .lte('date', end)

    if (expensesError) {
      return NextResponse.json(
        { error: 'Failed to fetch expense IVA data', details: expensesError.message },
        { status: 500 }
      )
    }

    // Group IVA Soportado by category
    const soportadoByCategory = (expenses || []).reduce(
      (acc, row) => {
        const cat = row.category || 'other'
        if (!acc[cat]) {
          acc[cat] = { category: cat, base: 0, iva: 0 }
        }
        acc[cat].base += row.base_imponible || 0
        acc[cat].iva += row.iva_amount || 0
        return acc
      },
      {} as Record<string, { category: string; base: number; iva: number }>
    )

    const ivaSoportado = (expenses || []).reduce(
      (sum, row) => sum + (row.iva_amount || 0),
      0
    )

    const resultado = ivaRepercutido - ivaSoportado

    return NextResponse.json({
      quarter: `${quarter}T ${year}`,
      period_start: start,
      period_end: end,
      iva_repercutido: Math.round(ivaRepercutido * 100) / 100,
      iva_repercutido_by_rate: Object.values(repercutidoByRate).map((item) => ({
        rate: item.rate,
        base: Math.round(item.base * 100) / 100,
        iva: Math.round(item.iva * 100) / 100,
      })),
      iva_soportado: Math.round(ivaSoportado * 100) / 100,
      iva_soportado_by_category: Object.values(soportadoByCategory).map((item) => ({
        category: item.category,
        base: Math.round(item.base * 100) / 100,
        iva: Math.round(item.iva * 100) / 100,
      })),
      resultado: Math.round(resultado * 100) / 100,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Modelo 303 calculation error:', message)
    return NextResponse.json(
      { error: 'Failed to calculate Modelo 303', details: message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/finance/tax/modelo303
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
      iva_repercutido,
      iva_soportado,
      iva_resultado,
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
        modelo: '303',
        period_label,
        period_start,
        period_end,
        iva_repercutido: iva_repercutido || 0,
        iva_soportado: iva_soportado || 0,
        iva_resultado: iva_resultado || 0,
        status,
        notes,
        generated_by: userData.user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to save Modelo 303 declaration:', error)
      return NextResponse.json(
        { error: 'Failed to save declaration', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Modelo 303 declaration saved successfully',
        declaration,
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Modelo 303 save error:', message)
    return NextResponse.json(
      { error: 'Invalid request', details: message },
      { status: 400 }
    )
  }
}
