import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/utils/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/finance/budget-vs-actual
 * Get budget vs actual comparison with variance analysis
 * Query params: start_date, end_date (optional, shows active budgets if not provided)
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

  // Get budget vs actual from the view
  let query = supabase.from('budget_vs_actual').select('*')

  if (startDate) {
    query = query.gte('period_start', startDate)
  }
  if (endDate) {
    query = query.lte('period_end', endDate)
  }

  const { data: budgetComparison, error } = await query.order('period_start', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Group by category and calculate overall variance
  const categoryTotals = budgetComparison?.reduce(
    (acc, item) => {
      const category = item.category
      if (!acc[category]) {
        acc[category] = {
          category,
          total_budget: 0,
          total_actual: 0,
          total_variance: 0,
        }
      }
      acc[category].total_budget += item.budget_amount || 0
      acc[category].total_actual += item.actual_amount || 0
      acc[category].total_variance += item.variance || 0
      return acc
    },
    {} as Record<
      string,
      {
        category: string
        total_budget: number
        total_actual: number
        total_variance: number
      }
    >
  )

  const categorySummary = categoryTotals
    ? Object.values(categoryTotals).map((cat) => {
        const catTyped = cat as {
          category: string
          total_budget: number
          total_actual: number
          total_variance: number
        }
        return {
          ...catTyped,
          variance_percentage:
            catTyped.total_budget > 0
              ? Number(((catTyped.total_variance / catTyped.total_budget) * 100).toFixed(2))
              : 0,
        }
      })
    : []

  return NextResponse.json({
    budget_vs_actual: budgetComparison || [],
    category_summary: categorySummary,
    count: budgetComparison?.length || 0,
  })
}
