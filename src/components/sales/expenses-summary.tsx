'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Wallet, Receipt, CheckCircle, BarChart3 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import { EXPENSE_CATEGORIES } from '@/lib/utils/spanish-tax'
import type { ExpenseSummary } from '@/types/expenses'

interface ExpensesSummaryProps {
  summary: ExpenseSummary
}

export function ExpensesSummary({ summary }: ExpensesSummaryProps) {
  const t = useTranslations('sales')

  const getCategoryLabel = (value: string) => {
    const cat = EXPENSE_CATEGORIES.find((c) => c.value === value)
    return cat?.label || value
  }

  // Sort categories by total amount descending
  const sortedCategories = Object.entries(summary.by_category)
    .sort(([, a], [, b]) => b.total - a.total)

  const maxCategoryTotal = sortedCategories.length > 0 ? sortedCategories[0][1].total : 1

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">{t('expenses.totalExpenses')}</CardDescription>
              <Wallet className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">{formatCurrency(summary.total_amount)}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {Object.values(summary.by_category).reduce((sum, cat) => sum + cat.count, 0)} expenses
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">{t('expenses.ivaSoportado')}</CardDescription>
              <Receipt className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">{formatCurrency(summary.total_iva)}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Base: {formatCurrency(summary.total_base)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">{t('expenses.deductibleTotal')}</CardDescription>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">{formatCurrency(summary.deductible_total)}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.total_amount > 0
                ? `${((summary.deductible_total / summary.total_amount) * 100).toFixed(1)}% of total`
                : 'No expenses yet'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">{t('expenses.byCategory')}</CardDescription>
              <BarChart3 className="h-4 w-4 text-violet-500" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">{sortedCategories.length}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {sortedCategories.length > 0
                ? `Top: ${getCategoryLabel(sortedCategories[0][0])}`
                : 'No categories yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {sortedCategories.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{t('expenses.byCategory')}</CardTitle>
                <CardDescription>Expense distribution by category</CardDescription>
              </div>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedCategories.map(([categoryKey, data]) => {
                const percentage =
                  summary.total_amount > 0
                    ? (data.total / summary.total_amount) * 100
                    : 0
                const barWidth =
                  maxCategoryTotal > 0
                    ? (data.total / maxCategoryTotal) * 100
                    : 0

                return (
                  <div key={categoryKey} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{getCategoryLabel(categoryKey)}</span>
                        <span className="text-xs text-muted-foreground">
                          ({data.count} {data.count === 1 ? 'expense' : 'expenses'})
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold">{formatCurrency(data.total)}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-muted dark:bg-muted rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
