'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ALLERGEN_LIST, type AllergenType } from '@/lib/constants/allergens'
import { AlertTriangle } from 'lucide-react'

interface AllergenLegendProps {
  language?: 'en' | 'nl' | 'es'
  compact?: boolean
  highlightAllergens?: AllergenType[]
}

export function AllergenLegend({
  language = 'en',
  compact = false,
  highlightAllergens = [],
}: AllergenLegendProps) {
  const getTitle = () => {
    switch (language) {
      case 'nl':
        return 'EU Verplichte Allergenen'
      case 'es':
        return 'Alérgenos Obligatorios de la UE'
      default:
        return 'EU Mandatory Allergens'
    }
  }

  const getDescription = () => {
    switch (language) {
      case 'nl':
        return 'Alle gerechten zijn gelabeld met allergenen volgens EU Verordening 1169/2011. Raadpleeg uw ober bij vragen.'
      case 'es':
        return 'Todos los platos están etiquetados con alérgenos según el Reglamento UE 1169/2011. Consulte a su camarero si tiene dudas.'
      default:
        return 'All dishes are labeled with allergens per EU Regulation 1169/2011. Please consult your server if you have questions.'
    }
  }

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          {getTitle()}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {ALLERGEN_LIST.map((allergen) => {
            const Icon = allergen.icon
            const isHighlighted = highlightAllergens.includes(allergen.id)
            return (
              <div
                key={allergen.id}
                className={`flex items-center gap-2 p-2 rounded-md border transition-colors ${
                  isHighlighted
                    ? 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800'
                    : 'bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-background">
                  <Icon className={`h-4 w-4 ${allergen.color}`} />
                </div>
                <span className="text-xs font-medium truncate">
                  {allergen[`name_${language}`]}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          {getTitle()}
        </CardTitle>
        <CardDescription>{getDescription()}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ALLERGEN_LIST.map((allergen) => {
            const Icon = allergen.icon
            const isHighlighted = highlightAllergens.includes(allergen.id)
            return (
              <div
                key={allergen.id}
                className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                  isHighlighted
                    ? 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 shadow-sm'
                    : 'bg-card hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-background shadow-sm shrink-0">
                  <Icon className={`h-6 w-6 ${allergen.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base leading-tight">
                    {allergen[`name_${language}`]}
                  </p>
                  {isHighlighted && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      {language === 'en' && 'Present in this dish'}
                      {language === 'nl' && 'Aanwezig in dit gerecht'}
                      {language === 'es' && 'Presente en este plato'}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
