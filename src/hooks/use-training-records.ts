'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrainingRecord } from '@/types'

export function useTrainingRecords(guideCode?: string) {
  const [records, setRecords] = useState<TrainingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (guideCode) params.append('guide_code', guideCode)

      const res = await fetch(`/api/staff/training/records?${params}`)
      if (!res.ok) throw new Error('Failed to fetch training records')
      const data = await res.json()
      setRecords(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [guideCode])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('training_records_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'training_records',
        },
        () => fetchRecords()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchRecords])

  const recordView = useCallback(async (code: string, language?: string) => {
    try {
      await fetch('/api/staff/training/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guide_code: code, action: 'viewed', language }),
      })
    } catch {
      // Silent fail for view tracking
    }
  }, [])

  const recordDownload = useCallback(async (code: string, language?: string) => {
    try {
      await fetch('/api/staff/training/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guide_code: code, action: 'downloaded', language }),
      })
    } catch {
      // Silent fail for download tracking
    }
  }, [])

  return { records, loading, error, refetch: fetchRecords, recordView, recordDownload }
}
