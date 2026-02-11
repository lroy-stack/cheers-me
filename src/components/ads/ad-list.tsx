'use client'

import { useState } from 'react'
import { useAds } from '@/hooks/use-ads'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import AdCard from './ad-card'
import { Plus, Loader2, LayoutGrid, List, Play, Pause, Eye, MousePointerClick } from 'lucide-react'
import type { Advertisement } from '@/types'

interface AdListProps {
  onCreateClick?: () => void
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  archived: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
}

export default function AdList({ onCreateClick }: AdListProps) {
  const t = useTranslations('ads')
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [templateFilter, setTemplateFilter] = useState<string>('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const { ads, loading, refetch } = useAds({
    status: statusFilter || undefined,
    template: templateFilter || undefined,
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-md border border-border bg-background text-sm"
        >
          <option value="">{t('filters.allStatuses')}</option>
          {['draft', 'active', 'paused', 'expired', 'archived'].map(s => (
            <option key={s} value={s}>{t(`status.${s}`)}</option>
          ))}
        </select>

        <select
          value={templateFilter}
          onChange={e => setTemplateFilter(e.target.value)}
          className="px-3 py-1.5 rounded-md border border-border bg-background text-sm"
        >
          <option value="">{t('filters.allTemplates')}</option>
          {['football_match', 'special_menu', 'happy_hour', 'cocktail_presentation', 'custom'].map(tpl => (
            <option key={tpl} value={tpl}>{t(`template.${tpl}`)}</option>
          ))}
        </select>

        {/* View mode toggle */}
        <div className="flex items-center border border-border rounded-md overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
            title="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
            title="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1" />

        <button
          onClick={() => onCreateClick ? onCreateClick() : router.push('/ads/create')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('createAd')}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : ads.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">{t('noAds')}</p>
          <p className="text-sm mt-1">{t('noAdsDescription')}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ads.map(ad => (
            <AdCard
              key={ad.id}
              ad={ad}
              onClick={() => router.push(`/ads/${ad.id}/edit`)}
              onStatusToggle={() => refetch()}
            />
          ))}
        </div>
      ) : (
        <AdTable ads={ads} onEdit={(id) => router.push(`/ads/${id}/edit`)} onRefetch={() => refetch()} />
      )}
    </div>
  )
}

function AdTable({ ads, onEdit, onRefetch }: { ads: Advertisement[]; onEdit: (id: string) => void; onRefetch: () => void }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Placement</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pages</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Impressions</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Clicks</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">CTR</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ads.map((ad) => (
              <AdTableRow key={ad.id} ad={ad} onEdit={onEdit} onRefetch={onRefetch} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AdTableRow({ ad, onEdit, onRefetch }: { ad: Advertisement; onEdit: (id: string) => void; onRefetch: () => void }) {
  const [toggling, setToggling] = useState(false)
  const canToggle = ad.status === 'active' || ad.status === 'paused'
  const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : '0.0'

  const handleToggle = async () => {
    if (toggling || !canToggle) return
    setToggling(true)
    const newStatus = ad.status === 'active' ? 'paused' : 'active'
    try {
      const res = await fetch(`/api/ads/${ad.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) onRefetch()
    } catch {
      // ignore
    } finally {
      setToggling(false)
    }
  }

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[ad.status] || statusColors.draft}`}>
          {ad.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <button onClick={() => onEdit(ad.id)} className="font-medium text-foreground hover:text-primary transition-colors text-left">
          {ad.title_en || 'Untitled'}
        </button>
      </td>
      <td className="px-4 py-3">
        <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
          {ad.placement.replace(/_/g, ' ')}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1 flex-wrap">
          {ad.display_pages?.map((page) => (
            <span key={page} className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary">
              {page.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        <span className="inline-flex items-center gap-1">
          <Eye className="h-3 w-3 text-muted-foreground" />
          {ad.impressions.toLocaleString()}
        </span>
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        <span className="inline-flex items-center gap-1">
          <MousePointerClick className="h-3 w-3 text-muted-foreground" />
          {ad.clicks.toLocaleString()}
        </span>
      </td>
      <td className="px-4 py-3 text-right tabular-nums font-medium text-primary">
        {ctr}%
      </td>
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-1">
          {canToggle && (
            <button
              onClick={handleToggle}
              disabled={toggling}
              className="p-1.5 rounded-md hover:bg-muted transition-colors disabled:opacity-50"
              title={ad.status === 'active' ? 'Pause' : 'Activate'}
            >
              {ad.status === 'active' ? (
                <Pause className="w-4 h-4 text-yellow-600" />
              ) : (
                <Play className="w-4 h-4 text-green-600" />
              )}
            </button>
          )}
          <button
            onClick={() => onEdit(ad.id)}
            className="px-2 py-1 rounded-md text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            Edit
          </button>
        </div>
      </td>
    </tr>
  )
}
