'use client'

import { useState, useCallback } from 'react'
import type { GiftCouponPublic } from '@/types'
import { isValidCouponCode } from '@/lib/utils/coupon-code'

interface ValidatorState {
  coupon: GiftCouponPublic | null
  loading: boolean
  error: string | null
  redeemLoading: boolean
  redeemSuccess: boolean
}

export function useCouponValidator() {
  const [state, setState] = useState<ValidatorState>({
    coupon: null,
    loading: false,
    error: null,
    redeemLoading: false,
    redeemSuccess: false,
  })

  const lookupByCode = useCallback(async (code: string) => {
    if (!isValidCouponCode(code)) {
      setState(s => ({ ...s, error: 'Invalid coupon code format', coupon: null }))
      return
    }

    setState(s => ({ ...s, loading: true, error: null, coupon: null, redeemSuccess: false }))

    try {
      const res = await fetch(`/api/public/coupons/${code.toUpperCase()}`)
      if (!res.ok) {
        const data = await res.json()
        setState(s => ({ ...s, loading: false, error: data.error || 'Coupon not found' }))
        return
      }
      const coupon = await res.json()
      setState(s => ({ ...s, loading: false, coupon }))
    } catch {
      setState(s => ({ ...s, loading: false, error: 'Failed to look up coupon' }))
    }
  }, [])

  const handleQrScan = useCallback((decodedText: string) => {
    // QR contains URL like https://domain/gift/GC-XXXXXX
    const match = decodedText.match(/GC-[A-HJ-NP-Z2-9]{6}/i)
    if (match) {
      lookupByCode(match[0])
    }
  }, [lookupByCode])

  const redeem = useCallback(async (couponId: string, amountCents: number, method: string, notes?: string) => {
    setState(s => ({ ...s, redeemLoading: true, redeemSuccess: false, error: null }))

    try {
      const res = await fetch(`/api/coupons/${couponId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_cents: amountCents,
          validation_method: method,
          notes,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setState(s => ({ ...s, redeemLoading: false, error: data.error || 'Redemption failed' }))
        return false
      }

      const result = await res.json()
      setState(s => ({
        ...s,
        redeemLoading: false,
        redeemSuccess: true,
        coupon: s.coupon ? {
          ...s.coupon,
          remaining_cents: result.remaining_cents,
          status: result.coupon.status,
        } : null,
      }))
      return true
    } catch {
      setState(s => ({ ...s, redeemLoading: false, error: 'Redemption failed' }))
      return false
    }
  }, [])

  const reset = useCallback(() => {
    setState({
      coupon: null,
      loading: false,
      error: null,
      redeemLoading: false,
      redeemSuccess: false,
    })
  }, [])

  return {
    ...state,
    lookupByCode,
    handleQrScan,
    redeem,
    reset,
  }
}
