'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// Client-side constants (mirror STRIPE_CONFIG to avoid importing server module)
const MIN_AMOUNT_CENTS = 1000
const MAX_AMOUNT_CENTS = 50000

interface CouponAmountSelectorProps {
  value: number // in cents
  onChange: (cents: number) => void
}

const PRESETS = [2500, 5000, 7500, 10000] // 25, 50, 75, 100

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{t('selectAmount')}</p>
        <span className="text-xs text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full">{t('ivaIncluido')}</span>
      </div>

      {/* Preset amount pills */}
      <div className="grid grid-cols-2 gap-2.5">
        {PRESETS.map(cents => {
          const isSelected = !isCustom && value === cents
          return (
            <motion.button
              key={cents}
              type="button"
              onClick={() => handlePreset(cents)}
              whileTap={{ scale: 0.97 }}
              className={cn(
                'relative py-3.5 rounded-full text-lg font-bold transition-all duration-200',
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-[0_0_16px_oklch(var(--primary)/0.25)]'
                  : 'bg-card/30 border border-border/30 text-muted-foreground hover:border-border/60 hover:text-foreground'
              )}
            >
              &euro;{cents / 100}
            </motion.button>
          )
        })}
      </div>

      {/* Custom amount toggle */}
      <div>
        <button
          type="button"
          onClick={() => setIsCustom(true)}
          className={cn(
            'w-full text-sm py-1.5 rounded-full transition-colors',
            isCustom ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {t('customAmount')}
        </button>

        {isCustom && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 relative"
          >
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">&euro;</span>
            <input
              type="number"
              min={MIN_AMOUNT_CENTS / 100}
              max={MAX_AMOUNT_CENTS / 100}
              step="1"
              value={customValue}
              onChange={e => handleCustom(e.target.value)}
              className="w-full pl-9 pr-4 py-3 rounded-full border border-border/40 bg-background text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              placeholder="50"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1.5 px-1">
              {t('minAmount', { min: MIN_AMOUNT_CENTS / 100 })} — {t('maxAmount', { max: MAX_AMOUNT_CENTS / 100 })}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
