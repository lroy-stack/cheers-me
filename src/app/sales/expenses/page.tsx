import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getCurrentUser } from '@/lib/utils/auth'
import { ExpenseEntryDialog } from '@/components/sales/expense-entry-dialog'
import { ExpensesList } from '@/components/sales/expenses-list'
import { ExpensesSummary } from '@/components/sales/expenses-summary'
import { Wallet, Calendar } from 'lucide-react'
import { format } from 'date-fns'

export const metadata = {
  title: 'Expenses | GrandCafe Cheers',
  description: 'Track and manage all business expenses with IVA compliance',
}

async function fetchExpenses(params: { start_date?: string; end_date?: string; category?: string } = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const searchParams = new URLSearchParams()

  if (params.start_date) searchParams.set('start_date', params.start_date)
  if (params.end_date) searchParams.set('end_date', params.end_date)
  if (params.category) searchParams.set('category', params.category)

  try {
    const res = await fetch(`${baseUrl}/api/finance/overhead?${searchParams}`, {
      next: { revalidate: 60 },
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      return { expenses: [], summary: { total_amount: 0, expense_count: 0, by_category: {} } }
    }

    return await res.json()
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return { expenses: [], summary: { total_amount: 0, expense_count: 0, by_category: {} } }
  }
}

export default async function ExpensesPage() {
  const t = await getTranslations('sales')
  const userData = await getCurrentUser()

  if (!userData) {
    redirect('/login')
  }

  // Only allow admin, manager, and owner to view expenses
  const allowedRoles = ['admin', 'manager', 'owner']
  if (!allowedRoles.includes(userData.profile.role)) {
    redirect('/dashboard')
  }

  const data = await fetchExpenses()
  const expenses = data.expenses || []

  // Compute summary with IVA fields
  const totalAmount = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0)
  const totalIVA = expenses
    .filter((e: any) => e.is_deductible !== false)
    .reduce((sum: number, e: any) => sum + (e.iva_amount || 0), 0)
  const totalBase = expenses.reduce((sum: number, e: any) => sum + (e.base_imponible || 0), 0)
  const deductibleTotal = expenses
    .filter((e: any) => e.is_deductible !== false)
    .reduce((sum: number, e: any) => sum + (e.amount || 0), 0)

  const byCategory = expenses.reduce(
    (acc: Record<string, { count: number; total: number; iva: number }>, expense: any) => {
      const cat = expense.category || 'other'
      if (!acc[cat]) {
        acc[cat] = { count: 0, total: 0, iva: 0 }
      }
      acc[cat].count += 1
      acc[cat].total += expense.amount || 0
      acc[cat].iva += expense.iva_amount || 0
      return acc
    },
    {} as Record<string, { count: number; total: number; iva: number }>
  )

  const summary = {
    total_amount: totalAmount,
    total_iva: totalIVA,
    total_base: totalBase,
    deductible_total: deductibleTotal,
    by_category: byCategory,
  }

  const todayDate = format(new Date(), 'EEEE, MMMM d, yyyy')

  return (
    <div className="bg-muted -m-4 md:-m-6 p-4 md:p-6 min-h-full">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-6 w-6 text-orange-500" />
              <h1 className="text-3xl font-bold">{t('expenses.title')}</h1>
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {todayDate}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExpenseEntryDialog />
          </div>
        </div>

        {/* KPI Summary Cards */}
        <ExpensesSummary summary={summary} />

        {/* Expenses List */}
        <ExpensesList expenses={expenses} />
      </div>
    </div>
  )
}
