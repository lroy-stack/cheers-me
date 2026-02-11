'use client'

import type { CouponTheme } from '@/types'
import Image from 'next/image'

interface CouponPreviewCardProps {
  amount: number // cents
  theme: CouponTheme
  recipientName?: string
  message?: string
  code?: string
  expiresAt?: string
}

const themeStyles: Record<CouponTheme, { bg: string; accent: string; pattern: string }> = {
  elegant: { bg: 'from-[#1a1a2e] to-[#2d2d4e]', accent: 'text-[#c9a84c]', pattern: 'radial-gradient(circle at 80% 20%, rgba(201,168,76,0.08) 0%, transparent 50%)' },
  tropical: { bg: 'from-[#0d7377] to-[#14a085]', accent: 'text-[#ffa726]', pattern: 'radial-gradient(circle at 80% 20%, rgba(255,167,38,0.08) 0%, transparent 50%)' },
  celebration: { bg: 'from-[#5b2c6f] to-[#e74c8b]', accent: 'text-[#f8bbd0]', pattern: 'radial-gradient(circle at 80% 20%, rgba(248,187,208,0.08) 0%, transparent 50%)' },
  seasonal: { bg: 'from-[#2c3e50] to-[#27ae60]', accent: 'text-[#7dcea0]', pattern: 'radial-gradient(circle at 80% 20%, rgba(125,206,160,0.08) 0%, transparent 50%)' },
}

export default function CouponPreviewCard({ amount, theme, recipientName, message, code, expiresAt }: CouponPreviewCardProps) {
  const styles = themeStyles[theme] || themeStyles.elegant

  return (
    <div
      className={`relative w-full max-w-sm mx-auto aspect-[1.6/1] rounded-xl bg-gradient-to-br ${styles.bg} p-5 flex flex-col justify-between text-white shadow-lg overflow-hidden`}
      style={{ backgroundImage: styles.pattern }}
    >
      {/* Decorative inner border */}
      <div className="absolute inset-[6px] rounded-lg border border-white/10 pointer-events-none" />

      {/* Top row: logo + title | code */}
      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-center gap-2">
          <Image
            src="/icons/logoheader.png"
            alt="GrandCafe Cheers"
            width={28}
            height={28}
            className="rounded shrink-0"
          />
          <div>
            <p className={`text-[10px] font-semibold tracking-[0.2em] uppercase ${styles.accent}`}>GIFT VOUCHER</p>
            <p className="text-[8px] opacity-60 mt-0.5">GrandCafe Cheers &middot; Mallorca</p>
          </div>
        </div>
        {code && (
          <span className="font-mono text-[9px] opacity-50 tracking-wider">{code}</span>
        )}
      </div>

      {/* Center: Amount + recipient */}
      <div className="text-center relative z-10">
        <p className={`text-4xl font-bold ${styles.accent}`}>
          &euro;{amount > 0 ? (amount / 100).toFixed(0) : '\u2014'}
        </p>
        {recipientName && (
          <p className="text-sm mt-1 opacity-90">for {recipientName}</p>
        )}
      </div>

      {/* Bottom: message or location + validity */}
      <div className="text-center relative z-10 space-y-0.5">
        {message ? (
          <p className="text-[10px] italic opacity-70 line-clamp-2">&ldquo;{message}&rdquo;</p>
        ) : (
          <p className="text-[10px] opacity-40">El Arenal, Mallorca</p>
        )}
        {expiresAt && (
          <p className="text-[8px] opacity-40">
            Valid until {new Date(expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        )}
      </div>
    </div>
  )
}
