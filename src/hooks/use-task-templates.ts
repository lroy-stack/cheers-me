'use client'

import { useEffect, useState } from 'react'
import { StaffTaskTemplate } from '@/types'

export function useTaskTemplates() {
  const [templates, setTemplates] = useState<StaffTaskTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchTemplates() {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/staff/tasks/templates')
      if (!response.ok) throw new Error('Failed to fetch templates')
      const data = await response.json()
      setTemplates(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  return { templates, loading, error, refetch: fetchTemplates }
}
