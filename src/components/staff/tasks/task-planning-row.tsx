'use client'

import { TaskGridRow, PlannedTask, StaffTaskTemplate } from '@/types'
import { TaskPlanningCell } from './task-planning-cell'
import { TableCell, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { isSameDay, parseISO } from 'date-fns'

interface TaskPlanningRowProps {
  row: TaskGridRow
  weekDates: string[]
  templates: StaffTaskTemplate[]
  onAddFromTemplate: (employeeId: string, dayOfWeek: number, templateId: string) => void
  onOpenCustomTask: (employeeId: string, dayOfWeek: number) => void
  onEditTask: (task: PlannedTask) => void
  onRemoveTask: (taskId: string) => void
}

export function TaskPlanningRow({
  row,
  weekDates,
  templates,
  onAddFromTemplate,
  onOpenCustomTask,
  onEditTask,
  onRemoveTask,
}: TaskPlanningRowProps) {
  const today = new Date()
  const employeeName = row.employee.profile.full_name || row.employee.profile.email

  return (
    <TableRow className="hover:bg-transparent">
      {/* Employee name column */}
      <TableCell className="sticky left-0 z-10 bg-background min-w-[180px] border-r">
        <div className="flex flex-col">
          <span className="font-medium text-sm truncate">{employeeName}</span>
          <span className="text-xs text-muted-foreground capitalize">
            {row.employee.profile?.role || ''}
          </span>
        </div>
      </TableCell>

      {/* Day cells */}
      {weekDates.map((date, i) => {
        const cell = row.cells[date]
        const isToday = isSameDay(parseISO(date), today)

        return (
          <TableCell
            key={date}
            className={cn(
              'p-1 min-w-[80px]',
              isToday && 'bg-primary/5 dark:bg-primary/5'
            )}
          >
            {cell && (
              <TaskPlanningCell
                cell={cell}
                employeeId={row.employee.id}
                employeeName={employeeName}
                dayOfWeek={i}
                isToday={isToday}
                templates={templates}
                onAddFromTemplate={onAddFromTemplate}
                onOpenCustomTask={onOpenCustomTask}
                onEditTask={onEditTask}
                onRemoveTask={onRemoveTask}
              />
            )}
          </TableCell>
        )
      })}

      {/* Total column */}
      <TableCell className="text-right font-medium border-l min-w-[70px]">
        <div className="flex flex-col items-end">
          <span className="text-sm font-bold">{row.totalTasks}</span>
          {row.totalMinutes > 0 && (
            <span className="text-xs text-muted-foreground">
              {row.totalMinutes}m
            </span>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}
