'use client'

import useSWR from 'swr'
import type { GiftCoupon, GiftCouponWithRedemptions, CouponStats } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error('Failed to fetch')
  return r.json()
})

export function useCoupons(filters?: { status?: string; search?: string }) {
  const params = new URLSearchParams()
  if (filters?.status) params.set('status', filters.status)
  if (filters?.search) params.set('search', filters.search)

  const queryStr = params.toString()
  const { data, error, mutate, isLoading } = useSWR<GiftCoupon[]>(
    `/api/coupons${queryStr ? `?${queryStr}` : ''}`,
    fetcher
  )

  // Compute stats from data
  const stats: CouponStats = {
    totalSold: 0,
    totalRevenue: 0,
    activeCount: 0,
    redeemedCount: 0,
    expiredCount: 0,
  }

  if (data) {
    for (const c of data) {
      if (c.status !== 'pending_payment' && c.status !== 'cancelled') {
        stats.totalSold++
        stats.totalRevenue += c.amount_cents
      }
      if (c.status === 'active' || c.status === 'partially_used') stats.activeCount++
      if (c.status === 'fully_used') stats.redeemedCount++
      if (c.status === 'expired') stats.expiredCount++
    }
  }

  return {
    coupons: data || [],
    stats,
    loading: isLoading,
    error: error?.message || null,
    refetch: mutate,
  }
}

export function useCoupon(id: string | null) {
  const { data, error, mutate, isLoading } = useSWR<GiftCouponWithRedemptions>(
    id ? `/api/coupons/${id}` : null,
    fetcher
  )

  return {
    coupon: data || null,
    loading: isLoading,
    error: error?.message || null,
    refetch: mutate,
  }
}
