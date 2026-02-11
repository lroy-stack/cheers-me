'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Euro, TrendingUp, Users, Trophy } from 'lucide-react'

interface EmployeeTipSummary {
  employee_id: string
  employee_name: string
  total_tips: number
  tip_count: number
  avg_tip: number
}

interface TipsSummaryProps {
  summary: {
    total_tips: number
    total_shifts: number
    avg_tip_per_shift: number
    by_employee: EmployeeTipSummary[]
  }
  period?: string
}

export function TipsSummary({ summary, period = 'today' }: TipsSummaryProps) {
  const t = useTranslations('sales')
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // Sort employees by total tips (descending)
  const sortedEmployees = [...summary.by_employee].sort((a, b) => b.total_tips - a.total_tips)
  const topEarner = sortedEmployees[0]

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-pink-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">{t('tips.totalTips')}</CardDescription>
              <Euro className="h-4 w-4 text-pink-500" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">{formatCurrency(summary.total_tips)}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              From {summary.total_shifts} shifts
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">Avg per Shift</CardDescription>
              <TrendingUp className="h-4 w-4 text-violet-500" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">{formatCurrency(summary.avg_tip_per_shift)}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Average tip amount
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">Top Earner</CardDescription>
              <Trophy className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            {topEarner ? (
              <>
                <CardTitle className="text-xl truncate">{topEarner.employee_name}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(topEarner.total_tips)} total
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Employee Breakdown */}
      {sortedEmployees.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{t('tips.distribution')}</CardTitle>
                <CardDescription>Breakdown for {period}</CardDescription>
              </div>
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedEmployees.map((employee, index) => {
                const percentage = summary.total_tips > 0
                  ? (employee.total_tips / summary.total_tips) * 100
                  : 0

                return (
                  <div key={employee.employee_id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {index === 0 && <span className="text-lg">🥇</span>}
                        {index === 1 && <span className="text-lg">🥈</span>}
                        {index === 2 && <span className="text-lg">🥉</span>}
                        <span className="font-medium">{employee.employee_name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {employee.tip_count} {employee.tip_count === 1 ? 'shift' : 'shifts'}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(employee.total_tips)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(employee.avg_tip)} avg
                        </p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-muted dark:bg-muted rounded-full h-2">
                      <div
                        className="bg-pink-500 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
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
