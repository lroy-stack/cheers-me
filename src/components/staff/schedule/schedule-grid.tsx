'use client'

import { DepartmentGroup as DepartmentGroupType, ScheduleCellType } from '@/types'
import { DepartmentGroup } from './department-group'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format, parseISO, isSameDay } from 'date-fns'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

interface ScheduleGridProps {
  departmentGroups: DepartmentGroupType[]
  weekDates: string[]
  dailyTotals: Record<string, { hours: number; count: number }>
  grandTotal: { hours: number; cost: number; employees: number }
  onSetType: (employeeId: string, date: string, type: ScheduleCellType) => void
  onOpenShiftForm?: (employeeId: string, date: string) => void
}

export function ScheduleGrid({
  departmentGroups,
  weekDates,
  dailyTotals,
  grandTotal,
  onSetType,
  onOpenShiftForm,
}: ScheduleGridProps) {
  const today = new Date()
  const t = useTranslations('staff')

  const dayLabels = [
    t('schedule.dayMon'), t('schedule.dayTue'), t('schedule.dayWed'),
    t('schedule.dayThu'), t('schedule.dayFri'), t('schedule.daySat'), t('schedule.daySun'),
  ]

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="sticky left-0 z-20 bg-muted/30 min-w-[180px] border-r font-bold">
                {t('schedule.employeeColumn')}
              </TableHead>
              {weekDates.map((date, i) => {
                const d = parseISO(date)
                const isToday = isSameDay(d, today)
                const isSunday = d.getDay() === 0
                const isSaturday = d.getDay() === 6

                return (
                  <TableHead
                    key={date}
                    className={cn(
                      'text-center min-w-[80px] px-1',
                      isToday && 'bg-primary/10/60 dark:bg-primary/10',
                      (isSaturday || isSunday) && 'bg-muted/50'
                    )}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-medium uppercase">
                        {dayLabels[i]}
                      </span>
                      <span className={cn(
                        'text-lg font-bold leading-tight',
                        isToday && 'text-primary'
                      )}>
                        {format(d, 'd')}
                      </span>
                      {isToday && (
                        <span className="text-[9px] text-primary font-semibold">{t('schedule.todayLabel')}</span>
                      )}
                    </div>
                  </TableHead>
                )
              })}
              <TableHead className="text-right border-l min-w-[70px] font-bold">
                {t('schedule.totalColumn')}
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {departmentGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={weekDates.length + 2} className="text-center py-12 text-muted-foreground">
                  {t('schedule.noEmployeesMessage')}
                </TableCell>
              </TableRow>
            ) : (
              departmentGroups.map((group) => (
                <DepartmentGroup
                  key={group.role}
                  group={group}
                  weekDates={weekDates}
                  onSetType={onSetType}
                  onOpenShiftForm={onOpenShiftForm}
                />
              ))
            )}
          </TableBody>

          <TableFooter>
            <TableRow className="bg-muted font-bold">
              <TableCell className="sticky left-0 z-10 bg-muted border-r">
                {t('schedule.totalsRow')}
              </TableCell>
              {weekDates.map((date) => {
                const totals = dailyTotals[date] || { hours: 0, count: 0 }
                return (
                  <TableCell key={date} className="text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-sm">{totals.hours.toFixed(1)}h</span>
                      <span className="text-xs text-muted-foreground">{totals.count} {t('schedule.shiftsLabel')}</span>
                    </div>
                  </TableCell>
                )
              })}
              <TableCell className="text-right border-l">
                <div className="flex flex-col items-end">
                  <span className="text-sm">{grandTotal.hours.toFixed(1)}h</span>
                  <span className="text-xs text-muted-foreground">
                    {grandTotal.employees} {t('schedule.staffLabel')}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  )
}
