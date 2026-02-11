'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { SHIFT_TYPE_CONFIG, SHIFT_TYPE_TO_CELL_TYPE } from '@/lib/constants/schedule'
import type { ShiftWithEmployee } from '@/types'

interface ShiftDayCardProps {
  dayLabel: string
  dayNumber: string
  shift: ShiftWithEmployee | null
  isToday: boolean
}

export function ShiftDayCard({ dayLabel, dayNumber, shift, isToday }: ShiftDayCardProps) {
  const t = useTranslations('staff.mySchedule')

  const cellType = shift ? SHIFT_TYPE_TO_CELL_TYPE[shift.shift_type] : null
  const config = cellType ? SHIFT_TYPE_CONFIG[cellType] : null

  const shiftTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      morning: t('shiftMorning'),
      afternoon: t('shiftAfternoon'),
      night: t('shiftNight'),
      split: t('shiftSplit'),
    }
    return map[type] || type
  }

  return (
    <Card className={cn('transition-all', isToday && 'ring-2 ring-primary')}>
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase text-muted-foreground">{dayLabel}</span>
          <span className={cn('text-sm font-bold', isToday && 'text-primary')}>{dayNumber}</span>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {shift ? (
          <div className="space-y-1.5">
            <span
              className={cn(
                'inline-block rounded-md px-2 py-0.5 text-xs font-semibold',
                config?.bg,
                config?.text
              )}
            >
              {shiftTypeLabel(shift.shift_type)}
            </span>
            <p className="text-sm font-medium">
              {shift.start_time} - {shift.end_time}
            </p>
            {shift.second_start_time && (
              <p className="text-xs text-muted-foreground">
                {shift.second_start_time} - {shift.second_end_time}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              —
            </span>
            <p className="text-sm text-muted-foreground">{t('noShift')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
