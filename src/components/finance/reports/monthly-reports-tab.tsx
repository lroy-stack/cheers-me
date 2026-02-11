'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Download, Calendar, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface MonthlyReport {
  year: number
  month: number
  month_name: string
  days_count: number
  total_revenue: number
  total_cogs: number
  total_labor: number
  total_overhead: number
  total_profit: number
  avg_food_cost_ratio: number
  avg_beverage_cost_ratio: number
  avg_labor_cost_ratio: number
  revenue_growth_pct?: number | null
  profit_growth_pct?: number | null
}

export function MonthlyReportsTab() {
  const t = useTranslations('finance')
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [reports, setReports] = useState<MonthlyReport[]>([])
  const [yearTotals, setYearTotals] = useState<any>(null)
  const [yearAverages, setYearAverages] = useState<any>({
    avg_food_cost_ratio: 0,
    avg_beverage_cost_ratio: 0,
    avg_labor_cost_ratio: 0,
  })
  const [yearProfitMargin, setYearProfitMargin] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  // Generate year options (current year + 2 years back)
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2]

  useEffect(() => {
    fetchMonthlyReports()
  }, [selectedYear])

  const fetchMonthlyReports = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/finance/reports/monthly?year=${selectedYear}`)
      const data = await response.json()

      if (response.ok) {
        setReports((data.monthly_reports || []).map((r: any) => ({
          ...r,
          total_revenue: r.total_revenue ?? 0,
          total_cogs: r.total_cogs ?? 0,
          total_labor: r.total_labor ?? 0,
          total_overhead: r.total_overhead ?? 0,
          total_profit: r.total_profit ?? 0,
          avg_food_cost_ratio: r.avg_food_cost_ratio ?? 0,
          avg_beverage_cost_ratio: r.avg_beverage_cost_ratio ?? 0,
          avg_labor_cost_ratio: r.avg_labor_cost_ratio ?? 0,
        })))
        const totals = data.year_totals || {}
        setYearTotals({
          revenue: totals.revenue ?? 0,
          profit: totals.profit ?? 0,
          cogs: totals.cogs ?? 0,
          labor: totals.labor ?? 0,
          overhead: totals.overhead ?? 0,
        })
        const avg = data.year_averages || {}
        setYearAverages({
          avg_food_cost_ratio: avg.avg_food_cost_ratio ?? 0,
          avg_beverage_cost_ratio: avg.avg_beverage_cost_ratio ?? 0,
          avg_labor_cost_ratio: avg.avg_labor_cost_ratio ?? 0,
        })
        setYearProfitMargin(data.year_profit_margin || 0)
      }
    } catch (error) {
      console.error('Error fetching monthly reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    if (reports.length === 0) return

    const headers = [
      'Year',
      'Month',
      'Days',
      'Revenue',
      'COGS',
      'Labor',
      'Overhead',
      'Profit',
      'Profit Margin %',
      'Food Cost %',
      'Beverage Cost %',
      'Labor Cost %',
      'Revenue Growth %',
      'Profit Growth %',
    ]

    const rows = reports.map((r) => {
      const profitMargin = r.total_revenue > 0 ? (r.total_profit / r.total_revenue) * 100 : 0
      return [
        r.year,
        r.month_name,
        r.days_count,
        r.total_revenue.toFixed(2),
        r.total_cogs.toFixed(2),
        r.total_labor.toFixed(2),
        r.total_overhead.toFixed(2),
        r.total_profit.toFixed(2),
        profitMargin.toFixed(2),
        r.avg_food_cost_ratio.toFixed(2),
        r.avg_beverage_cost_ratio.toFixed(2),
        r.avg_labor_cost_ratio.toFixed(2),
        r.revenue_growth_pct?.toFixed(2) || 'N/A',
        r.profit_growth_pct?.toFixed(2) || 'N/A',
      ]
    })

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `monthly-financial-reports-${selectedYear}.csv`
    a.click()
  }

  const getGrowthIndicator = (growth: number | null | undefined) => {
    if (growth === null || growth === undefined) return null
    if (growth > 0)
      return (
        <span className="flex items-center gap-1 text-green-600">
          <TrendingUp className="h-3 w-3" />
          {growth.toFixed(1)}%
        </span>
      )
    if (growth < 0)
      return (
        <span className="flex items-center gap-1 text-red-500">
          <TrendingDown className="h-3 w-3" />
          {Math.abs(growth).toFixed(1)}%
        </span>
      )
    return <span className="text-muted-foreground">0.0%</span>
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('reports.yearSelection')}</CardTitle>
          <CardDescription>{t('reports.yearSelectionDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="year-select">{t('reports.year')}</Label>
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
            <div className="flex gap-2">
              <Button onClick={fetchMonthlyReports} disabled={loading}>
                <Calendar className="h-4 w-4 mr-2" />
                {loading ? t('reports.loading') : t('reports.refresh')}
              </Button>
              <Button onClick={handleExportCSV} variant="outline" disabled={reports.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                {t('reports.exportCSV')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Year Summary */}
      {yearTotals && yearAverages && (
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('reports.yearTotals', { year: selectedYear })}</CardTitle>
              <CardDescription>{t('reports.monthsWithData', { count: reports.length })}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('reports.totalRevenue')}</span>
                  <span className="text-lg font-bold">&euro;{yearTotals.revenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('reports.totalProfit')}</span>
                  <span
                    className={`text-lg font-bold ${
                      yearTotals.profit >= 0 ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    &euro;{yearTotals.profit.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('reports.profitMargin')}</span>
                  <Badge
                    variant={yearProfitMargin >= 15 ? 'default' : yearProfitMargin >= 5 ? 'secondary' : 'destructive'}
                    className={yearProfitMargin >= 15 ? 'bg-green-500 hover:bg-green-600' : ''}
                  >
                    {yearProfitMargin.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('reports.avgCostRatios')}</CardTitle>
              <CardDescription>{t('reports.ytdAverages')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('reports.foodCost')}</span>
                  <Badge
                    variant={
                      yearAverages.avg_food_cost_ratio <= 30
                        ? 'default'
                        : yearAverages.avg_food_cost_ratio <= 35
                          ? 'secondary'
                          : 'destructive'
                    }
                    className={yearAverages.avg_food_cost_ratio <= 30 ? 'bg-green-500 hover:bg-green-600' : ''}
                  >
                    {yearAverages.avg_food_cost_ratio.toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('reports.beverageCost')}</span>
                  <Badge
                    variant={
                      yearAverages.avg_beverage_cost_ratio <= 22
                        ? 'default'
                        : yearAverages.avg_beverage_cost_ratio <= 28
                          ? 'secondary'
                          : 'destructive'
                    }
                    className={yearAverages.avg_beverage_cost_ratio <= 22 ? 'bg-green-500 hover:bg-green-600' : ''}
                  >
                    {yearAverages.avg_beverage_cost_ratio.toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('reports.laborCost')}</span>
                  <Badge
                    variant={
                      yearAverages.avg_labor_cost_ratio <= 30
                        ? 'default'
                        : yearAverages.avg_labor_cost_ratio <= 35
                          ? 'secondary'
                          : 'destructive'
                    }
                    className={yearAverages.avg_labor_cost_ratio <= 30 ? 'bg-green-500 hover:bg-green-600' : ''}
                  >
                    {yearAverages.avg_labor_cost_ratio.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('reports.costBreakdown')}</CardTitle>
              <CardDescription>{t('reports.costBreakdownDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('reports.cogs')}</span>
                  <span className="text-lg font-semibold">&euro;{yearTotals.cogs.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('reports.labor')}</span>
                  <span className="text-lg font-semibold">&euro;{yearTotals.labor.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('reports.overhead')}</span>
                  <span className="text-lg font-semibold">&euro;{yearTotals.overhead.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monthly Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('reports.monthlyPerformance')}</CardTitle>
          <CardDescription>
            {t('reports.monthlyPerformanceDesc', { year: selectedYear })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">{t('reports.loadingReports')}</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{t('reports.noMonthlyData', { year: selectedYear })}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('reports.month')}</TableHead>
                    <TableHead className="text-center">{t('reports.days')}</TableHead>
                    <TableHead className="text-right">{t('reports.revenue')}</TableHead>
                    <TableHead className="text-right">{t('reports.profit')}</TableHead>
                    <TableHead className="text-right">{t('reports.marginPercent')}</TableHead>
                    <TableHead className="text-right">{t('reports.foodCostPercent')}</TableHead>
                    <TableHead className="text-right">{t('reports.laborCostPercent')}</TableHead>
                    <TableHead className="text-right">{t('reports.revGrowth')}</TableHead>
                    <TableHead className="text-right">{t('reports.profitGrowth')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => {
                    const profitMargin =
                      report.total_revenue > 0
                        ? Number(((report.total_profit / report.total_revenue) * 100).toFixed(2))
                        : 0

                    return (
                      <TableRow key={`${report.year}-${report.month}`}>
                        <TableCell className="font-medium">{report.month_name}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{report.days_count}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          &euro;{report.total_revenue.toLocaleString()}
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            report.total_profit >= 0 ? 'text-green-600' : 'text-red-500'
                          }`}
                        >
                          &euro;{report.total_profit.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={profitMargin >= 15 ? 'default' : profitMargin >= 5 ? 'secondary' : 'destructive'}
                            className={profitMargin >= 15 ? 'bg-green-500 hover:bg-green-600' : ''}
                          >
                            {profitMargin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              report.avg_food_cost_ratio <= 30
                                ? 'default'
                                : report.avg_food_cost_ratio <= 35
                                  ? 'secondary'
                                  : 'destructive'
                            }
                            className={report.avg_food_cost_ratio <= 30 ? 'bg-green-500 hover:bg-green-600' : ''}
                          >
                            {report.avg_food_cost_ratio.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              report.avg_labor_cost_ratio <= 30
                                ? 'default'
                                : report.avg_labor_cost_ratio <= 35
                                  ? 'secondary'
                                  : 'destructive'
                            }
                            className={report.avg_labor_cost_ratio <= 30 ? 'bg-green-500 hover:bg-green-600' : ''}
                          >
                            {report.avg_labor_cost_ratio.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {getGrowthIndicator(report.revenue_growth_pct) || (
                            <span className="text-muted-foreground">&mdash;</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {getGrowthIndicator(report.profit_growth_pct) || (
                            <span className="text-muted-foreground">&mdash;</span>
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
    </div>
  )
}
