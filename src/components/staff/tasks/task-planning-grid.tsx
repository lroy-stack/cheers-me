'use client'

import { TaskDepartmentGroup, PlannedTask, StaffTaskTemplate } from '@/types'
import { TaskPlanningDepartment } from './task-planning-department'
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

interface TaskPlanningGridProps {
  departmentGroups: TaskDepartmentGroup[]
  weekDates: string[]
  dailyTotals: Record<string, { taskCount: number; minutes: number }>
  grandTotal: { tasks: number; minutes: number; employees: number }
  templates: StaffTaskTemplate[]
  onAddFromTemplate: (employeeId: string, dayOfWeek: number, templateId: string) => void
  onOpenCustomTask: (employeeId: string, dayOfWeek: number) => void
  onEditTask: (task: PlannedTask) => void
  onRemoveTask: (taskId: string) => void
}

export function TaskPlanningGrid({
  departmentGroups,
  weekDates,
  dailyTotals,
  grandTotal,
  templates,
  onAddFromTemplate,
  onOpenCustomTask,
  onEditTask,
  onRemoveTask,
}: TaskPlanningGridProps) {
  const today = new Date()
  const t = useTranslations('staff')

  const dayLabels = [
    t('taskPlanning.dayMon'), t('taskPlanning.dayTue'), t('taskPlanning.dayWed'),
    t('taskPlanning.dayThu'), t('taskPlanning.dayFri'), t('taskPlanning.daySat'), t('taskPlanning.daySun'),
  ]

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="sticky left-0 z-20 bg-muted/30 min-w-[180px] border-r font-bold">
                {t('taskPlanning.employeeColumn')}
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
                      isToday && 'bg-primary/10 dark:bg-primary/10',
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
                        <span className="text-[9px] text-primary font-semibold">{t('taskPlanning.todayLabel')}</span>
                      )}
                    </div>
                  </TableHead>
                )
              })}
              <TableHead className="text-right border-l min-w-[70px] font-bold">
                {t('taskPlanning.totalColumn')}
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {departmentGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={weekDates.length + 2} className="text-center py-12 text-muted-foreground">
                  {t('taskPlanning.noEmployeesMessage')}
                </TableCell>
              </TableRow>
            ) : (
              departmentGroups.map((group) => (
                <TaskPlanningDepartment
                  key={group.role}
                  group={group}
                  weekDates={weekDates}
                  templates={templates}
                  onAddFromTemplate={onAddFromTemplate}
                  onOpenCustomTask={onOpenCustomTask}
                  onEditTask={onEditTask}
                  onRemoveTask={onRemoveTask}
                />
              ))
            )}
          </TableBody>

          <TableFooter>
            <TableRow className="bg-muted font-bold">
              <TableCell className="sticky left-0 z-10 bg-muted border-r">
                {t('taskPlanning.totalsRow')}
              </TableCell>
              {weekDates.map((date) => {
                const totals = dailyTotals[date] || { taskCount: 0, minutes: 0 }
                return (
                  <TableCell key={date} className="text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-sm">{totals.taskCount}</span>
                      {totals.minutes > 0 && (
                        <span className="text-xs text-muted-foreground">{totals.minutes}m</span>
                      )}
                    </div>
                  </TableCell>
                )
              })}
              <TableCell className="text-right border-l">
                <div className="flex flex-col items-end">
                  <span className="text-sm">{grandTotal.tasks} {t('taskPlanning.tasksLabel')}</span>
                  <span className="text-xs text-muted-foreground">
                    {grandTotal.employees} {t('taskPlanning.employeesAssigned').toLowerCase()}
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
