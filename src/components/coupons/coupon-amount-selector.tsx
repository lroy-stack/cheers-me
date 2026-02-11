'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
// Client-side constants (mirror STRIPE_CONFIG to avoid importing server module)
const MIN_AMOUNT_CENTS = 1000
const MAX_AMOUNT_CENTS = 50000

interface CouponAmountSelectorProps {
  value: number // in cents
  onChange: (cents: number) => void
}

const PRESETS = [2500, 5000, 7500, 10000] // €25, €50, €75, €100

export default function CouponAmountSelector({ value, onChange }: CouponAmountSelectorProps) {
  const t = useTranslations('coupons.purchase')
  const [isCustom, setIsCustom] = useState(!PRESETS.includes(value) && value > 0)
  const [customValue, setCustomValue] = useState(value > 0 ? (value / 100).toString() : '')

  const handlePreset = (cents: number) => {
    setIsCustom(false)
    onChange(cents)
  }

  const handleCustom = (val: string) => {
    setCustomValue(val)
    const num = parseFloat(val)
    if (!isNaN(num)) {
      const cents = Math.round(num * 100)
      if (cents >= 1000 && cents <= 50000) {
        onChange(cents)
      }
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{t('selectAmount')}</p>
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map(cents => (
          <button
            key={cents}
            type="button"
            onClick={() => handlePreset(cents)}
            className={`py-3 rounded-lg text-lg font-bold transition-all ${
              !isCustom && value === cents
                ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            €{cents / 100}
          </button>
        ))}
      </div>
      <div>
        <button
          type="button"
          onClick={() => setIsCustom(true)}
          className={`w-full text-sm py-1.5 rounded-md transition-colors ${
            isCustom ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('customAmount')}
        </button>
        {isCustom && (
          <div className="mt-2 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">€</span>
            <input
              type="number"
              min={MIN_AMOUNT_CENTS / 100}
              max={MAX_AMOUNT_CENTS / 100}
              step="1"
              value={customValue}
              onChange={e => handleCustom(e.target.value)}
              className="w-full pl-8 pr-3 py-2.5 rounded-md border border-border bg-background text-lg font-bold"
              placeholder="50"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('minAmount', { min: MIN_AMOUNT_CENTS / 100 })} — {t('maxAmount', { max: MAX_AMOUNT_CENTS / 100 })}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
