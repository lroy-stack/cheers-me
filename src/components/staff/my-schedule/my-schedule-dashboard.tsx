'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { startOfWeek, addDays, format, parseISO } from 'date-fns'
import { Clock, Calendar, Timer } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useShifts } from '@/hooks/use-shifts'
import { SHIFT_TYPE_CONFIG, SHIFT_TYPE_TO_CELL_TYPE } from '@/lib/constants/schedule'
import { MyWeekSchedule } from './my-week-schedule'
import { MyWeekTasks } from './my-week-tasks'
import { MyHoursSummary } from './my-hours-summary'

interface MyScheduleDashboardProps {
  employeeId: string
  employeeName: string
}

export function MyScheduleDashboard({ employeeId, employeeName }: MyScheduleDashboardProps) {
  const t = useTranslations('staff.mySchedule')
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )

  const startDate = format(weekStart, 'yyyy-MM-dd')
  const endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd')

  const { shifts, loading } = useShifts({
    employeeId,
    startDate,
    endDate,
  })

  // Quick info calculations
  const { nextShift, daysOff, totalHours } = useMemo(() => {
    const now = new Date()
    const todayStr = format(now, 'yyyy-MM-dd')

    // Next shift: first shift on or after today
    const upcoming = shifts
      .filter((s) => s.date >= todayStr && s.status !== 'cancelled')
      .sort((a, b) => a.date.localeCompare(b.date))
    const next = upcoming[0] || null

    // Days off: count days in the week with no shift
    const weekDays = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd'))
    const shiftDates = new Set(shifts.filter((s) => s.status !== 'cancelled').map((s) => s.date))
    const offCount = weekDays.filter((d) => !shiftDates.has(d)).length

    // Total hours from shifts
    let hours = 0
    for (const shift of shifts) {
      if (shift.status === 'cancelled') continue
      const cellType = SHIFT_TYPE_TO_CELL_TYPE[shift.shift_type]
      if (cellType && SHIFT_TYPE_CONFIG[cellType]) {
        hours += SHIFT_TYPE_CONFIG[cellType].hours
      }
    }

    return { nextShift: next, daysOff: offCount, totalHours: hours }
  }, [shifts, weekStart])

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
    <div className="space-y-6">
      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-blue-100 dark:bg-blue-900/40 p-2">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('nextShift')}</p>
              <p className="font-semibold">
                {nextShift
                  ? `${format(parseISO(nextShift.date), 'dd MMM')} — ${shiftTypeLabel(nextShift.shift_type)}`
                  : t('noUpcomingShift')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-green-100 dark:bg-green-900/40 p-2">
              <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('daysOff')}</p>
              <p className="font-semibold">{t('daysOffCount', { count: daysOff })}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-purple-100 dark:bg-purple-900/40 p-2">
              <Timer className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('weeklyHours')}</p>
              <p className="font-semibold">{totalHours.toFixed(1)}h</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="schedule">{t('tabSchedule')}</TabsTrigger>
          <TabsTrigger value="tasks">{t('tabTasks')}</TabsTrigger>
          <TabsTrigger value="hours">{t('tabHours')}</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="mt-4">
          <MyWeekSchedule
            employeeName={employeeName}
            shifts={shifts}
            loading={loading}
            weekStart={weekStart}
            onWeekChange={setWeekStart}
          />
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <MyWeekTasks employeeId={employeeId} weekStart={weekStart} onWeekChange={setWeekStart} />
        </TabsContent>

        <TabsContent value="hours" className="mt-4">
          <MyHoursSummary employeeId={employeeId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
