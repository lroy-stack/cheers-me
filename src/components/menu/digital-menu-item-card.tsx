'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ALLERGENS, type AllergenType } from '@/lib/constants/allergens'
import { Euro, Clock, UtensilsCrossed } from 'lucide-react'
import Image from 'next/image'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet'
import { motion } from 'framer-motion'

export interface DigitalMenuItem {
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
  allergens?: AllergenType[]
  // Cocktail fields (optional, present when item is a cocktail)
  glass_type?: string
  preparation_method?: string
  difficulty_level?: string
  base_spirit?: string
  garnish?: string
  flavor_profiles?: string[]
  is_signature?: boolean
}

interface DigitalMenuItemCardProps {
  item: DigitalMenuItem
  language: 'en' | 'nl' | 'es' | 'de'
}

const i18n = {
  description: { en: 'Description', nl: 'Beschrijving', es: 'Descripcion', de: 'Beschreibung' },
  containsAllergens: { en: 'Contains Allergens', nl: 'Bevat Allergenen', es: 'Contiene Alergenos', de: 'Enthalt Allergene' },
  prepTime: { en: 'Preparation time', nl: 'Bereidingstijd', es: 'Tiempo de preparacion', de: 'Zubereitungszeit' },
  minutes: { en: 'minutes', nl: 'minuten', es: 'minutos', de: 'Minuten' },
  backToMenu: { en: 'Back to menu', nl: 'Terug naar menu', es: 'Volver al menu', de: 'Zuruck zum Menu' },
  price: { en: 'Price', nl: 'Prijs', es: 'Precio', de: 'Preis' },
} as const

export function DigitalMenuItemCard({
  item,
  language,
}: DigitalMenuItemCardProps) {
  const name = item[`name_${language}`] || item.name_en
  const description = item[`description_${language}`] || item.description_en
  const categoryName = item[`category_name_${language}`] || item.category_name_en
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <Card className="group cursor-pointer overflow-hidden rounded-xl transition-all hover:shadow-xl hover:scale-[1.02] border border-border/50">
            <CardContent className="p-0">
              {/* Square Image */}
              <div className="relative aspect-square overflow-hidden">
                {item.photo_url ? (
                  <Image
                    src={item.photo_url}
                    alt={name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/15 via-accent/10 to-primary/10 dark:from-primary/20 dark:via-accent/15 dark:to-primary/15">
                    <UtensilsCrossed className="h-12 w-12 text-primary dark:text-primary opacity-60" />
                  </div>
                )}

                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                {/* Price badge at top-right */}
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-0.5 shadow-sm">
                  <Euro className="h-3 w-3 text-primary" />
                  <span className="font-bold text-xs text-foreground">
                    {item.price.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Compact Content Below Image */}
              <div className="p-2 space-y-1">
                {/* Name */}
                <h3 className="text-xs font-semibold leading-tight line-clamp-2">
                  {name}
                </h3>

                {/* Allergen dots */}
                {item.allergens && item.allergens.length > 0 && (
                  <div className="flex items-center gap-1">
                    {item.allergens.slice(0, 4).map((allergenId) => {
                      const allergen = ALLERGENS[allergenId]
                      if (!allergen) return null
                      const Icon = allergen.icon
                      return (
                        <div
                          key={allergenId}
                          className="flex items-center justify-center w-4 h-4 rounded-full bg-muted/80"
                          title={allergen[`name_${language}`]}
                        >
                          <Icon className={`h-2.5 w-2.5 ${allergen.color}`} />
                        </div>
                      )
                    })}
                    {item.allergens.length > 4 && (
                      <div className="flex items-center justify-center w-4 h-4 rounded-full bg-muted/80 text-[8px] font-semibold text-muted-foreground">
                        +{item.allergens.length - 4}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </SheetTrigger>

      {/* Detail Sheet (bottom) */}
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-2xl px-0 pb-0"
      >
        {/* Drag handle visual */}
        <div className="flex justify-center pt-2 pb-4">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <SheetHeader className="sr-only">
          <SheetTitle>{name}</SheetTitle>
          <SheetDescription>
            {categoryName || ''}
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 space-y-6 pb-8">
          {/* Large Image */}
          {item.photo_url ? (
            <div className="relative w-full h-64 rounded-2xl overflow-hidden">
              <Image
                src={item.photo_url}
                alt={name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          ) : (
            <div className="relative w-full h-64 rounded-2xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-primary/15 via-accent/10 to-primary/10 dark:from-primary/20 dark:via-accent/15 dark:to-primary/15">
              <UtensilsCrossed className="h-24 w-24 text-primary dark:text-primary opacity-40" />
            </div>
          )}

          {/* Category Badge */}
          {categoryName && (
            <Badge variant="secondary" className="text-xs font-medium">
              {categoryName}
            </Badge>
          )}

          {/* Name as large title */}
          <h2 className="text-2xl font-bold tracking-tight">{name}</h2>

          {/* Price */}
          <div className="flex items-center gap-2">
            <Euro className="h-7 w-7 text-primary" />
            <span className="text-3xl font-bold text-primary">
              {item.price.toFixed(2)}
            </span>
          </div>

          {/* Description */}
          {description && (
            <p className="text-base text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}

          {/* Allergens as colored badges */}
          {item.allergens && item.allergens.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {i18n.containsAllergens[language]}
              </h4>
              <div className="flex flex-wrap gap-2">
                {item.allergens.map((allergenId) => {
                  const allergen = ALLERGENS[allergenId]
                  if (!allergen) return null
                  const Icon = allergen.icon
                  return (
                    <Badge
                      key={allergenId}
                      variant="outline"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full"
                    >
                      <Icon className={`h-4 w-4 ${allergen.color}`} />
                      {allergen[`name_${language}`]}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}

          {/* Prep Time */}
          {item.prep_time_minutes && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {i18n.prepTime[language]}: ~{item.prep_time_minutes} {i18n.minutes[language]}
              </span>
            </div>
          )}

          {/* Back to menu button */}
          <Button
            variant="outline"
            className="w-full mt-4 rounded-xl h-12 text-base"
            onClick={() => setOpen(false)}
          >
            {i18n.backToMenu[language]}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
