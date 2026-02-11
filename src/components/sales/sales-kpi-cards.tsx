'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowDown, ArrowUp, Euro, Receipt, TrendingUp, Users } from 'lucide-react'

interface SalesKPICardsProps {
  todayRevenue: number
  weekRevenue: number
  weekGrowth: number | null
  todayTickets: number
  weekAvgTicket: number
  todayTips: number
  weekTips: number
}

export function SalesKPICards({
  todayRevenue,
  weekRevenue,
  weekGrowth,
  todayTickets,
  weekAvgTicket: _weekAvgTicket,
  todayTips,
  weekTips,
}: SalesKPICardsProps) {
  const t = useTranslations('sales')
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const todayAvgTicket = todayTickets > 0 ? todayRevenue / todayTickets : 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Today's Revenue */}
      <Card className="border-l-4 border-l-violet-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardDescription className="text-xs">{t('overview.totalRevenue')}</CardDescription>
            <Euro className="h-4 w-4 text-violet-500" />
          </div>
        </CardHeader>
        <CardContent>
          <CardTitle className="text-2xl mb-2">{formatCurrency(todayRevenue)}</CardTitle>
          {weekGrowth !== null && (
            <div className="flex items-center text-xs">
              {weekGrowth >= 0 ? (
                <>
                  <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-green-500">+{weekGrowth.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <ArrowDown className="h-3 w-3 text-red-500 mr-1" />
                  <span className="text-red-500">{weekGrowth.toFixed(1)}%</span>
                </>
              )}
              <span className="text-muted-foreground ml-1">{t('overview.vsLastWeek')}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Week Revenue */}
      <Card className="border-l-4 border-l-emerald-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardDescription className="text-xs">{t('overview.thisWeek')}</CardDescription>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
        </CardHeader>
        <CardContent>
          <CardTitle className="text-2xl mb-2">{formatCurrency(weekRevenue)}</CardTitle>
          <p className="text-xs text-muted-foreground">{t('overview.last7DaysTotal')}</p>
        </CardContent>
      </Card>

      {/* Average Ticket */}
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardDescription className="text-xs">{t('overview.averageOrder')}</CardDescription>
            <Receipt className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <CardTitle className="text-2xl mb-2">{formatCurrency(todayAvgTicket)}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {t('overview.todayTickets', { count: todayTickets })}
          </p>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="border-l-4 border-l-pink-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardDescription className="text-xs">{t('tips.title')}</CardDescription>
            <Users className="h-4 w-4 text-pink-500" />
          </div>
        </CardHeader>
        <CardContent>
          <CardTitle className="text-2xl mb-2">{formatCurrency(todayTips)}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {t('tips.weekTotal', { amount: formatCurrency(weekTips) })}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
