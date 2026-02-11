'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Euro } from 'lucide-react'
import Image from 'next/image'
import { GlassTypeIcon } from './glass-type-icon'
import { FlavorProfileBadges } from './flavor-profile-badge'
import { CocktailDetailDialog } from './cocktail-detail-dialog'
import type { GlassType, PreparationMethod, DifficultyLevel, FlavorProfile } from '@/types'

export interface CocktailMenuItem {
  id: string
  category_id: string
  category_name_en?: string
  category_name_nl?: string
  category_name_es?: string
  category_name_de?: string
  name_en: string
  name_nl?: string
  name_es?: string
  name_de?: string
  description_en?: string
  description_nl?: string
  description_es?: string
  description_de?: string
  price: number
  photo_url?: string
  prep_time_minutes?: number
  glass_type?: GlassType
  preparation_method?: PreparationMethod
  difficulty_level?: DifficultyLevel
  base_spirit?: string
  garnish?: string
  flavor_profiles?: FlavorProfile[]
  is_signature?: boolean
  ingredients?: Array<{
    name: string
    quantity: number
    unit: string
    is_garnish: boolean
    is_optional: boolean
  }>
  steps?: Array<{
    step_number: number
    instruction_en: string
    instruction_nl?: string
    instruction_es?: string
    instruction_de?: string
    duration_seconds?: number
    tip?: string
  }>
}

interface CocktailCardProps {
  item: CocktailMenuItem
  language: 'en' | 'nl' | 'es' | 'de'
  canEdit?: boolean
  showCosts?: boolean
  onEditMetadata?: () => void
  onEditIngredients?: () => void
  onEditSteps?: () => void
}

const DIFFICULTY_DOTS: Record<DifficultyLevel, number> = {
  easy: 1,
  medium: 2,
  advanced: 3,
}

export function CocktailCard({
  item,
  language,
  canEdit = false,
  showCosts = false,
  onEditMetadata,
  onEditIngredients,
  onEditSteps,
}: CocktailCardProps) {
  const name = item[`name_${language}`] || item.name_en

  return (
    <CocktailDetailDialog
      item={item}
      language={language}
      canEdit={canEdit}
      showCosts={showCosts}
      onEditMetadata={onEditMetadata}
      onEditIngredients={onEditIngredients}
      onEditSteps={onEditSteps}
    >
      <Card className={`group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02] relative ${
        item.is_signature ? 'ring-2 ring-primary dark:ring-primary' : ''
      }`}>
        {/* Signature ribbon */}
        {item.is_signature && (
          <div className="absolute top-1.5 right-1.5 z-10">
            <Badge className="bg-primary text-white hover:bg-primary/90 shadow-md text-[8px] h-4 px-1.5">
              Signature
            </Badge>
          </div>
        )}

        <CardContent className="p-0">
          {/* Square image */}
          <div className="relative aspect-square overflow-hidden">
            {item.photo_url ? (
              <>
                <Image
                  src={item.photo_url}
                  alt={name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/15 dark:from-primary/20 dark:to-accent/25 flex items-center justify-center">
                {item.glass_type && (
                  <GlassTypeIcon glassType={item.glass_type} size="lg" />
                )}
              </div>
            )}

            {/* Price badge at top-left */}
            <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-0.5 shadow-sm">
              <Euro className="h-3 w-3 text-primary" />
              <span className="font-bold text-xs text-foreground">
                {item.price.toFixed(2)}
              </span>
            </div>

            {/* Glass type icon at bottom-right */}
            {item.glass_type && item.photo_url && (
              <div className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-sm rounded-full p-1 shadow-sm">
                <GlassTypeIcon glassType={item.glass_type} size="sm" />
              </div>
            )}
          </div>

          {/* Compact content */}
          <div className="p-2 space-y-1">
            {/* Name */}
            <h3 className="text-xs font-semibold leading-tight line-clamp-2">
              {name}
            </h3>

            {/* Flavor badges (max 2) */}
            {item.flavor_profiles && item.flavor_profiles.length > 0 && (
              <FlavorProfileBadges flavors={item.flavor_profiles} max={2} />
            )}

            {/* Difficulty dots + method + base spirit */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {item.difficulty_level && (
                  <div className="flex items-center gap-0.5" title={item.difficulty_level}>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${
                          i < DIFFICULTY_DOTS[item.difficulty_level!]
                            ? 'bg-primary'
                            : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                )}
                {item.preparation_method && (
                  <span className="text-[9px] text-muted-foreground capitalize">{item.preparation_method}</span>
                )}
              </div>
              {item.base_spirit && (
                <span className="text-[10px] text-muted-foreground truncate ml-1">{item.base_spirit}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </CocktailDetailDialog>
  )
}
