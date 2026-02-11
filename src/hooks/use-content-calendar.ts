'use client'

import { useEffect, useState, useCallback } from 'react'
import { ContentCalendarEntry, ContentFilters } from '@/types/marketing'
import { createClient } from '@/lib/supabase/client'

export function useContentCalendar(initialFilters?: ContentFilters) {
  const [entries, setEntries] = useState<ContentCalendarEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchEntries = useCallback(async (filters?: ContentFilters) => {
    try {
      setLoading(true)
      setError(null)

      // Build query with filters
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.platform) params.append('platform', filters.platform)
      if (filters?.language) params.append('language', filters.language)
      if (filters?.from) params.append('from', filters.from)
      if (filters?.to) params.append('to', filters.to)

      const response = await fetch(`/api/marketing/content-calendar?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch content calendar')
      }

      const data = await response.json()
      setEntries(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error fetching content calendar:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('content_calendar_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content_calendar',
        },
        (payload) => {
          console.log('Content calendar change:', payload)

          if (payload.eventType === 'INSERT') {
            setEntries((current) => [...current, payload.new as ContentCalendarEntry])
          } else if (payload.eventType === 'UPDATE') {
            setEntries((current) =>
              current.map((entry) =>
                entry.id === payload.new.id ? (payload.new as ContentCalendarEntry) : entry
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setEntries((current) =>
              current.filter((entry) => entry.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // Initial fetch
  useEffect(() => {
    fetchEntries(initialFilters)
  }, [fetchEntries, initialFilters])

  return {
    entries,
    loading,
    error,
    refetch: fetchEntries,
  }
}
