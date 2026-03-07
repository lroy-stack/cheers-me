'use client'

import { Badge } from '@/components/ui/badge'
import type { FlavorProfile } from '@/types'

const FLAVOR_STYLES: Record<FlavorProfile, { bg: string; label: string }> = {
  sweet: { bg: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200', label: 'Sweet' },
  sour: { bg: 'bg-warning/15 text-warning-foreground dark:bg-warning/15 dark:text-warning-foreground', label: 'Sour' },
  bitter: { bg: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', label: 'Bitter' },
  spirit_forward: { bg: 'bg-primary/10 text-primary dark:bg-primary/10 dark:text-primary', label: 'Strong' },
  tropical: { bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200', label: 'Tropical' },
  refreshing: { bg: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200', label: 'Refreshing' },
  creamy: { bg: 'bg-stone-100 text-stone-800 dark:bg-stone-900 dark:text-stone-200', label: 'Creamy' },
  spicy: { bg: 'bg-destructive/15 text-destructive dark:bg-destructive/15 dark:text-destructive', label: 'Spicy' },
  herbal: { bg: 'bg-success/15 text-success dark:bg-success/15 dark:text-success', label: 'Herbal' },
  smoky: { bg: 'bg-muted text-foreground dark:bg-card dark:text-foreground', label: 'Smoky' },
  fruity: { bg: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', label: 'Fruity' },
  coffee: { bg: 'bg-brown-100 text-brown-800 dark:bg-warning/15 dark:text-warning-foreground', label: 'Coffee' },
}

interface FlavorProfileBadgeProps {
  flavor: FlavorProfile
}

export function FlavorProfileBadge({ flavor }: FlavorProfileBadgeProps) {
  const style = FLAVOR_STYLES[flavor] || { bg: 'bg-muted text-foreground', label: flavor }

  return (
    <Badge variant="secondary" className={`${style.bg} text-xs font-medium border-0`}>
      {style.label}
    </Badge>
  )
}

interface FlavorProfileBadgesProps {
  flavors: FlavorProfile[]
  max?: number
}

export function FlavorProfileBadges({ flavors, max = 4 }: FlavorProfileBadgesProps) {
  const shown = flavors.slice(0, max)
  const remaining = flavors.length - max

  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((flavor) => (
        <FlavorProfileBadge key={flavor} flavor={flavor} />
      ))}
      {remaining > 0 && (
        <Badge variant="secondary" className="text-xs">+{remaining}</Badge>
      )}
    </div>
  )
}
