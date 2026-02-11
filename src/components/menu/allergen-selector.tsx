'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ALLERGEN_LIST, type AllergenType } from '@/lib/constants/allergens'
import { Check, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { useTranslations } from 'next-intl'

interface AllergenSelectorProps {
  value: AllergenType[]
  onChange: (allergens: AllergenType[]) => void
  language?: 'en' | 'nl' | 'es'
}

export function AllergenSelector({
  value = [],
  onChange,
  language = 'en',
}: AllergenSelectorProps) {
  const [open, setOpen] = useState(false)
  const t = useTranslations('menu')

  const toggleAllergen = (allergenId: AllergenType) => {
    const newAllergens = value.includes(allergenId)
      ? value.filter((a) => a !== allergenId)
      : [...value, allergenId]
    onChange(newAllergens)
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        {t('builder.allergens')} {t('allergens.selected', { count: value.length })}
      </Label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start h-auto min-h-[40px] py-2"
          >
            {value.length === 0 ? (
              <span className="text-muted-foreground">{t('allergens.selectAllergens')}</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {value.map((allergenId) => {
                  const allergen = ALLERGEN_LIST.find((a) => a.id === allergenId)
                  if (!allergen) return null
                  const Icon = allergen.icon
                  return (
                    <Badge
                      key={allergenId}
                      variant="secondary"
                      className="gap-1 px-2 py-1"
                    >
                      <Icon className={`h-3 w-3 ${allergen.color}`} />
                      {allergen[`name_${language}`]}
                    </Badge>
                  )
                })}
              </div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="start">
          <div className="space-y-1">
            <p className="text-sm font-medium mb-2">{t('allergens.euMandatory')}</p>
            <div className="grid grid-cols-2 gap-2">
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
                      <Icon className={`h-4 w-4 ${isSelected ? 'text-white' : allergen.color}`} />
                      <span className="text-xs flex-1 text-left">
                        {allergen[`name_${language}`]}
                      </span>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                  </Button>
                )
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t('allergens.allergensDisplayed')}
        </p>
      )}
    </div>
  )
}
