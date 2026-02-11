'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from 'next-intl'
import {
  CalendarCheck,
  Users,
  TrendingUp,
  UserX,
  Clock,
  CheckCircle2,
} from 'lucide-react'

interface KPIData {
  totalReservations: number
  totalCovers: number
  confirmedCount: number
  pendingCount: number
  seatedCount: number
  completedCount: number
  noShowCount: number
  occupancyRate?: number
  comparisonText?: string
}

interface ReservationKPICardsProps {
  data: KPIData
  isLoading?: boolean
}

export function ReservationKPICards({ data, isLoading }: ReservationKPICardsProps) {
  const t = useTranslations('reservations')
  const cards = [
    {
      title: t('title'),
      value: data.totalReservations,
      icon: CalendarCheck,
      description: t('overview.todaysBookings'),
      trend: data.comparisonText || null,
      color: "text-cyan-500",
    },
    {
      title: t('overview.totalCovers'),
      value: data.totalCovers,
      icon: Users,
      description: t('overview.expectedGuests'),
      color: "text-blue-500",
    },
    {
      title: t('overview.seated'),
      value: data.seatedCount,
      icon: CheckCircle2,
      description: t('overview.activeTables'),
      color: "text-green-500",
    },
    {
      title: t('overview.occupancyRate'),
      value: data.occupancyRate ? `${data.occupancyRate}%` : "N/A",
      icon: TrendingUp,
      description: t('overview.tableUtilization'),
      color: "text-primary",
    },
    {
      title: t('overview.pending'),
      value: data.pendingCount,
      icon: Clock,
      description: t('overview.awaitingConfirmation'),
      color: "text-orange-500",
    },
    {
      title: t('overview.noShow'),
      value: data.noShowCount,
      icon: UserX,
      description: t('overview.today'),
      color: "text-red-500",
    },
  ]

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-3 w-20 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
              {card.trend && (
                <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                  {card.trend}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
