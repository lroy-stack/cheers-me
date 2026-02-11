'use client'

import useSWR from 'swr'
import type { Advertisement } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error('Failed to fetch')
  return r.json()
})

export function useAds(filters?: { status?: string; template?: string; placement?: string }) {
  const params = new URLSearchParams()
  if (filters?.status) params.set('status', filters.status)
  if (filters?.template) params.set('template', filters.template)
  if (filters?.placement) params.set('placement', filters.placement)

  const queryStr = params.toString()
  const { data, error, mutate, isLoading } = useSWR<Advertisement[]>(
    `/api/ads${queryStr ? `?${queryStr}` : ''}`,
    fetcher
  )

  return {
    ads: data || [],
    loading: isLoading,
    error: error?.message || null,
    refetch: mutate,
  }
}

export function useAd(id: string | null) {
  const { data, error, mutate, isLoading } = useSWR<Advertisement>(
    id ? `/api/ads/${id}` : null,
    fetcher
  )

  return {
    ad: data || null,
    loading: isLoading,
    error: error?.message || null,
    refetch: mutate,
  }
}

export function useActiveAds(page: 'digital_menu' | 'booking') {
  const { data, error, isLoading } = useSWR<Advertisement[]>(
    `/api/public/ads/active?page=${page}`,
    fetcher,
    { refreshInterval: 60000 } // Refresh every minute
  )

  return {
    ads: data || [],
    loading: isLoading,
    error: error?.message || null,
  }
}
