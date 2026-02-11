'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { GiftCouponPublic } from '@/types'
import { formatCouponAmount } from '@/lib/utils/coupon-code'
import CouponPreviewCard from './coupon-preview-card'
import { Download, Loader2, Gift, Image as ImageIcon, Printer } from 'lucide-react'

interface CouponPublicViewProps {
  code: string
}

export default function CouponPublicView({ code }: CouponPublicViewProps) {
  const t = useTranslations('coupons.publicView')
  const [coupon, setCoupon] = useState<GiftCouponPublic | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/public/coupons/${code}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found')
        return res.json()
      })
      .then(setCoupon)
      .catch(() => setError('Coupon not found'))
      .finally(() => setLoading(false))
  }, [code])

  const handleDownloadPng = useCallback(async () => {
    if (!coupon) return
    try {
      const res = await fetch(`/api/public/coupons/${coupon.code}/png`)
      if (!res.ok) throw new Error('Failed to download')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `GrandCafe-Cheers-Gift-${coupon.code}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // Download failed silently
    }
  }, [coupon])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !coupon) {
    return (
      <div className="text-center py-16">
        <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-muted-foreground">Coupon not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{t('giftVoucher')}</h1>
        <p className="text-muted-foreground font-mono mt-1">{coupon.code}</p>
      </div>

      <CouponPreviewCard
        amount={coupon.amount_cents}
        theme={coupon.theme}
        recipientName={coupon.recipient_name || undefined}
        message={coupon.personal_message || undefined}
        code={coupon.code}
        expiresAt={coupon.expires_at}
      />

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">{t('balance')}</span>
          <span className="text-xl font-bold text-green-600">{formatCouponAmount(coupon.remaining_cents)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">{t('validUntil')}</span>
          <span>{new Date(coupon.expires_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-3 print:hidden">
        {coupon.pdf_url && (
          <a
            href={`/api/public/coupons/${coupon.code}/pdf`}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            <Download className="h-5 w-5" />
            {t('downloadPdf')}
          </a>
        )}

        <button
          onClick={handleDownloadPng}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-border font-medium hover:bg-muted transition-colors"
        >
          <ImageIcon className="h-5 w-5" />
          Download Image (PNG)
        </button>

        <button
          onClick={handlePrint}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-border font-medium hover:bg-muted transition-colors text-sm"
        >
          <Printer className="h-4 w-4" />
          Print Voucher
        </button>
      </div>

      <p className="text-center text-xs text-muted-foreground px-4 print:hidden">
        {t('redeemInStore')}
      </p>
    </div>
  )
}
