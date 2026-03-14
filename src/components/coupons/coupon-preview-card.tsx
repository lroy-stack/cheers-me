'use client'

import type { CouponTheme } from '@/types'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'

interface CouponPreviewCardProps {
  amount: number // cents
  theme: CouponTheme
  recipientName?: string
  message?: string
  code?: string
  expiresAt?: string
}

const themeStyles: Record<CouponTheme, { bg: string; accent: string; accentBorder: string; pattern: string }> = {
  elegant: {
    bg: 'from-[#1a1a2e] to-[#2d2d4e]',
    accent: 'text-[#c9a84c]',
    accentBorder: 'border-[#c9a84c]/20',
    pattern: 'radial-gradient(circle at 85% 15%, rgba(201,168,76,0.1) 0%, transparent 50%), radial-gradient(circle at 15% 85%, rgba(201,168,76,0.05) 0%, transparent 50%)',
  },
  tropical: {
    bg: 'from-[#0d7377] to-[#14a085]',
    accent: 'text-[#ffa726]',
    accentBorder: 'border-[#ffa726]/20',
    pattern: 'radial-gradient(circle at 85% 15%, rgba(255,167,38,0.1) 0%, transparent 50%), radial-gradient(circle at 15% 85%, rgba(255,167,38,0.05) 0%, transparent 50%)',
  },
  celebration: {
    bg: 'from-[#5b2c6f] to-[#e74c8b]',
    accent: 'text-[#f8bbd0]',
    accentBorder: 'border-[#f8bbd0]/20',
    pattern: 'radial-gradient(circle at 85% 15%, rgba(248,187,208,0.1) 0%, transparent 50%), radial-gradient(circle at 15% 85%, rgba(248,187,208,0.05) 0%, transparent 50%)',
  },
  seasonal: {
    bg: 'from-[#2c3e50] to-[#27ae60]',
    accent: 'text-[#7dcea0]',
    accentBorder: 'border-[#7dcea0]/20',
    pattern: 'radial-gradient(circle at 85% 15%, rgba(125,206,160,0.1) 0%, transparent 50%), radial-gradient(circle at 15% 85%, rgba(125,206,160,0.05) 0%, transparent 50%)',
  },
}

export default function CouponPreviewCard({ amount, theme, recipientName, message, code, expiresAt }: CouponPreviewCardProps) {
  const styles = themeStyles[theme] || themeStyles.elegant
  const t = useTranslations('coupons.purchase')
  const locale = useLocale()

  return (
    <div
      className={`relative w-full max-w-sm mx-auto aspect-[3/2] rounded-2xl bg-gradient-to-br ${styles.bg} shadow-2xl overflow-hidden`}
      style={{ backgroundImage: styles.pattern }}
    >
      {/* Outer decorative border */}
      <div className={`absolute inset-[5px] rounded-xl border ${styles.accentBorder} pointer-events-none`} />
      {/* Inner decorative border */}
      <div className={`absolute inset-[9px] rounded-[10px] border ${styles.accentBorder} pointer-events-none`} />

      {/* Content with padding inside double border */}
      <div className="relative z-10 h-full flex flex-col justify-between p-5 sm:p-6">
        {/* Top row: logo + title | code */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <Image
              src="/icons/logoheader.png"
              alt="GrandCafe Cheers"
              width={32}
              height={32}
              className="rounded-md shrink-0 shadow-lg"
            />
            <div>
              <p className={`text-[10px] sm:text-[11px] font-semibold tracking-[0.2em] uppercase ${styles.accent}`}>
                GIFT VOUCHER
              </p>
              <p className="text-[8px] sm:text-[9px] text-foreground/40 mt-0.5">
                GrandCafe Cheers &middot; Mallorca
              </p>
            </div>
          </div>
          {code && (
            <span className="font-mono text-[9px] text-foreground/40 tracking-wider">{code}</span>
          )}
        </div>

        {/* Center: Amount + recipient */}
        <div className="text-center flex-1 flex flex-col items-center justify-center -mt-1">
          <p className={`text-5xl sm:text-6xl font-bold tracking-tight ${styles.accent}`}>
            &euro;{amount > 0 ? (amount / 100).toFixed(0) : '\u2014'}
          </p>
          {recipientName && (
            <p className="text-sm sm:text-base mt-2 text-foreground/80 font-light">
              {t('forRecipient', { name: recipientName })}
            </p>
          )}
        </div>

        {/* Bottom: message or location + validity */}
        <div className="text-center space-y-1">
          {message ? (
            <p className="text-[10px] sm:text-xs italic text-foreground/60 line-clamp-2 leading-relaxed">
              &ldquo;{message}&rdquo;
            </p>
          ) : (
            <p className="text-[10px] sm:text-[11px] text-foreground/30 tracking-wider uppercase">
              El Arenal, Mallorca
            </p>
          )}
          {expiresAt && (
            <p className="text-[8px] sm:text-[9px] text-foreground/30">
              {t('validUntilDate', { date: new Date(expiresAt).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) })}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
