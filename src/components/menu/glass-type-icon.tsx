'use client'

import type { GlassType } from '@/types'

const GLASS_EMOJIS: Record<GlassType, string> = {
  rocks: '🥃',
  highball: '🥤',
  coupe: '🍸',
  martini: '🍸',
  collins: '🥂',
  hurricane: '🍹',
  wine: '🍷',
  champagne_flute: '🥂',
  copper_mug: '🫗',
  tiki: '🏝️',
  shot: '🥃',
  beer_glass: '🍺',
  snifter: '🥃',
  irish_coffee: '☕',
}

const GLASS_LABELS: Record<GlassType, string> = {
  rocks: 'Rocks',
  highball: 'Highball',
  coupe: 'Coupe',
  martini: 'Martini',
  collins: 'Collins',
  hurricane: 'Hurricane',
  wine: 'Wine Glass',
  champagne_flute: 'Flute',
  copper_mug: 'Copper Mug',
  tiki: 'Tiki',
  shot: 'Shot',
  beer_glass: 'Beer Glass',
  snifter: 'Snifter',
  irish_coffee: 'Irish Coffee',
}

interface GlassTypeIconProps {
  glassType: GlassType
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function GlassTypeIcon({ glassType, showLabel = false, size = 'md' }: GlassTypeIconProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  }

  return (
    <span className="inline-flex items-center gap-1" title={GLASS_LABELS[glassType]}>
      <span className={sizeClasses[size]}>{GLASS_EMOJIS[glassType] || '🍸'}</span>
      {showLabel && (
        <span className="text-xs text-muted-foreground">{GLASS_LABELS[glassType]}</span>
      )}
    </span>
  )
}
