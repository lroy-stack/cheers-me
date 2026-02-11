'use client'

import { useEffect, useState, useCallback } from 'react'
import { ComplianceFichaType, ComplianceFichaCategory } from '@/types'

export function useComplianceTypes(category?: ComplianceFichaCategory) {
  const [types, setTypes] = useState<ComplianceFichaType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTypes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (category) params.append('category', category)

      const response = await fetch(`/api/staff/compliance/types?${params}`)
      if (!response.ok) throw new Error('Failed to fetch compliance types')

      const data = await response.json()
      setTypes(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [category])

  useEffect(() => {
    fetchTypes()
  }, [fetchTypes])

  return { types, loading, error, refetch: fetchTypes }
}
