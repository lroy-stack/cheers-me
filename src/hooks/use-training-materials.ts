'use client'

import { useEffect, useState, useCallback } from 'react'
import { TrainingMaterial } from '@/types'

export function useTrainingMaterials() {
  const [materials, setMaterials] = useState<TrainingMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMaterials = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/staff/training/materials')
      if (!res.ok) throw new Error('Failed to fetch training materials')
      const data = await res.json()
      setMaterials(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMaterials()
  }, [fetchMaterials])

  return { materials, loading, error, refetch: fetchMaterials }
}
