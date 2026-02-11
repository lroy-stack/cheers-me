'use client'

import { StaffTaskWithDetails } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Calendar,
  Clock,
  CheckSquare,
  AlertTriangle,
  User,
} from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'
import { useTranslations } from 'next-intl'

interface TaskCardProps {
  task: StaffTaskWithDetails
  onClick: (task: StaffTaskWithDetails) => void
}

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-foreground dark:bg-muted dark:text-muted-foreground',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  cancelled: 'bg-muted text-foreground dark:bg-muted dark:text-muted-foreground',
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '??'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const t = useTranslations('staff')

  const completedItems = task.items?.filter((item) => item.completed).length || 0
  const totalItems = task.items?.length || 0

  const isOverdue =
    task.due_date &&
    task.status !== 'completed' &&
    task.status !== 'cancelled' &&
    isPast(new Date(task.due_date + 'T23:59:59'))

  const isDueToday = task.due_date && isToday(new Date(task.due_date))

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-accent/50"
      onClick={() => onClick(task)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className="font-medium text-sm truncate">{task.title}</h3>

            {/* Description preview */}
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {/* Priority badge */}
              <Badge
                variant="secondary"
                className={`text-xs ${priorityColors[task.priority]}`}
              >
                {t(`tasks.priority${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}`)}
              </Badge>

              {/* Status badge */}
              <Badge
                variant="secondary"
                className={`text-xs ${statusColors[task.status]}`}
              >
                {t(`tasks.status${task.status === 'in_progress' ? 'InProgress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}`)}
              </Badge>

              {/* Overdue indicator */}
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {t('tasks.overdue')}
                </Badge>
              )}
            </div>

            {/* Bottom row: assigned, due date, checklist progress */}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
              {/* Assigned employee */}
              {task.assigned_employee?.profile && (
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[10px]">
                      {getInitials(task.assigned_employee.profile.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate max-w-[120px]">
                    {task.assigned_employee.profile.full_name}
                  </span>
                </div>
              )}

              {/* Assigned role (if no specific employee) */}
              {!task.assigned_employee && task.assigned_role && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{task.assigned_role}</span>
                </div>
              )}

              {/* Due date */}
              {task.due_date && (
                <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : isDueToday ? 'text-orange-500' : ''}`}>
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(task.due_date), 'MMM d')}</span>
                  {task.due_time && (
                    <>
                      <Clock className="h-3 w-3 ml-1" />
                      <span>{task.due_time}</span>
                    </>
                  )}
                </div>
              )}

              {/* Checklist progress */}
              {totalItems > 0 && (
                <div className="flex items-center gap-1">
                  <CheckSquare className="h-3 w-3" />
                  <span>
                    {completedItems}/{totalItems}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
