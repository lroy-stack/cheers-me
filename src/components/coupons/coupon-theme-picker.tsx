'use client'

import type { CouponTheme } from '@/types'
import { useTranslations } from 'next-intl'

interface CouponThemePickerProps {
  selected: CouponTheme
  onChange: (theme: CouponTheme) => void
}

const themes: { value: CouponTheme; gradient: string }[] = [
  { value: 'elegant', gradient: 'from-[#1a1a2e] to-[#2d2d4e]' },
  { value: 'tropical', gradient: 'from-[#0d7377] to-[#14a085]' },
  { value: 'celebration', gradient: 'from-[#5b2c6f] to-[#e74c8b]' },
  { value: 'seasonal', gradient: 'from-[#2c3e50] to-[#27ae60]' },
]

export default function CouponThemePicker({ selected, onChange }: CouponThemePickerProps) {
  const t = useTranslations('coupons.theme')

  return (
    <div className="grid grid-cols-2 gap-3">
      {themes.map(({ value, gradient }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={`relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
            selected === value
              ? 'border-primary ring-2 ring-primary/20'
              : 'border-border hover:border-primary/40'
          }`}
        >
          <div className={`w-full h-16 rounded-md bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <span className="text-white text-xs font-bold tracking-wider">GIFT VOUCHER</span>
          </div>
          <span className="text-xs font-medium">{t(value)}</span>
        </button>
      ))}
    </div>
  )
}
