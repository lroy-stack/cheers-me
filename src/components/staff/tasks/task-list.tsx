'use client'

import { StaffTaskWithDetails } from '@/types'
import { TaskCard } from './task-card'
import { Skeleton } from '@/components/ui/skeleton'
import { ClipboardList } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface TaskListProps {
  tasks: StaffTaskWithDetails[]
  loading: boolean
  onTaskClick: (task: StaffTaskWithDetails) => void
}

export function TaskList({ tasks, loading, onTaskClick }: TaskListProps) {
  const t = useTranslations('staff')

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">
          {t('tasks.noTasks')}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t('tasks.noTasksDesc')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} onClick={onTaskClick} />
      ))}
    </div>
  )
}
