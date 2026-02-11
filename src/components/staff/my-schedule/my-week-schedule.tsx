'use client'

import { useTranslations } from 'next-intl'
import { format, addDays, subDays, startOfWeek, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { SHIFT_TYPE_CONFIG, SHIFT_TYPE_TO_CELL_TYPE } from '@/lib/constants/schedule'
import { ShiftDayCard } from './shift-day-card'
import { exportMyScheduleToExcel } from '@/lib/utils/my-schedule-excel-export'
import type { ShiftWithEmployee } from '@/types'

interface MyWeekScheduleProps {
  employeeName: string
  shifts: ShiftWithEmployee[]
  loading: boolean
  weekStart: Date
  onWeekChange: (date: Date) => void
}

export function MyWeekSchedule({
  employeeName,
  shifts,
  loading,
  weekStart,
  onWeekChange,
}: MyWeekScheduleProps) {
  const t = useTranslations('staff.mySchedule')

  const dayKeys = ['dayMon', 'dayTue', 'dayWed', 'dayThu', 'dayFri', 'daySat', 'daySun'] as const

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i)
    return {
      date: format(date, 'yyyy-MM-dd'),
      dayLabel: t(dayKeys[i]),
      dayNumber: format(date, 'd'),
      isToday: isSameDay(date, new Date()),
      dateObj: date,
    }
  })

  const shiftByDate = new Map<string, ShiftWithEmployee>()
  for (const shift of shifts) {
    if (shift.status !== 'cancelled') {
      shiftByDate.set(shift.date, shift)
    }
  }

  // Total hours
  let totalHours = 0
  for (const shift of shifts) {
    if (shift.status === 'cancelled') continue
    const cellType = SHIFT_TYPE_TO_CELL_TYPE[shift.shift_type]
    if (cellType && SHIFT_TYPE_CONFIG[cellType]) {
      totalHours += SHIFT_TYPE_CONFIG[cellType].hours
    }
  }

  const handlePrev = () => onWeekChange(subDays(weekStart, 7))
  const handleNext = () => onWeekChange(addDays(weekStart, 7))
  const handleToday = () => onWeekChange(startOfWeek(new Date(), { weekStartsOn: 1 }))

  const handleDownload = () => {
    exportMyScheduleToExcel({
      employeeName,
      weekStart,
      weekDays: weekDays.map((d) => d.date),
      dayLabels: weekDays.map((d) => d.dayLabel),
      shifts,
    })
  }

  return (
    <div className="space-y-4">
      {/* Week Navigator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {t('weekOf', { date: format(weekStart, 'dd MMM yyyy') })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            {t('today')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1" />
            {t('downloadExcel')}
          </Button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {weekDays.map((day) => (
              <ShiftDayCard
                key={day.date}
                dayLabel={day.dayLabel}
                dayNumber={day.dayNumber}
                shift={shiftByDate.get(day.date) || null}
                isToday={day.isToday}
              />
            ))}
          </div>

          {/* Total */}
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <span className="text-sm font-medium text-muted-foreground">{t('totalHours')}</span>
              <span className="text-lg font-bold">{totalHours.toFixed(1)}h</span>
            </CardContent>
          </Card>

          {shifts.length === 0 && (
            <p className="text-center text-muted-foreground py-4">{t('noShifts')}</p>
          )}
        </>
      )}
    </div>
  )
}
