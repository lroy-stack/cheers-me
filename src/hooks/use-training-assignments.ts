'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrainingAssignment } from '@/types'

interface AssignmentFilters {
  status?: string
  employee_id?: string
  guide_code?: string
}

export function useTrainingAssignments(filters?: AssignmentFilters) {
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.employee_id) params.append('employee_id', filters.employee_id)
      if (filters?.guide_code) params.append('guide_code', filters.guide_code)

      const res = await fetch(`/api/staff/training/assignments?${params}`)
      if (!res.ok) throw new Error('Failed to fetch training assignments')
      const data = await res.json()
      setAssignments(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [filters?.status, filters?.employee_id, filters?.guide_code])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('training_assignments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'training_assignments',
        },
        () => fetchAssignments()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchAssignments])

  const createAssignment = useCallback(async (data: {
    guide_code: string
    assigned_to?: string | null
    assigned_role?: string | null
    due_date?: string | null
  }) => {
    const res = await fetch('/api/staff/training/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to create assignment')
    }
    await fetchAssignments()
    return res.json()
  }, [fetchAssignments])

  return { assignments, loading, error, refetch: fetchAssignments, createAssignment }
}
