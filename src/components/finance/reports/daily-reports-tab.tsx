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
import { Calendar, Download, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DailyReport {
  date: string
  revenue: number
  cost_of_goods_sold: number
  labor_cost: number
  overhead_cost: number
  profit: number
  profit_margin?: number
  food_cost_ratio?: number
  beverage_cost_ratio?: number
  labor_cost_ratio?: number
}

export function DailyReportsTab() {
  const t = useTranslations('finance')
  const [startDate, setStartDate] = useState(
    format(subDays(new Date(), 30), 'yyyy-MM-dd')
  )
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [reports, setReports] = useState<DailyReport[]>([])
  const [totals, setTotals] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDailyReports()
  }, [startDate, endDate])

  const fetchDailyReports = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/finance/reports/daily?start_date=${startDate}&end_date=${endDate}`
      )
      const data = await response.json()

      if (response.ok) {
        setReports(data.daily_reports || [])
        setTotals(data.totals || null)
      }
    } catch (error) {
      console.error('Error fetching daily reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    if (reports.length === 0) return

    const headers = [
      'Date',
      'Revenue',
      'COGS',
      'Labor Cost',
      'Overhead',
      'Profit',
      'Profit Margin %',
      'Food Cost %',
      'Beverage Cost %',
      'Labor Cost %',
    ]

    const rows = reports.map((r) => [
      r.date,
      r.revenue.toFixed(2),
      r.cost_of_goods_sold.toFixed(2),
      r.labor_cost.toFixed(2),
      r.overhead_cost.toFixed(2),
      r.profit.toFixed(2),
      r.profit_margin?.toFixed(2) || '0.00',
      r.food_cost_ratio?.toFixed(2) || '0.00',
      r.beverage_cost_ratio?.toFixed(2) || '0.00',
      r.labor_cost_ratio?.toFixed(2) || '0.00',
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `daily-financial-reports-${startDate}-to-${endDate}.csv`
    a.click()
  }

  const getProfitTrend = (profit: number) => {
    if (profit > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (profit < 0) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('reports.dateRangeFilter')}</CardTitle>
          <CardDescription>{t('reports.dateRangeDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="start-date">{t('reports.startDate')}</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="end-date">{t('reports.endDate')}</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchDailyReports} disabled={loading}>
                <Calendar className="h-4 w-4 mr-2" />
                {loading ? t('reports.loading') : t('reports.apply')}
              </Button>
              <Button onClick={handleExportCSV} variant="outline" disabled={reports.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                {t('reports.exportCSV')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Period Summary */}
      {totals && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('reports.periodSummary')}</CardTitle>
            <CardDescription>
              {t('reports.periodSummaryDesc', {
                start: format(new Date(startDate), 'MMM d, yyyy'),
                end: format(new Date(endDate), 'MMM d, yyyy'),
                days: reports.length,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t('reports.totalRevenue')}</p>
                <p className="text-xl font-bold">&euro;{totals.revenue.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t('reports.totalCOGS')}</p>
                <p className="text-xl font-bold">&euro;{totals.cost_of_goods_sold.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t('reports.totalLabor')}</p>
                <p className="text-xl font-bold">&euro;{totals.labor_cost.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t('reports.totalOverhead')}</p>
                <p className="text-xl font-bold">&euro;{totals.overhead_cost.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t('reports.netProfit')}</p>
                <p
                  className={`text-xl font-bold ${
                    totals.profit >= 0 ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  &euro;{totals.profit.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('reports.dailyFinancialReports')}</CardTitle>
          <CardDescription>{t('reports.detailedBreakdown')}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">{t('reports.loadingReports')}</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('reports.noDataSelected')}
            </div>
          ) : (
            <>
              {/* Desktop Table View - hidden on mobile */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('reports.date')}</TableHead>
                      <TableHead className="text-right">{t('reports.revenue')}</TableHead>
                      <TableHead className="text-right">{t('reports.cogs')}</TableHead>
                      <TableHead className="text-right">{t('reports.labor')}</TableHead>
                      <TableHead className="text-right">{t('reports.overhead')}</TableHead>
                      <TableHead className="text-right">{t('reports.profit')}</TableHead>
                      <TableHead className="text-right">{t('reports.marginPercent')}</TableHead>
                      <TableHead className="text-center">{t('reports.trend')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report, _index) => {
                      const profitMargin =
                        report.revenue > 0
                          ? Number(((report.profit / report.revenue) * 100).toFixed(2))
                          : 0

                      return (
                        <TableRow key={report.date}>
                          <TableCell className="font-medium">
                            {format(new Date(report.date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">&euro;{report.revenue.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            &euro;{report.cost_of_goods_sold.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">&euro;{report.labor_cost.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            &euro;{report.overhead_cost.toLocaleString()}
                          </TableCell>
                          <TableCell
                            className={`text-right font-semibold ${
                              report.profit >= 0 ? 'text-green-600' : 'text-red-500'
                            }`}
                          >
                            &euro;{report.profit.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={profitMargin >= 15 ? 'default' : profitMargin >= 5 ? 'secondary' : 'destructive'}
                              className={profitMargin >= 15 ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
                            >
                              {profitMargin.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{getProfitTrend(report.profit)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View - shown only on mobile */}
              <div className="block md:hidden space-y-3">
                {reports.map((report, _index) => {
                  const profitMargin =
                    report.revenue > 0
                      ? Number(((report.profit / report.revenue) * 100).toFixed(2))
                      : 0

                  return (
                    <div
                      key={report.date}
                      className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-3"
                    >
                      {/* Header: Date and Profit Margin */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {format(new Date(report.date), 'MMM d, yyyy')}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            {getProfitTrend(report.profit)}
                            <span className="text-sm text-muted-foreground">{t('reports.trend')}</span>
                          </div>
                        </div>
                        <Badge
                          variant={profitMargin >= 15 ? 'default' : profitMargin >= 5 ? 'secondary' : 'destructive'}
                          className={profitMargin >= 15 ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
                        >
                          {profitMargin.toFixed(1)}%
                        </Badge>
                      </div>

                      {/* Key Metrics */}
                      <div className="space-y-2 pt-2 border-t border-border">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{t('reports.revenue')}</span>
                          <span className="text-sm font-semibold text-foreground">
                            &euro;{report.revenue.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{t('reports.profit')}</span>
                          <span
                            className={`text-sm font-semibold ${
                              report.profit >= 0 ? 'text-green-600' : 'text-red-500'
                            }`}
                          >
                            &euro;{report.profit.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Cost Breakdown */}
                      <div className="space-y-2 pt-2 border-t border-border">
                        <div className="text-xs font-medium text-muted-foreground uppercase">
                          {t('reports.costs')}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{t('reports.cogs')}</span>
                          <span className="text-sm text-foreground">
                            &euro;{report.cost_of_goods_sold.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{t('reports.labor')}</span>
                          <span className="text-sm text-foreground">
                            &euro;{report.labor_cost.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">{t('reports.overhead')}</span>
                          <span className="text-sm text-foreground">
                            &euro;{report.overhead_cost.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
