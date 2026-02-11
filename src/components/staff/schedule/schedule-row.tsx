'use client'

import { ScheduleCellType, ScheduleGridRow } from '@/types'
import { ScheduleCell } from './schedule-cell'
import { TableCell, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { isSameDay, parseISO } from 'date-fns'

interface ScheduleRowProps {
  row: ScheduleGridRow
  weekDates: string[]
  onSetType: (employeeId: string, date: string, type: ScheduleCellType) => void
  onOpenShiftForm?: (employeeId: string, date: string) => void
}

export function ScheduleRow({ row, weekDates, onSetType, onOpenShiftForm }: ScheduleRowProps) {
  const today = new Date()

  return (
    <TableRow className="hover:bg-transparent">
      {/* Employee name column */}
      <TableCell className="sticky left-0 z-10 bg-background min-w-[180px] border-r">
        <div className="flex flex-col">
          <span className="font-medium text-sm truncate">
            {row.employee.profile.full_name || row.employee.profile.email}
          </span>
          <span className="text-xs text-muted-foreground">
            {row.employee.hourly_rate ? `${row.employee.hourly_rate}/h` : ''}
          </span>
        </div>
      </TableCell>

      {/* Day cells */}
      {weekDates.map((date) => {
        const cell = row.cells[date]
        const isToday = isSameDay(parseISO(date), today)

        return (
          <TableCell
            key={date}
            className={cn(
              'p-1 min-w-[80px]',
              isToday && 'bg-primary/5/50 dark:bg-primary/5'
            )}
          >
            {cell && (
              <ScheduleCell
                cell={cell}
                employeeId={row.employee.id}
                onSetType={onSetType}
                isToday={isToday}
                onOpenShiftForm={onOpenShiftForm}
              />
            )}
          </TableCell>
        )
      })}

      {/* Total column */}
      <TableCell className="text-right font-medium border-l min-w-[70px]">
        <div className="flex flex-col items-end">
          <span className={cn(
            'text-sm',
            row.totalHours > 40 && 'text-red-600 font-bold',
            row.totalHours > 35 && row.totalHours <= 40 && 'text-primary'
          )}>
            {row.totalHours.toFixed(1)}h
          </span>
          <span className="text-xs text-muted-foreground">
            {row.totalCost.toFixed(0)}
          </span>
        </div>
      </TableCell>
    </TableRow>
  )
}
