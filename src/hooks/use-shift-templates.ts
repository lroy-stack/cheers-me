'use client'

import { useEffect, useState } from 'react'
import { ShiftTemplate } from '@/types'

export function useShiftTemplates() {
  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/staff/templates')

      if (!response.ok) {
        throw new Error('Failed to fetch templates')
      }

      const data = await response.json()
      setTemplates(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return {
    templates,
    loading,
    error,
    refetch: fetchTemplates,
  }
}
