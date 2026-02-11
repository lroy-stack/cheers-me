'use client'

import { useEffect, useState, useCallback } from 'react'
import { TrainingComplianceStats, EmployeeTrainingStatus } from '@/types'

export function useTrainingCompliance() {
  const [stats, setStats] = useState<TrainingComplianceStats | null>(null)
  const [employeeStatuses, setEmployeeStatuses] = useState<EmployeeTrainingStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCompliance = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/staff/training/compliance')
      if (!res.ok) throw new Error('Failed to fetch compliance data')
      const data = await res.json()
      setStats(data.stats)
      setEmployeeStatuses(data.employeeStatuses)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCompliance()
  }, [fetchCompliance])

  return { stats, employeeStatuses, loading, error, refetch: fetchCompliance }
}
