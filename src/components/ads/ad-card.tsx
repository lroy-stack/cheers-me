'use client'

import { useState } from 'react'
import type { Advertisement } from '@/types'
import { Eye, MousePointerClick, Calendar, Play, Pause } from 'lucide-react'

interface AdCardProps {
  ad: Advertisement
  onClick?: () => void
  onStatusToggle?: () => void
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  archived: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
}

export default function AdCard({ ad, onClick, onStatusToggle }: AdCardProps) {
  const [toggling, setToggling] = useState(false)

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (toggling) return

    const newStatus = ad.status === 'active' ? 'paused' : 'active'
    setToggling(true)

    try {
      const res = await fetch(`/api/ads/${ad.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        onStatusToggle?.()
      }
    } catch {
      // ignore
    } finally {
      setToggling(false)
    }
  }

  const canToggle = ad.status === 'active' || ad.status === 'paused'

  return (
    <div
      className="bg-card border border-border rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow relative"
      onClick={onClick}
    >
      {/* Quick toggle button */}
      {canToggle && (
        <button
          onClick={handleToggle}
          disabled={toggling}
          className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-background transition-colors shadow-sm disabled:opacity-50"
          title={ad.status === 'active' ? 'Pause ad' : 'Activate ad'}
        >
          {ad.status === 'active' ? (
            <Pause className="w-3.5 h-3.5 text-yellow-600" />
          ) : (
            <Play className="w-3.5 h-3.5 text-green-600" />
          )}
        </button>
      )}

      {ad.image_url ? (
        <div className="h-32 overflow-hidden">
          <img src={ad.image_url} alt={ad.title_en} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div
          className="h-32 flex items-center justify-center"
          style={{ backgroundColor: ad.background_color, color: ad.text_color }}
        >
          <span className="font-bold text-lg">{ad.title_en || 'Untitled Ad'}</span>
        </div>
      )}

      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm truncate">{ad.title_en || 'Untitled'}</h3>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[ad.status] || statusColors.draft}`}>
            {ad.status}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {ad.impressions}
          </span>
          <span className="flex items-center gap-1">
            <MousePointerClick className="h-3 w-3" />
            {ad.clicks}
          </span>
          {ad.impressions > 0 && (
            <span className="text-primary font-medium">
              {((ad.clicks / ad.impressions) * 100).toFixed(1)}% CTR
            </span>
          )}
          {ad.start_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {ad.start_date}
            </span>
          )}
        </div>

        <div className="flex gap-1 flex-wrap">
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
            {ad.placement.replace('_', ' ')}
          </span>
          {ad.display_pages?.map((page) => (
            <span key={page} className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary">
              {page.replace('_', ' ')}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
