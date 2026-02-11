'use client'

import { useState } from 'react'
import { StaffTaskWithDetails } from '@/types'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'
import { useTranslations } from 'next-intl'

interface TaskDetailProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: StaffTaskWithDetails | null
  onSuccess?: () => void
  canManage: boolean
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

export function TaskDetail({
  open,
  onOpenChange,
  task,
  onSuccess,
  canManage,
}: TaskDetailProps) {
  const { toast } = useToast()
  const t = useTranslations('staff')
  const [loading, setLoading] = useState(false)
  const [togglingItem, setTogglingItem] = useState<string | null>(null)

  if (!task) return null

  const completedItems = task.items?.filter((item) => item.completed).length || 0
  const totalItems = task.items?.length || 0

  const isOverdue =
    task.due_date &&
    task.status !== 'completed' &&
    task.status !== 'cancelled' &&
    isPast(new Date(task.due_date + 'T23:59:59'))

  const isDueToday = task.due_date && isToday(new Date(task.due_date))

  const handleToggleItem = async (itemId: string, completed: boolean) => {
    setTogglingItem(itemId)
    try {
      const res = await fetch(`/api/staff/tasks/${task.id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update item')
      }

      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setTogglingItem(null)
    }
  }

  const handleStatusChange = async (newStatus: 'completed' | 'pending' | 'in_progress') => {
    setLoading(true)
    try {
      const res = await fetch(`/api/staff/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update task')
      }

      toast({
        title: t('tasks.taskUpdated'),
        description:
          newStatus === 'completed'
            ? t('tasks.taskMarkedComplete')
            : t('tasks.taskReopened'),
      })

      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(t('tasks.deleteConfirm'))) return

    setLoading(true)
    try {
      const res = await fetch(`/api/staff/tasks/${task.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete task')
      }

      toast({
        title: t('tasks.taskDeleted'),
        description: t('tasks.taskDeletedDesc'),
      })

      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-left">{task.title}</SheetTitle>
          <SheetDescription className="text-left">
            {task.description || t('tasks.noDescription')}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status & Priority badges */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="secondary"
              className={statusColors[task.status]}
            >
              {t(`tasks.status${task.status === 'in_progress' ? 'InProgress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}`)}
            </Badge>
            <Badge
              variant="secondary"
              className={priorityColors[task.priority]}
            >
              {t(`tasks.priority${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}`)}
            </Badge>
            {isOverdue && (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {t('tasks.overdue')}
              </Badge>
            )}
          </div>

          {/* Info section */}
          <div className="space-y-3">
            {/* Assigned to */}
            {task.assigned_employee?.profile && (
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t('tasks.assignedTo')}:</span>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px]">
                      {getInitials(task.assigned_employee.profile.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">
                    {task.assigned_employee.profile.full_name}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {task.assigned_employee.profile.role}
                  </Badge>
                </div>
              </div>
            )}

            {/* Assigned role */}
            {!task.assigned_employee && task.assigned_role && (
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t('tasks.assignedToRole')}:</span>
                <Badge variant="outline">{task.assigned_role}</Badge>
              </div>
            )}

            {/* Assigned by */}
            {task.assigner && (
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t('tasks.assignedBy')}:</span>
                <span>{task.assigner.full_name}</span>
              </div>
            )}

            {/* Due date */}
            {task.due_date && (
              <div className={`flex items-center gap-3 text-sm ${isOverdue ? 'text-red-500' : isDueToday ? 'text-orange-500' : ''}`}>
                <Calendar className="h-4 w-4" />
                <span className="text-muted-foreground">{t('tasks.dueDate')}:</span>
                <span className="font-medium">
                  {format(new Date(task.due_date), 'MMM d, yyyy')}
                </span>
                {task.due_time && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {task.due_time}
                  </span>
                )}
              </div>
            )}

            {/* Completed info */}
            {task.completed_at && (
              <div className="flex items-center gap-3 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>{t('tasks.completedOn')}:</span>
                <span>{format(new Date(task.completed_at), 'MMM d, yyyy HH:mm')}</span>
              </div>
            )}

            {/* Created */}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{t('tasks.created')}:</span>
              <span>{format(new Date(task.created_at), 'MMM d, yyyy HH:mm')}</span>
            </div>
          </div>

          {/* Notes */}
          {task.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium">{t('tasks.notes')}</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {task.notes}
                </p>
              </div>
            </>
          )}

          {/* Checklist */}
          {totalItems > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">{t('tasks.checklist')}</h4>
                  <span className="text-xs text-muted-foreground">
                    {completedItems}/{totalItems} {t('tasks.completed')}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${totalItems > 0 ? (completedItems / totalItems) * 100 : 0}%`,
                    }}
                  />
                </div>

                {/* Items */}
                <div className="space-y-2">
                  {task.items?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 py-1.5"
                    >
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={() =>
                          handleToggleItem(item.id, item.completed)
                        }
                        disabled={
                          togglingItem === item.id ||
                          task.status === 'cancelled'
                        }
                        className="mt-0.5"
                      />
                      <span
                        className={`text-sm flex-1 ${
                          item.completed
                            ? 'line-through text-muted-foreground'
                            : ''
                        }`}
                      >
                        {item.text}
                      </span>
                      {togglingItem === item.id && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <Separator />
          <div className="flex flex-wrap gap-2">
            {task.status !== 'completed' && task.status !== 'cancelled' && (
              <Button
                onClick={() => handleStatusChange('completed')}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                {t('tasks.markComplete')}
              </Button>
            )}

            {task.status === 'pending' && (
              <Button
                variant="outline"
                onClick={() => handleStatusChange('in_progress')}
                disabled={loading}
              >
                {t('tasks.startTask')}
              </Button>
            )}

            {(task.status === 'completed' || task.status === 'cancelled') && (
              <Button
                variant="outline"
                onClick={() => handleStatusChange('pending')}
                disabled={loading}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {t('tasks.reopen')}
              </Button>
            )}

            {canManage && (
              <Button
                variant="ghost"
                onClick={handleDelete}
                disabled={loading}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('tasks.delete')}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
