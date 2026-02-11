'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface KPIData {
  totalEvents: number
  confirmedCount: number
  pendingCount: number
  todayCount: number
  upcomingCount?: number
}

interface EventKPICardsProps {
  data: KPIData
  isLoading?: boolean
}

export function EventKPICards({ data, isLoading }: EventKPICardsProps) {
  const t = useTranslations('events')
  const kpis = [
    {
      label: t('kpi.totalEvents'),
      value: data.totalEvents,
      icon: Calendar,
      color: 'text-pink-500',
    },
    {
      label: t('calendar.today'),
      value: data.todayCount,
      icon: TrendingUp,
      color: 'text-cyan-500',
    },
    {
      label: t('kpi.confirmed'),
      value: data.confirmedCount,
      icon: CheckCircle,
      color: 'text-green-500',
    },
    {
      label: t('kpi.pending'),
      value: data.pendingCount,
      icon: Clock,
      color: 'text-yellow-500',
    },
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon
        return (
          <Card key={kpi.label}>
            <CardContent className="p-4 sm:pt-6 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-2xl font-bold">{kpi.value}</div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{kpi.label}</p>
                </div>
                <Icon className={`h-6 w-6 sm:h-8 sm:w-8 shrink-0 ${kpi.color}`} />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
