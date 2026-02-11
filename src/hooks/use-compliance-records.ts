'use client'

import { useEffect, useState, useCallback } from 'react'
import { ComplianceRecordWithDetails, ComplianceFichaCategory, ComplianceRecordStatus } from '@/types'

interface ComplianceFilters {
  type_code?: string
  category?: ComplianceFichaCategory
  status?: ComplianceRecordStatus
  recorded_by?: string
  date_from?: string
  date_to?: string
}

export function useComplianceRecords(filters?: ComplianceFilters) {
  const [records, setRecords] = useState<ComplianceRecordWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (filters?.type_code) params.append('type_code', filters.type_code)
      if (filters?.category) params.append('category', filters.category)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.recorded_by) params.append('recorded_by', filters.recorded_by)
      if (filters?.date_from) params.append('date_from', filters.date_from)
      if (filters?.date_to) params.append('date_to', filters.date_to)

      const response = await fetch(`/api/staff/compliance?${params}`)
      if (!response.ok) throw new Error('Failed to fetch compliance records')

      const data = await response.json()
      setRecords(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [filters?.type_code, filters?.category, filters?.status, filters?.recorded_by, filters?.date_from, filters?.date_to])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  return { records, loading, error, refetch: fetchRecords }
}
