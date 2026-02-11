'use client'

import { useState, useEffect } from 'react'
import type { Advertisement, Language } from '@/types'
import { X } from 'lucide-react'

interface AdFullscreenOverlayProps {
  ad: Advertisement
  lang: Language
}

const STORAGE_KEY = 'gc_ad_overlay_shown'

function getLocalizedField(ad: Advertisement, field: string, lang: Language): string {
  const key = `${field}_${lang}` as keyof Advertisement
  const value = ad[key] as string
  return value || (ad[`${field}_en` as keyof Advertisement] as string) || ''
}

export default function AdFullscreenOverlay({ ad, lang }: AdFullscreenOverlayProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show once per session
    const shown = sessionStorage.getItem(STORAGE_KEY)
    if (shown) return

    const timer = setTimeout(() => {
      setVisible(true)
      sessionStorage.setItem(STORAGE_KEY, '1')

      // Track impression
      fetch(`/api/ads/${ad.id}/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'impression' }),
      }).catch(() => {})
    }, 1500)

    return () => clearTimeout(timer)
  }, [ad.id])

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => setVisible(false), 5000)
    return () => clearTimeout(timer)
  }, [visible])

  if (!visible) return null

  const title = getLocalizedField(ad, 'title', lang)
  const description = getLocalizedField(ad, 'description', lang)
  const ctaText = getLocalizedField(ad, 'cta_text', lang)

  const handleClick = () => {
    fetch(`/api/ads/${ad.id}/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'click' }),
    }).catch(() => {})

    if (ad.cta_url) window.open(ad.cta_url, '_blank', 'noopener')
    setVisible(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className="relative mx-4 max-w-md w-full rounded-2xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: ad.background_color, color: ad.text_color }}
      >
        <button
          onClick={() => setVisible(false)}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {ad.image_url && (
          <img src={ad.image_url} alt={title} className="w-full h-48 object-cover" />
        )}

        <div className="p-6 space-y-3 text-center">
          {title && <h2 className="text-2xl font-bold">{title}</h2>}
          {description && <p className="text-base opacity-90">{description}</p>}
          {ctaText && (
            <button
              onClick={handleClick}
              className="mt-3 px-6 py-2.5 rounded-full font-semibold text-sm bg-white/20 hover:bg-white/30 transition-colors"
            >
              {ctaText}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
