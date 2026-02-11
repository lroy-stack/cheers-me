'use client'

import { useEffect, useState, useCallback } from 'react'
import { StaffTaskWithDetails, TaskStatus, TaskPriority } from '@/types'

interface TaskFilters {
  status?: TaskStatus
  priority?: TaskPriority
  assigned_to?: string
  due_date?: string
  role?: string
}

export function useTasks(filters?: TaskFilters) {
  const [tasks, setTasks] = useState<StaffTaskWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.priority) params.append('priority', filters.priority)
      if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to)
      if (filters?.due_date) params.append('due_date', filters.due_date)
      if (filters?.role) params.append('role', filters.role)

      const response = await fetch(`/api/staff/tasks?${params}`)
      if (!response.ok) throw new Error('Failed to fetch tasks')

      const data = await response.json()
      setTasks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [filters?.status, filters?.priority, filters?.assigned_to, filters?.due_date, filters?.role])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return { tasks, loading, error, refetch: fetchTasks }
}
