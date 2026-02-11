'use client'

import { useTranslations } from 'next-intl'
import type { CouponStats } from '@/types'
import { Gift, Euro, CreditCard, CheckCircle } from 'lucide-react'

interface CouponStatsCardsProps {
  stats: CouponStats
}

export default function CouponStatsCards({ stats }: CouponStatsCardsProps) {
  const t = useTranslations('coupons.stats')

  const cards = [
    { label: t('totalSold'), value: stats.totalSold.toString(), icon: Gift, color: 'text-blue-500' },
    { label: t('totalRevenue'), value: `€${(stats.totalRevenue / 100).toFixed(0)}`, icon: Euro, color: 'text-green-500' },
    { label: t('activeCoupons'), value: stats.activeCount.toString(), icon: CreditCard, color: 'text-amber-500' },
    { label: t('redeemed'), value: stats.redeemedCount.toString(), icon: CheckCircle, color: 'text-purple-500' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{label}</p>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
      ))}
    </div>
  )
}
