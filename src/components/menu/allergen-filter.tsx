'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ALLERGEN_LIST, type AllergenType } from '@/lib/constants/allergens'
import { Filter, X } from 'lucide-react'
import { useState } from 'react'

interface AllergenFilterProps {
  value: AllergenType[]
  onChange: (allergens: AllergenType[]) => void
  language?: 'en' | 'nl' | 'es'
}

export function AllergenFilter({
  value = [],
  onChange,
  language = 'en',
}: AllergenFilterProps) {
  const [open, setOpen] = useState(false)

  const toggleAllergen = (allergenId: AllergenType) => {
    const newAllergens = value.includes(allergenId)
      ? value.filter((a) => a !== allergenId)
      : [...value, allergenId]
    onChange(newAllergens)
  }

  const clearFilters = () => {
    onChange([])
  }

  const getLabel = () => {
    switch (language) {
      case 'nl':
        return 'Filter op Allergenen'
      case 'es':
        return 'Filtrar por Alérgenos'
      default:
        return 'Filter by Allergens'
    }
  }

  const getClearLabel = () => {
    switch (language) {
      case 'nl':
        return 'Wissen'
      case 'es':
        return 'Limpiar'
      default:
        return 'Clear'
    }
  }

  const getDescriptionLabel = () => {
    switch (language) {
      case 'nl':
        return 'Toon alleen gerechten zonder geselecteerde allergenen'
      case 'es':
        return 'Mostrar solo platos sin alérgenos seleccionados'
      default:
        return 'Show only dishes without selected allergens'
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            {getLabel()}
            {value.length > 0 && (
              <Badge variant="secondary" className="ml-1 rounded-full px-2">
                {value.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{getLabel()}</p>
              {value.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-auto py-1 px-2 text-xs"
                >
                  {getClearLabel()}
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {getDescriptionLabel()}
            </p>

            <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
              {ALLERGEN_LIST.map((allergen) => {
                const Icon = allergen.icon
                const isSelected = value.includes(allergen.id)
                return (
                  <Button
                    key={allergen.id}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    className="justify-start h-auto py-2 px-3"
                    onClick={() => toggleAllergen(allergen.id)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isSelected ? 'text-white' : allergen.color
                        }`}
                      />
                      <span className="text-xs flex-1 text-left truncate">
                        {allergen[`name_${language}`]}
                      </span>
                    </div>
                  </Button>
                )
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filter Badges */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.slice(0, 3).map((allergenId) => {
            const allergen = ALLERGEN_LIST.find((a) => a.id === allergenId)
            if (!allergen) return null
            const Icon = allergen.icon
            return (
              <Badge
                key={allergenId}
                variant="secondary"
                className="gap-1 pl-1.5 pr-1"
              >
                <Icon className={`h-3 w-3 ${allergen.color}`} />
                <span className="text-xs">{allergen[`name_${language}`]}</span>
                <button
                  onClick={() => toggleAllergen(allergenId)}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
          {value.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{value.length - 3}
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
