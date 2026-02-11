'use client'

import { useActiveAds } from '@/hooks/use-ads'
import type { Language, AdPlacement } from '@/types'
import AdBanner from './ad-banner'
import AdBetweenCategories from './ad-between-categories'
import AdFullscreenOverlay from './ad-fullscreen-overlay'

interface AdRendererProps {
  page: 'digital_menu' | 'booking'
  placement: AdPlacement
  lang?: Language
}

export default function AdRenderer({ page, placement, lang = 'en' }: AdRendererProps) {
  const { ads } = useActiveAds(page)

  const filtered = ads.filter(ad => ad.placement === placement)

  if (filtered.length === 0) return null

  switch (placement) {
    case 'banner_top':
      return <AdBanner ads={filtered} lang={lang} />

    case 'between_categories':
      return <AdBetweenCategories ad={filtered[0]} lang={lang} />

    case 'fullscreen_overlay':
      return <AdFullscreenOverlay ad={filtered[0]} lang={lang} />

    default:
      return null
  }
}
