'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import CouponList from '@/components/coupons/coupon-list'
import CouponValidator from '@/components/coupons/coupon-validator'
import { Gift, QrCode } from 'lucide-react'

export default function CouponsPage() {
  const t = useTranslations('coupons')
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gift className="h-6 w-6 text-amber-500" />
          {t('title')}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{t('subtitle')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">{t('pageTabs.overview')}</TabsTrigger>
          <TabsTrigger value="validate" className="gap-1.5">
            <QrCode className="h-3.5 w-3.5" />
            {t('pageTabs.validate')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <CouponList />
        </TabsContent>

        <TabsContent value="validate" className="mt-6">
          <CouponValidator />
        </TabsContent>
      </Tabs>
    </div>
  )
}
