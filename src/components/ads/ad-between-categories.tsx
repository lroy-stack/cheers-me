'use client'

import type { Advertisement, Language } from '@/types'

interface AdBetweenCategoriesProps {
  ad: Advertisement
  lang: Language
}

function getLocalizedField(ad: Advertisement, field: string, lang: Language): string {
  const key = `${field}_${lang}` as keyof Advertisement
  const value = ad[key] as string
  return value || (ad[`${field}_en` as keyof Advertisement] as string) || ''
}

export default function AdBetweenCategories({ ad, lang }: AdBetweenCategoriesProps) {
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
  }

  return (
    <div
      className="w-full my-4 rounded-xl overflow-hidden shadow-md cursor-pointer hover:shadow-lg transition-shadow"
      style={{ backgroundColor: ad.background_color, color: ad.text_color }}
      onClick={handleClick}
    >
      <div className="flex flex-col sm:flex-row sm:items-center">
        {ad.image_url && (
          <img src={ad.image_url} alt={title} className="w-full sm:w-48 h-28 sm:h-auto object-cover" />
        )}
        <div className="p-4 space-y-1 flex-1">
          {title && <h3 className="font-bold text-base">{title}</h3>}
          {description && <p className="text-sm opacity-90">{description}</p>}
          {ctaText && (
            <span className="inline-block mt-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-white/20 hover:bg-white/30 transition-colors">
              {ctaText}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
