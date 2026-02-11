'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Advertisement, Language } from '@/types'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface AdBannerProps {
  ads: Advertisement[]
  lang: Language
}

function getLocalizedField(ad: Advertisement, field: string, lang: Language): string {
  const key = `${field}_${lang}` as keyof Advertisement
  const value = ad[key] as string
  return value || (ad[`${field}_en` as keyof Advertisement] as string) || ''
}

export default function AdBanner({ ads, lang }: AdBannerProps) {
  const [current, setCurrent] = useState(0)

  const next = useCallback(() => setCurrent(i => (i + 1) % ads.length), [ads.length])

  useEffect(() => {
    if (ads.length <= 1) return
    const timer = setInterval(next, 6000)
    return () => clearInterval(timer)
  }, [ads.length, next])

  useEffect(() => {
    // Track impression
    if (ads[current]) {
      fetch(`/api/ads/${ads[current].id}/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'impression' }),
      }).catch(() => {})
    }
  }, [current, ads])

  if (ads.length === 0) return null

  const ad = ads[current]
  const title = getLocalizedField(ad, 'title', lang)
  const description = getLocalizedField(ad, 'description', lang)
  const ctaText = getLocalizedField(ad, 'cta_text', lang)

  const handleClick = () => {
    fetch(`/api/ads/${ad.id}/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'click' }),
    }).catch(() => {})

    if (ad.cta_url) {
      if (ad.cta_url.startsWith('#')) {
        document.querySelector(ad.cta_url)?.scrollIntoView({ behavior: 'smooth' })
      } else {
        window.open(ad.cta_url, '_blank', 'noopener')
      }
    }
  }

  const hasImage = !!ad.image_url

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg"
      style={{ backgroundColor: ad.background_color, color: ad.text_color }}
      onClick={handleClick}
    >
      {/* Background image if available */}
      {hasImage && (
        <div className="absolute inset-0">
          <img
            src={ad.image_url!}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
        </div>
      )}

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4">
        <div className="flex-1 min-w-0">
          {title && <p className="font-bold text-sm md:text-base">{title}</p>}
          {description && <p className="text-xs md:text-sm opacity-90 mt-0.5">{description}</p>}
        </div>
        {ctaText && (
          <span className="self-start sm:self-center flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm">
            {ctaText}
          </span>
        )}
      </div>

      {ads.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrent(i => (i - 1 + ads.length) % ads.length) }}
            className="absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next() }}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
            {ads.map((_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === current ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
