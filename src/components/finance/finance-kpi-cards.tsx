'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus, Euro, PiggyBank, CreditCard, Wallet } from 'lucide-react'

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' | null }) {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />
  if (trend === 'stable') return <Minus className="h-4 w-4 text-muted-foreground" />
  return null
}

function TrendBadge({ value, isProfit = false, label }: { value: number | null; isProfit?: boolean; label: string }) {
  if (value === null) return null

  const isPositive = isProfit ? value > 0 : value > 0
  const color = isPositive ? 'text-green-600' : 'text-red-600'

  return (
    <p className={`text-xs ${color} font-medium mt-1`}>
      {value > 0 ? '+' : ''}
      {value.toFixed(1)}% {label}
    </p>
  )
}

interface FinanceKPICardsProps {
  todayRevenue: number
  todayProfit: number
  todayProfitMargin: number
  todayCOGS: number
  todayLabor: number
  todayOverhead: number
  yesterdayRevenue?: number | null
  yesterdayProfit?: number | null
  weekRevenue: number
  weekProfit: number
  monthRevenue: number
  monthProfit: number
}

export function FinanceKPICards({
  todayRevenue,
  todayProfit,
  todayProfitMargin,
  todayCOGS,
  todayLabor,
  todayOverhead,
  yesterdayRevenue,
  yesterdayProfit,
  weekRevenue,
  weekProfit,
  monthRevenue,
  monthProfit,
}: FinanceKPICardsProps) {
  const t = useTranslations('finance')

  // Calculate trends
  const revenueTrend =
    yesterdayRevenue && yesterdayRevenue > 0
      ? todayRevenue > yesterdayRevenue
        ? 'up'
        : todayRevenue < yesterdayRevenue
        ? 'down'
        : 'stable'
      : null

  const profitTrend =
    yesterdayProfit && yesterdayProfit > 0
      ? todayProfit > yesterdayProfit
        ? 'up'
        : todayProfit < yesterdayProfit
        ? 'down'
        : 'stable'
      : null

  const revenueChange =
    yesterdayRevenue && yesterdayRevenue > 0
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
      : null

  const profitChange =
    yesterdayProfit && yesterdayProfit > 0
      ? ((todayProfit - yesterdayProfit) / yesterdayProfit) * 100
      : null

  const vsYesterdayLabel = t('kpi.vsYesterday')

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Today's Revenue */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardDescription className="flex items-center justify-between">
            <span>{t('kpi.todayRevenue')}</span>
            <Euro className="h-4 w-4 text-emerald-500" />
          </CardDescription>
          <div className="flex items-baseline gap-2">
            <CardTitle className="text-2xl">&euro;{todayRevenue.toLocaleString()}</CardTitle>
            {revenueTrend && <TrendIcon trend={revenueTrend} />}
          </div>
        </CardHeader>
        <CardContent>
          <TrendBadge value={revenueChange} label={vsYesterdayLabel} />
          <p className="text-xs text-muted-foreground mt-1">
            {t('kpi.week')}: &euro;{weekRevenue.toLocaleString()}
          </p>
        </CardContent>
      </Card>

      {/* Today's Profit */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardDescription className="flex items-center justify-between">
            <span>{t('kpi.todayProfit')}</span>
            <PiggyBank className="h-4 w-4 text-primary" />
          </CardDescription>
          <div className="flex items-baseline gap-2">
            <CardTitle className={`text-2xl ${todayProfit < 0 ? 'text-red-500' : ''}`}>
              &euro;{todayProfit.toLocaleString()}
            </CardTitle>
            {profitTrend && <TrendIcon trend={profitTrend} />}
          </div>
        </CardHeader>
        <CardContent>
          <TrendBadge value={profitChange} isProfit label={vsYesterdayLabel} />
          <p className="text-xs text-muted-foreground mt-1">
            {t('kpi.margin')}: {todayProfitMargin.toFixed(1)}%
          </p>
        </CardContent>
      </Card>

      {/* Week Summary */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardDescription className="flex items-center justify-between">
            <span>{t('kpi.weekToDate')}</span>
            <CreditCard className="h-4 w-4 text-blue-500" />
          </CardDescription>
          <CardTitle className="text-2xl">&euro;{weekRevenue.toLocaleString()}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{t('kpi.revenue')}</p>
          <p className={`text-sm font-semibold mt-1 ${weekProfit < 0 ? 'text-red-500' : 'text-green-600'}`}>
            &euro;{weekProfit.toLocaleString()} {t('kpi.profit')}
          </p>
        </CardContent>
      </Card>

      {/* Month Summary */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardDescription className="flex items-center justify-between">
            <span>{t('kpi.monthToDate')}</span>
            <Wallet className="h-4 w-4 text-violet-500" />
          </CardDescription>
          <CardTitle className="text-2xl">&euro;{monthRevenue.toLocaleString()}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{t('kpi.revenue')}</p>
          <p className={`text-sm font-semibold mt-1 ${monthProfit < 0 ? 'text-red-500' : 'text-green-600'}`}>
            &euro;{monthProfit.toLocaleString()} {t('kpi.profit')}
          </p>
        </CardContent>
      </Card>

      {/* Cost Breakdown Mini Cards */}
      <Card className="md:col-span-4">
        <CardHeader>
          <CardTitle className="text-base">{t('kpi.costBreakdown')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('kpi.revenue')}</p>
              <p className="text-lg font-bold text-emerald-600">&euro;{todayRevenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">100%</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('kpi.costOfGoods')}</p>
              <p className="text-lg font-bold text-orange-600">&euro;{todayCOGS.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                {todayRevenue > 0 ? ((todayCOGS / todayRevenue) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('kpi.laborCost')}</p>
              <p className="text-lg font-bold text-blue-600">&euro;{todayLabor.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                {todayRevenue > 0 ? ((todayLabor / todayRevenue) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('kpi.overhead')}</p>
              <p className="text-lg font-bold text-violet-600">&euro;{todayOverhead.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                {todayRevenue > 0 ? ((todayOverhead / todayRevenue) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
