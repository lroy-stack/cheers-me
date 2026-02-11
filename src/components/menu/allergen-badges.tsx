'use client'

import { ALLERGENS, type AllergenType } from '@/lib/constants/allergens'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface AllergenBadgesProps {
  allergens: AllergenType[]
  language?: 'en' | 'nl' | 'es'
  size?: 'sm' | 'md' | 'lg'
  maxVisible?: number
  showTooltip?: boolean
}

export function AllergenBadges({
  allergens,
  language = 'en',
  size = 'md',
  maxVisible = 8,
  showTooltip = true,
}: AllergenBadgesProps) {
  if (!allergens || allergens.length === 0) {
    return null
  }

  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  }

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  const visibleAllergens = allergens.slice(0, maxVisible)
  const remainingCount = allergens.length - maxVisible

  return (
    <div className="flex flex-wrap gap-1">
      {visibleAllergens.map((allergenId) => {
        const allergen = ALLERGENS[allergenId]
        if (!allergen) return null

        const Icon = allergen.icon
        const allergenName = allergen[`name_${language}`]

        const badge = (
          <div
            className={`flex items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80 ${sizeClasses[size]}`}
          >
            <Icon className={`${iconSizeClasses[size]} ${allergen.color}`} />
          </div>
        )

        if (!showTooltip) {
          return <div key={allergenId}>{badge}</div>
        }

        return (
          <TooltipProvider key={allergenId}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">{badge}</div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${allergen.color}`} />
                  <span className="font-medium">{allergenName}</span>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      })}

      {remainingCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`flex items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground cursor-help ${sizeClasses[size]}`}
              >
                +{remainingCount}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                {allergens.slice(maxVisible).map((allergenId) => {
                  const allergen = ALLERGENS[allergenId]
                  if (!allergen) return null
                  const Icon = allergen.icon
                  return (
                    <div key={allergenId} className="flex items-center gap-2">
                      <Icon className={`h-3 w-3 ${allergen.color}`} />
                      <span className="text-sm">{allergen[`name_${language}`]}</span>
                    </div>
                  )
                })}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}
