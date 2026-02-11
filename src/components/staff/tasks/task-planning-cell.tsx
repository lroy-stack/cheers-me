'use client'

import { TaskGridCell, PlannedTask, StaffTaskTemplate } from '@/types'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil, X, Plus } from 'lucide-react'

const PRIORITY_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  urgent: { bg: 'bg-red-100 dark:bg-red-950/40', text: 'text-red-800 dark:text-red-300', border: 'border-l-red-500', dot: 'bg-red-500' },
  high: { bg: 'bg-orange-100 dark:bg-orange-950/40', text: 'text-orange-800 dark:text-orange-300', border: 'border-l-orange-500', dot: 'bg-orange-500' },
  medium: { bg: 'bg-blue-100 dark:bg-blue-950/40', text: 'text-blue-800 dark:text-blue-300', border: 'border-l-blue-500', dot: 'bg-blue-500' },
  low: { bg: 'bg-green-100 dark:bg-green-950/40', text: 'text-green-800 dark:text-green-300', border: 'border-l-green-500', dot: 'bg-green-500' },
}

interface TaskPlanningCellProps {
  cell: TaskGridCell
  employeeId: string
  employeeName: string
  dayOfWeek: number
  isToday?: boolean
  templates: StaffTaskTemplate[]
  onAddFromTemplate: (employeeId: string, dayOfWeek: number, templateId: string) => void
  onOpenCustomTask: (employeeId: string, dayOfWeek: number) => void
  onEditTask: (task: PlannedTask) => void
  onRemoveTask: (taskId: string) => void
}

export function TaskPlanningCell({
  cell,
  employeeId,
  employeeName,
  dayOfWeek,
  isToday,
  templates,
  onAddFromTemplate,
  onOpenCustomTask,
  onEditTask,
  onRemoveTask,
}: TaskPlanningCellProps) {
  const [open, setOpen] = useState(false)
  const t = useTranslations('staff')

  const style = cell.highestPriority ? PRIORITY_STYLES[cell.highestPriority] : null
  const topTemplates = templates.slice(0, 5)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'w-full h-12 rounded-md border text-center text-sm font-bold transition-all',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
            'hover:shadow-sm cursor-pointer',
            isToday && 'ring-2 ring-primary ring-offset-1',
            style
              ? cn(style.bg, style.text, 'border-l-4', style.border)
              : 'border-dashed border-muted-foreground/30 hover:border-muted-foreground/60 hover:bg-muted/50'
          )}
        >
          {cell.taskCount > 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-base leading-none">{cell.taskCount}</span>
              {cell.totalMinutes > 0 && (
                <span className="text-[10px] opacity-70 leading-none mt-0.5">
                  {cell.totalMinutes}{t('taskPlanning.minutesLabel')}
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground/40 text-lg">+</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 sm:w-72 p-3" align="center">
        <div className="space-y-3">
          {/* Header */}
          <div className="text-xs font-medium text-muted-foreground">
            {t('taskPlanning.tasksForEmployee', {
              name: employeeName,
              date: cell.date,
            })}
          </div>

          {/* Existing tasks */}
          {cell.tasks.length > 0 && (
            <div className="space-y-1.5">
              {cell.tasks.map((task) => {
                const ps = PRIORITY_STYLES[task.priority || 'medium']
                return (
                  <div
                    key={task.id}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs border-l-4',
                      ps.border, ps.bg
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full flex-shrink-0', ps.dot)} />
                    <span className="flex-1 truncate font-medium">{task.title}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditTask(task)
                        setOpen(false)
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveTask(task.id)
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Quick add from templates */}
          {topTemplates.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {t('taskPlanning.quickAddTemplate')}
              </div>
              <div className="flex flex-wrap gap-1">
                {topTemplates.map((tmpl) => (
                  <Button
                    key={tmpl.id}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => {
                      onAddFromTemplate(employeeId, dayOfWeek, tmpl.id)
                    }}
                  >
                    {tmpl.title}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Custom task button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              onOpenCustomTask(employeeId, dayOfWeek)
              setOpen(false)
            }}
          >
            <Plus className="mr-1 h-3 w-3" />
            {t('taskPlanning.customTask')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
