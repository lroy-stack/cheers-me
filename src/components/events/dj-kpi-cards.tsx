'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Music2, Users, Euro, TrendingUp } from 'lucide-react'
import { DJKPIData } from './dj-types'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslations } from 'next-intl'

interface DJKPICardsProps {
  data: DJKPIData
  isLoading?: boolean
}

export function DJKPICards({ data, isLoading }: DJKPICardsProps) {
  const t = useTranslations('events.djKpi')

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: t('totalDjs'),
      value: data.totalDJs,
      icon: Music2,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
    },
    {
      title: t('activeThisMonth'),
      value: data.activeDJs,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: t('totalFees'),
      value: `€${data.totalFees.toFixed(0)}`,
      icon: Euro,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: t('avgFee'),
      value: `€${data.avgFeePerDJ.toFixed(0)}`,
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${card.bgColor}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.title}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
