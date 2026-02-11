'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { GiftCouponPublic } from '@/types'
import { formatCouponAmount } from '@/lib/utils/coupon-code'
import { Loader2, X } from 'lucide-react'

interface CouponRedeemDialogProps {
  coupon: GiftCouponPublic
  validationMethod: string
  onRedeem: (amountCents: number, method: string, notes?: string) => Promise<boolean>
  onClose: () => void
}

export default function CouponRedeemDialog({ coupon, validationMethod, onRedeem, onClose }: CouponRedeemDialogProps) {
  const t = useTranslations('coupons.redeem')
  const [mode, setMode] = useState<'full' | 'custom'>('full')
  const [customAmount, setCustomAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const amountCents = mode === 'full'
    ? coupon.remaining_cents
    : Math.min(Math.round(parseFloat(customAmount || '0') * 100), coupon.remaining_cents)

  const handleConfirm = async () => {
    if (amountCents <= 0) return
    setLoading(true)
    const success = await onRedeem(amountCents, validationMethod, notes || undefined)
    setLoading(false)
    if (success) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl w-full max-w-sm mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-bold">{t('title')}</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-4 space-y-4">
          <div className="text-center">
            <p className="font-mono text-lg font-bold">{coupon.code}</p>
            <p className="text-sm text-muted-foreground">
              Balance: {formatCouponAmount(coupon.remaining_cents)}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('full')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'full' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {t('fullAmount')}
            </button>
            <button
              type="button"
              onClick={() => setMode('custom')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'custom' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {t('customAmount')}
            </button>
          </div>

          {mode === 'custom' && (
            <div>
              <label className="text-sm font-medium">{t('amountLabel')}</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                <input
                  type="number"
                  min="0.01"
                  max={coupon.remaining_cents / 100}
                  step="0.01"
                  value={customAmount}
                  onChange={e => setCustomAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-md border border-border bg-background text-sm"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('amountHelp', { max: formatCouponAmount(coupon.remaining_cents) })}
              </p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">{t('notes')}</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-sm"
            />
          </div>

          <div className="text-center text-lg font-bold">
            {formatCouponAmount(amountCents)}
          </div>

          <button
            onClick={handleConfirm}
            disabled={loading || amountCents <= 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? t('confirming') : t('confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
