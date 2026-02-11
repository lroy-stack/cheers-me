'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AdList from '@/components/ads/ad-list'
import AdForm from '@/components/ads/ad-form'
import { Newspaper, Plus, Eye, MousePointerClick, TrendingUp, Radio } from 'lucide-react'
import { useAds } from '@/hooks/use-ads'

function AdStats() {
  const { ads } = useAds()

  const activeCount = ads.filter((a) => a.status === 'active').length
  const totalImpressions = ads.reduce((sum, a) => sum + (a.impressions || 0), 0)
  const totalClicks = ads.reduce((sum, a) => sum + (a.clicks || 0), 0)
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0'

  const stats = [
    {
      label: 'Active Ads',
      value: activeCount,
      icon: Radio,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Total Impressions',
      value: totalImpressions.toLocaleString(),
      icon: Eye,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Total Clicks',
      value: totalClicks.toLocaleString(),
      icon: MousePointerClick,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      label: 'Avg CTR',
      value: `${avgCtr}%`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className={`${stat.bg} rounded-xl p-4 border border-border`}>
          <div className="flex items-center gap-2 mb-2">
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
            <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
          </div>
          <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  )
}

export default function AdsPage() {
  const t = useTranslations('ads')
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Newspaper className="h-6 w-6 text-indigo-500" />
          {t('title')}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{t('subtitle')}</p>
      </div>

      {/* Dashboard Stats */}
      <AdStats />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">{t('pageTabs.overview')}</TabsTrigger>
          <TabsTrigger value="create" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            {t('pageTabs.createAd')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <AdList onCreateClick={() => setActiveTab('create')} />
        </TabsContent>

        <TabsContent value="create" className="mt-6">
          <AdForm onSuccess={() => setActiveTab('overview')} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
