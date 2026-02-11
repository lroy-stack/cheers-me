'use client'

import { TaskDepartmentGroup, PlannedTask, StaffTaskTemplate } from '@/types'
import { TaskPlanningRow } from './task-planning-row'
import { TableCell, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from 'next-intl'

interface TaskPlanningDepartmentProps {
  group: TaskDepartmentGroup
  weekDates: string[]
  templates: StaffTaskTemplate[]
  onAddFromTemplate: (employeeId: string, dayOfWeek: number, templateId: string) => void
  onOpenCustomTask: (employeeId: string, dayOfWeek: number) => void
  onEditTask: (task: PlannedTask) => void
  onRemoveTask: (taskId: string) => void
}

export function TaskPlanningDepartment({
  group,
  weekDates,
  templates,
  onAddFromTemplate,
  onOpenCustomTask,
  onEditTask,
  onRemoveTask,
}: TaskPlanningDepartmentProps) {
  const t = useTranslations('staff')

  return (
    <>
      {/* Department header row */}
      <TableRow className="bg-muted/70 hover:bg-muted/70">
        <TableCell
          colSpan={weekDates.length + 2}
          className="sticky left-0 z-10 py-2"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs tracking-wider uppercase">
              {t.has(`employees.departments.${group.role}`)
                ? t(`employees.departments.${group.role}`)
                : group.label}
            </span>
            <Badge variant="secondary" className="text-xs">
              {group.employees.length}
            </Badge>
            <span className="ml-auto text-xs text-muted-foreground">
              {group.totalTasks} {t('taskPlanning.tasksLabel')}
              {group.totalMinutes > 0 && ` · ${group.totalMinutes}${t('taskPlanning.minutesLabel')}`}
            </span>
          </div>
        </TableCell>
      </TableRow>

      {/* Employee rows */}
      {group.employees.map((row) => (
        <TaskPlanningRow
          key={row.employee.id}
          row={row}
          weekDates={weekDates}
          templates={templates}
          onAddFromTemplate={onAddFromTemplate}
          onOpenCustomTask={onOpenCustomTask}
          onEditTask={onEditTask}
          onRemoveTask={onRemoveTask}
        />
      ))}
    </>
  )
}
