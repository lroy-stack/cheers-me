'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Clock, Bell, TrendingUp } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface WaitlistKPIData {
  total_waiting: number
  total_notified: number
  total_seated_today: number
  average_wait_minutes: number | null
}

interface WaitlistKPICardsProps {
  data: WaitlistKPIData
  isLoading?: boolean
}

export function WaitlistKPICards({ data, isLoading }: WaitlistKPICardsProps) {
  const t = useTranslations('reservations')
  const cards = [
    {
      title: t('waitlist.waitTime'),
      value: data.total_waiting,
      icon: Users,
      description: 'Active waitlist',
      color: 'text-primary',
    },
    {
      title: t('waitlist.notify'),
      value: data.total_notified,
      icon: Bell,
      description: 'Waiting for response',
      color: 'text-blue-500',
    },
    {
      title: t('waitlist.seat'),
      value: data.total_seated_today,
      icon: TrendingUp,
      description: 'From waitlist',
      color: 'text-green-500',
    },
    {
      title: t('waitlist.estimatedWait'),
      value: data.average_wait_minutes
        ? t('waitlist.minutes', { count: Math.round(data.average_wait_minutes) })
        : 'N/A',
      icon: Clock,
      description: 'Average today',
      color: 'text-cyan-500',
    },
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
