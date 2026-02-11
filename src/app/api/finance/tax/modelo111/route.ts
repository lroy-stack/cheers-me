import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { getQuarterDateRange } from '@/lib/utils/spanish-tax'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/finance/tax/modelo111
 * Calculate quarterly IRPF retention (Modelo 111)
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
    // Query employees with IRPF retention and gross salary
    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, profiles(full_name), gross_salary, irpf_retention')
      .gt('irpf_retention', 0)
      .gt('gross_salary', 0)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch employee data', details: error.message },
        { status: 500 }
      )
    }

    // Calculate IRPF for each employee (3 months in a quarter)
    const MONTHS_IN_QUARTER = 3

    const employeeBreakdown = (employees || []).map((emp) => {
      const profile = (emp.profiles as { full_name: string }[] | null)?.[0] ?? null
      const grossSalary = emp.gross_salary || 0
      const irpfRate = emp.irpf_retention || 0
      const irpfAmount =
        Math.round(grossSalary * (irpfRate / 100) * MONTHS_IN_QUARTER * 100) / 100

      return {
        name: profile?.full_name || 'Unknown',
        gross_salary: grossSalary,
        irpf_rate: irpfRate,
        irpf_amount: irpfAmount,
      }
    })

    const totalIrpf = employeeBreakdown.reduce(
      (sum, emp) => sum + emp.irpf_amount,
      0
    )

    return NextResponse.json({
      quarter: `${quarter}T ${year}`,
      period_start: start,
      period_end: end,
      employees: employeeBreakdown,
      total_irpf: Math.round(totalIrpf * 100) / 100,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Modelo 111 calculation error:', message)
    return NextResponse.json(
      { error: 'Failed to calculate Modelo 111', details: message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/finance/tax/modelo111
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
      total_irpf,
      employee_count,
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
        modelo: '111',
        period_label,
        period_start,
        period_end,
        total_irpf: total_irpf || 0,
        employee_count: employee_count || 0,
        status,
        notes,
        generated_by: userData.user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to save Modelo 111 declaration:', error)
      return NextResponse.json(
        { error: 'Failed to save declaration', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Modelo 111 declaration saved successfully',
        declaration,
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Modelo 111 save error:', message)
    return NextResponse.json(
      { error: 'Invalid request', details: message },
      { status: 400 }
    )
  }
}
