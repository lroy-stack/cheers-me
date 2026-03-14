'use client'

import type { CouponTheme } from '@/types'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CouponThemePickerProps {
  selected: CouponTheme
  onChange: (theme: CouponTheme) => void
}

const themes: { value: CouponTheme; gradient: string; accentColor: string }[] = [
  { value: 'elegant', gradient: 'from-[#1a1a2e] to-[#2d2d4e]', accentColor: '#c9a84c' },
  { value: 'tropical', gradient: 'from-[#0d7377] to-[#14a085]', accentColor: '#ffa726' },
  { value: 'celebration', gradient: 'from-[#5b2c6f] to-[#e74c8b]', accentColor: '#f8bbd0' },
  { value: 'seasonal', gradient: 'from-[#2c3e50] to-[#27ae60]', accentColor: '#7dcea0' },
]

export default function CouponThemePicker({ selected, onChange }: CouponThemePickerProps) {
  const t = useTranslations('coupons.theme')
  const tp = useTranslations('coupons.purchase')

  return (
    <div className="grid grid-cols-2 gap-3">
      {themes.map(({ value, gradient, accentColor }) => {
        const isSelected = selected === value
        return (
          <motion.button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            whileTap={{ scale: 0.97 }}
            animate={isSelected ? { scale: 1.03 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={cn(
              'relative flex flex-col items-stretch gap-0 rounded-xl border-2 transition-all overflow-hidden',
              isSelected
                ? 'border-primary shadow-[0_0_20px_oklch(var(--primary)/0.2)]'
                : 'border-border/30 hover:border-border/60'
            )}
          >
            {/* Mini voucher preview */}
            <div className={`relative w-full aspect-[1.6/1] bg-gradient-to-br ${gradient} p-3 flex flex-col justify-between`}>
              {/* Decorative inner border */}
              <div className="absolute inset-[4px] rounded-md border border-foreground/10 pointer-events-none" />

              {/* Top: mini logo area */}
              <div className="flex items-start gap-1.5 relative z-10">
                <div className="w-4 h-4 rounded-sm bg-foreground/20 shrink-0" />
                <div>
                  <p
                    className="text-[7px] font-bold tracking-[0.15em] uppercase"
                    style={{ color: accentColor }}
                  >
                    {tp('giftVoucherLabel')}
                  </p>
                  <p className="text-[5px] text-foreground/40">{tp('brandName')}</p>
                </div>
              </div>

              {/* Center: amount */}
              <p
                className="text-xl font-bold text-center relative z-10"
                style={{ color: accentColor }}
              >
                &euro;50
              </p>

              {/* Bottom: location */}
              <p className="text-[5px] text-center text-foreground/30 relative z-10">
                {tp('location')}
              </p>
            </div>

            {/* Label */}
            <div className={cn(
              'px-2 py-2 text-center transition-colors',
              isSelected ? 'bg-primary/5' : 'bg-card/50'
            )}>
              <span className={cn(
                'text-xs font-medium',
                isSelected ? 'text-primary' : 'text-muted-foreground'
              )}>
                {t(value)}
              </span>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
