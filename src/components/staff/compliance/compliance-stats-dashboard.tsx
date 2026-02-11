'use client'

import { ComplianceStats } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslations } from 'next-intl'
import {
  FileText,
  CalendarDays,
  Calendar,
  AlertTriangle,
  Clock,
} from 'lucide-react'

interface ComplianceStatsDashboardProps {
  stats: ComplianceStats | null
  loading: boolean
}

export function ComplianceStatsDashboard({ stats, loading }: ComplianceStatsDashboardProps) {
  const t = useTranslations('staff.compliance')

  if (loading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
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

  const cards = [
    {
      icon: FileText,
      color: 'text-blue-500',
      value: stats.totalRecords,
      label: t('stats.totalRecords'),
    },
    {
      icon: CalendarDays,
      color: 'text-green-500',
      value: stats.recordsThisWeek,
      label: t('stats.thisWeek'),
    },
    {
      icon: Calendar,
      color: 'text-indigo-500',
      value: stats.recordsThisMonth,
      label: t('stats.thisMonth'),
    },
    {
      icon: AlertTriangle,
      color: 'text-red-500',
      value: stats.flaggedCount,
      label: t('stats.flagged'),
    },
    {
      icon: Clock,
      color: 'text-orange-500',
      value: stats.pendingReviewCount,
      label: t('stats.pendingReview'),
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${card.color}`} />
                <div className="text-2xl font-bold">{card.value}</div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
