'use client'

import { SchedulePlan } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react'
import { format, addWeeks, subWeeks, startOfWeek } from 'date-fns'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

interface SchedulePageHeaderProps {
  weekStart: Date
  onWeekChange: (date: Date) => void
  plan: SchedulePlan | null
}

export function SchedulePageHeader({ weekStart, onWeekChange, plan }: SchedulePageHeaderProps) {
  const t = useTranslations('staff')

  const weekEnd = addWeeks(weekStart, 1)

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <Link href="/staff">
          <Button variant="ghost" size="sm" className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('schedule.backToStaff')}
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{t('schedule.title')}</h1>
          {plan && (
            <Badge
              variant={plan.status === 'published' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {plan.status === 'published' ? t('schedule.published') : t('schedule.draft')}
              {plan.version > 1 && ` v${plan.version}`}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-1">{t('schedule.subtitle')}</p>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onWeekChange(subWeeks(weekStart, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onWeekChange(startOfWeek(new Date(), { weekStartsOn: 1 }))}
        >
          {t('schedule.thisWeek')}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onWeekChange(addWeeks(weekStart, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium ml-2">
          {format(weekStart, 'dd MMM')} - {format(subWeeks(weekEnd, 0), 'dd MMM yyyy')}
        </span>
      </div>
    </div>
  )
}
