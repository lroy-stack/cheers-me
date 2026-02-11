'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GripVertical, Pencil, Trash2, Clock, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlannedTask } from '@/types'

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-100 border-red-300 dark:bg-red-950/30 dark:border-red-800',
  high: 'bg-orange-100 border-orange-300 dark:bg-orange-950/30 dark:border-orange-800',
  medium: 'bg-blue-100 border-blue-300 dark:bg-blue-950/30 dark:border-blue-800',
  low: 'bg-green-100 border-green-300 dark:bg-green-950/30 dark:border-green-800',
}

const priorityBadgeColors: Record<string, string> = {
  urgent: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-blue-500 text-white',
  low: 'bg-green-500 text-white',
}

interface TaskPlanCardProps {
  task: PlannedTask
  onEdit?: (task: PlannedTask) => void
  onRemove?: (taskId: string) => void
  isDragging?: boolean
  dragHandleProps?: Record<string, unknown>
}

export function TaskPlanCard({
  task,
  onEdit,
  onRemove,
  isDragging,
  dragHandleProps,
}: TaskPlanCardProps) {
  return (
    <div
      className={cn(
        'group rounded-md border p-2 text-xs transition-all',
        priorityColors[task.priority] || priorityColors.medium,
        isDragging && 'opacity-50 shadow-lg scale-95',
        task.status === 'completed' && 'opacity-60 line-through',
      )}
    >
      <div className="flex items-start gap-1">
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          className="mt-0.5 cursor-grab text-muted-foreground/50 hover:text-muted-foreground"
        >
          <GripVertical className="h-3 w-3" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{task.title}</div>

          <div className="flex flex-wrap items-center gap-1 mt-1">
            <Badge className={cn('text-[9px] px-1 py-0 h-4', priorityBadgeColors[task.priority])}>
              {task.priority[0].toUpperCase()}
            </Badge>

            {task.shift_type && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                {task.shift_type[0].toUpperCase()}
              </Badge>
            )}

            {task.estimated_minutes && (
              <span className="flex items-center gap-0.5 text-muted-foreground">
                <Clock className="h-2.5 w-2.5" />
                {task.estimated_minutes}m
              </span>
            )}

            {(task.assigned_employee || task.assigned_role) && (
              <span className="flex items-center gap-0.5 text-muted-foreground">
                <User className="h-2.5 w-2.5" />
                {task.assigned_employee?.profile?.full_name || task.assigned_role || ''}
              </span>
            )}

            {task.section?.name && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                {task.section.name}
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={(e) => { e.stopPropagation(); onEdit(task) }}
            >
              <Pencil className="h-2.5 w-2.5" />
            </Button>
          )}
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-destructive hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); onRemove(task.id) }}
            >
              <Trash2 className="h-2.5 w-2.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
