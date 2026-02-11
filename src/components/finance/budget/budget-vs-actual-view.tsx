'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertCircle, TrendingDown, TrendingUp, RefreshCcw, Download } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface BudgetComparison {
  category: string
  budgeted: number
  actual: number
  variance: number
  variance_pct: number
}

export function BudgetVsActualView() {
  const t = useTranslations('finance')
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [comparison, setComparison] = useState<BudgetComparison[]>([])
  const [loading, setLoading] = useState(true)

  const yearOptions = [currentYear, currentYear - 1]
  const monthOptions = [
    { value: 1, label: t('months.january') },
    { value: 2, label: t('months.february') },
    { value: 3, label: t('months.march') },
    { value: 4, label: t('months.april') },
    { value: 5, label: t('months.may') },
    { value: 6, label: t('months.june') },
    { value: 7, label: t('months.july') },
    { value: 8, label: t('months.august') },
    { value: 9, label: t('months.september') },
    { value: 10, label: t('months.october') },
    { value: 11, label: t('months.november') },
    { value: 12, label: t('months.december') },
  ]

  useEffect(() => {
    fetchBudgetComparison()
  }, [selectedYear, selectedMonth])

  const fetchBudgetComparison = async () => {
    setLoading(true)
    try {
      // Calculate proper date range for the selected month
      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate()
      const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

      const response = await fetch(
        `/api/finance/budget-vs-actual?start_date=${startDate}&end_date=${endDate}`
      )
      const data = await response.json()

      if (response.ok && data.category_summary && data.category_summary.length > 0) {
        // Map API response to BudgetComparison format
        setComparison(
          data.category_summary.map((item: { category: string; total_budget: number; total_actual: number; total_variance: number; variance_percentage: number }) => ({
            category: item.category,
            budgeted: item.total_budget,
            actual: item.total_actual,
            variance: item.total_variance,
            variance_pct: item.variance_percentage,
          }))
        )
      } else {
        setComparison([])
      }
    } catch (error) {
      console.error('Error fetching budget comparison:', error)
      setComparison([])
    } finally {
      setLoading(false)
    }
  }

  const getVarianceIndicator = (variance: number, variancePct: number) => {
    const isPositive = variance > 0
    const Icon = isPositive ? TrendingUp : TrendingDown
    const colorClass = isPositive ? 'text-green-600' : 'text-red-500'

    return (
      <div className={`flex items-center gap-2 ${colorClass}`}>
        <Icon className="h-4 w-4" />
        <span className="font-semibold">
          &euro;{Math.abs(variance).toLocaleString()} ({Math.abs(variancePct).toFixed(2)}%)
        </span>
      </div>
    )
  }

  const handleExportCSV = () => {
    if (comparison.length === 0) return

    const headers = ['Category', 'Budgeted', 'Actual', 'Variance', 'Variance %']
    const rows = comparison.map((c) => [
      c.category,
      c.budgeted.toFixed(2),
      c.actual.toFixed(2),
      c.variance.toFixed(2),
      c.variance_pct.toFixed(2),
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `budget-vs-actual-${selectedYear}-${selectedMonth}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('budget.selectPeriod')}</CardTitle>
          <CardDescription>{t('budget.selectPeriodDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="year-select">{t('budget.year')}</Label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v, 10))}>
                <SelectTrigger id="year-select" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="month-select">{t('budget.month')}</Label>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v, 10))}>
                <SelectTrigger id="month-select" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchBudgetComparison} disabled={loading}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                {loading ? t('budget.loading') : t('budget.refresh')}
              </Button>
              <Button onClick={handleExportCSV} variant="outline" disabled={comparison.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                {t('budget.export')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('budget.comparisonTitle', {
              month: monthOptions.find((m) => m.value === selectedMonth)?.label || '',
              year: selectedYear,
            })}
          </CardTitle>
          <CardDescription>
            {t('budget.comparisonDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">{t('budget.loadingComparison')}</div>
          ) : comparison.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{t('budget.noData')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('budget.category')}</TableHead>
                    <TableHead className="text-right">{t('budget.budgeted')}</TableHead>
                    <TableHead className="text-right">{t('budget.actual')}</TableHead>
                    <TableHead className="text-right">{t('budget.variance')}</TableHead>
                    <TableHead className="text-center">{t('budget.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparison.map((item) => {
                    const isFavorable =
                      (item.category === t('budget.categoryRevenue') && item.variance > 0) ||
                      ([t('budget.categoryFoodCost'), t('budget.categoryBeverageCost'), t('budget.categoryLaborCost'), t('budget.categoryOverhead')].includes(
                        item.category
                      ) &&
                        item.variance > 0) ||
                      (item.category === t('budget.categoryNetProfit') && item.variance > 0)

                    return (
                      <TableRow key={item.category}>
                        <TableCell className="font-semibold">{item.category}</TableCell>
                        <TableCell className="text-right">&euro;{item.budgeted.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">
                          &euro;{item.actual.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {getVarianceIndicator(item.variance, item.variance_pct)}
                        </TableCell>
                        <TableCell className="text-center">
                          {Math.abs(item.variance_pct) < 5 ? (
                            <Badge variant="secondary">{t('budget.onTrack')}</Badge>
                          ) : isFavorable ? (
                            <Badge className="bg-green-500 hover:bg-green-600">{t('budget.favorable')}</Badge>
                          ) : (
                            <Badge variant="destructive">{t('budget.unfavorable')}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-base text-blue-900 dark:text-blue-400">{t('budget.keyInsights')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-500">&bull;</span>
              <span>{t('budget.insight1')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">&bull;</span>
              <span>{t('budget.insight2')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">&bull;</span>
              <span>{t('budget.insight3')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">&bull;</span>
              <span>{t('budget.insight4')}</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
