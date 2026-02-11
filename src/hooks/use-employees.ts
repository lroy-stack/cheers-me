'use client'

import { useEffect, useState } from 'react'
import { EmployeeWithProfile } from '@/types'

export function useEmployees(activeOnly = true) {
  const [employees, setEmployees] = useState<EmployeeWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchEmployees()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOnly])

  async function fetchEmployees() {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (activeOnly) {
        params.append('active', 'true')
      }

      const response = await fetch(`/api/staff/employees?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch employees')
      }

      const data = await response.json()
      // Filter out employees with null profile (orphaned records)
      setEmployees((data as EmployeeWithProfile[]).filter(emp => emp.profile != null))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return {
    employees,
    loading,
    error,
    refetch: fetchEmployees,
  }
}
