'use client'

import { TaskStatus, TaskPriority, EmployeeWithProfile } from '@/types'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface TaskFiltersState {
  status?: TaskStatus
  priority?: TaskPriority
  assigned_to?: string
  due_date?: string
  role?: string
}

interface TaskFiltersProps {
  filters: TaskFiltersState
  onFiltersChange: (filters: TaskFiltersState) => void
  employees: EmployeeWithProfile[]
}

export function TaskFilters({ filters, onFiltersChange, employees }: TaskFiltersProps) {
  const t = useTranslations('staff')

  const hasFilters = Object.values(filters).some((v) => v !== undefined && v !== '')

  const handleClear = () => {
    onFiltersChange({})
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Status filter */}
      <Select
        value={filters.status || 'all'}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            status: value === 'all' ? undefined : (value as TaskStatus),
          })
        }
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder={t('tasks.filterStatus')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('tasks.allStatuses')}</SelectItem>
          <SelectItem value="pending">{t('tasks.statusPending')}</SelectItem>
          <SelectItem value="in_progress">{t('tasks.statusInProgress')}</SelectItem>
          <SelectItem value="completed">{t('tasks.statusCompleted')}</SelectItem>
          <SelectItem value="cancelled">{t('tasks.statusCancelled')}</SelectItem>
        </SelectContent>
      </Select>

      {/* Priority filter */}
      <Select
        value={filters.priority || 'all'}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            priority: value === 'all' ? undefined : (value as TaskPriority),
          })
        }
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder={t('tasks.filterPriority')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('tasks.allPriorities')}</SelectItem>
          <SelectItem value="low">{t('tasks.priorityLow')}</SelectItem>
          <SelectItem value="medium">{t('tasks.priorityMedium')}</SelectItem>
          <SelectItem value="high">{t('tasks.priorityHigh')}</SelectItem>
          <SelectItem value="urgent">{t('tasks.priorityUrgent')}</SelectItem>
        </SelectContent>
      </Select>

      {/* Employee filter */}
      <Select
        value={filters.assigned_to || 'all'}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            assigned_to: value === 'all' ? undefined : value,
          })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={t('tasks.filterEmployee')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('tasks.allEmployees')}</SelectItem>
          {employees.map((emp) => (
            <SelectItem key={emp.id} value={emp.id}>
              {emp.profile.full_name || emp.profile.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Due date filter */}
      <Input
        type="date"
        value={filters.due_date || ''}
        onChange={(e) =>
          onFiltersChange({
            ...filters,
            due_date: e.target.value || undefined,
          })
        }
        className="w-[160px]"
        placeholder={t('tasks.filterDueDate')}
      />

      {/* Clear filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="text-muted-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          {t('tasks.clearFilters')}
        </Button>
      )}
    </div>
  )
}
