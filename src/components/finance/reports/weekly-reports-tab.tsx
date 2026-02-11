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
import { Download, TrendingUp, BarChart3, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface WeeklyReport {
  week_start: string
  week_end: string
  days_count: number
  total_revenue: number
  total_cogs: number
  total_labor: number
  total_overhead: number
  total_profit: number
  avg_food_cost_ratio: number
  avg_beverage_cost_ratio: number
  avg_labor_cost_ratio: number
}

export function WeeklyReportsTab() {
  const t = useTranslations('finance')
  const [limit, setLimit] = useState(12) // Default: last 12 weeks
  const [reports, setReports] = useState<WeeklyReport[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [averages, setAverages] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWeeklyReports()
  }, [limit])

  const fetchWeeklyReports = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/finance/reports/weekly?limit=${limit}`)
      const data = await response.json()

      if (response.ok) {
        setReports((data.weekly_reports || []).map((r: any) => ({
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
        const s = data.summary || {}
        setSummary({
          weeks_count: s.weeks_count ?? 0,
          total_revenue: s.total_revenue ?? 0,
          total_profit: s.total_profit ?? 0,
        })
        const a = data.averages || {}
        setAverages({
          avg_weekly_revenue: a.avg_weekly_revenue ?? 0,
          avg_weekly_profit: a.avg_weekly_profit ?? 0,
          avg_food_cost_ratio: a.avg_food_cost_ratio ?? 0,
          avg_labor_cost_ratio: a.avg_labor_cost_ratio ?? 0,
        })
      }
    } catch (error) {
      console.error('Error fetching weekly reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    if (reports.length === 0) return

    const headers = [
      'Week Start',
      'Week End',
      'Days',
      'Revenue',
      'COGS',
      'Labor',
      'Overhead',
      'Profit',
      'Profit Margin %',
      'Avg Food Cost %',
      'Avg Beverage Cost %',
      'Avg Labor Cost %',
    ]

    const rows = reports.map((r) => {
      const profitMargin = r.total_revenue > 0 ? (r.total_profit / r.total_revenue) * 100 : 0
      return [
        r.week_start,
        r.week_end,
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
      ]
    })

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `weekly-financial-reports-last-${limit}-weeks.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('reports.reportSettings')}</CardTitle>
          <CardDescription>{t('reports.reportSettingsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="week-limit">{t('reports.numberOfWeeks')}</Label>
              <Input
                id="week-limit"
                type="number"
                min="1"
                max="52"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value, 10) || 12)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchWeeklyReports} disabled={loading}>
                <BarChart3 className="h-4 w-4 mr-2" />
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

      {/* Overall Summary */}
      {summary && averages && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                {t('reports.periodTotals')}
              </CardTitle>
              <CardDescription>{t('reports.periodTotalsDesc', { count: summary.weeks_count })}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t('reports.totalRevenue')}</p>
                  <p className="text-xl font-bold">&euro;{summary.total_revenue.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t('reports.totalProfit')}</p>
                  <p
                    className={`text-xl font-bold ${
                      summary.total_profit >= 0 ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    &euro;{summary.total_profit.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-violet-500" />
                {t('reports.weeklyAverages')}
              </CardTitle>
              <CardDescription>{t('reports.weeklyAveragesDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t('reports.avgRevenue')}</p>
                  <p className="text-xl font-bold">&euro;{averages.avg_weekly_revenue.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t('reports.avgProfit')}</p>
                  <p
                    className={`text-xl font-bold ${
                      averages.avg_weekly_profit >= 0 ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    &euro;{averages.avg_weekly_profit.toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t('reports.foodCostRatio')}</p>
                  <p className="text-lg font-semibold">{averages.avg_food_cost_ratio.toFixed(1)}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t('reports.laborCostRatio')}</p>
                  <p className="text-lg font-semibold">{averages.avg_labor_cost_ratio.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Weekly Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('reports.weeklyReports')}</CardTitle>
          <CardDescription>{t('reports.weeklyReportsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">{t('reports.loadingReports')}</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{t('reports.noWeeklyData')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('reports.week')}</TableHead>
                    <TableHead className="text-center">{t('reports.days')}</TableHead>
                    <TableHead className="text-right">{t('reports.revenue')}</TableHead>
                    <TableHead className="text-right">{t('reports.cogs')}</TableHead>
                    <TableHead className="text-right">{t('reports.labor')}</TableHead>
                    <TableHead className="text-right">{t('reports.profit')}</TableHead>
                    <TableHead className="text-right">{t('reports.marginPercent')}</TableHead>
                    <TableHead className="text-right">{t('reports.foodCostPercent')}</TableHead>
                    <TableHead className="text-right">{t('reports.laborCostPercent')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => {
                    const profitMargin =
                      report.total_revenue > 0
                        ? Number(((report.total_profit / report.total_revenue) * 100).toFixed(2))
                        : 0

                    return (
                      <TableRow key={report.week_start}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {format(new Date(report.week_start), 'MMM d')} -{' '}
                              {format(new Date(report.week_end), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{report.days_count}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          &euro;{report.total_revenue.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">&euro;{report.total_cogs.toLocaleString()}</TableCell>
                        <TableCell className="text-right">&euro;{report.total_labor.toLocaleString()}</TableCell>
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
                            className={
                              report.avg_food_cost_ratio <= 30 ? 'bg-green-500 hover:bg-green-600' : ''
                            }
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
                            className={
                              report.avg_labor_cost_ratio <= 30 ? 'bg-green-500 hover:bg-green-600' : ''
                            }
                          >
                            {report.avg_labor_cost_ratio.toFixed(1)}%
                          </Badge>
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
