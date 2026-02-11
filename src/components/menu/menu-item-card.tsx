'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ALLERGENS, type AllergenType } from '@/lib/constants/allergens'
import {
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Clock,
  Euro,
  TrendingUp,
} from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'

export interface MenuItem {
  id: string
  category_id: string
  name_en: string
  name_nl?: string
  name_es?: string
  description_en?: string
  description_nl?: string
  description_es?: string
  price: number
  cost_of_goods?: number
  photo_url?: string
  prep_time_minutes?: number
  available: boolean
  sort_order: number
  allergens?: AllergenType[]
  category?: {
    id: string
    name_en: string
    name_nl?: string
    name_es?: string
  }
}

interface MenuItemCardProps {
  item: MenuItem
  onEdit: (item: MenuItem) => void
  onDelete: (item: MenuItem) => void
  onDuplicate: (item: MenuItem) => void
  onToggleAvailability: (item: MenuItem) => void
  language?: 'en' | 'nl' | 'es'
  compact?: boolean
}

export function MenuItemCard({
  item,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleAvailability,
  language = 'en',
  compact = false,
}: MenuItemCardProps) {
  const t = useTranslations('menu')
  const name = item[`name_${language}`] || item.name_en
  const description = item[`description_${language}`] || item.description_en

  const margin =
    item.price && item.cost_of_goods
      ? (((item.price - item.cost_of_goods) / item.price) * 100).toFixed(0)
      : null

  const marginColor =
    margin && parseInt(margin) >= 70
      ? 'text-green-600'
      : margin && parseInt(margin) >= 50
      ? 'text-primary'
      : 'text-red-600'

  const actionsMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={compact ? 'h-7 w-7' : 'h-8 w-8 bg-background/80 backdrop-blur-sm'}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(item)}>
          <Edit className="mr-2 h-4 w-4" />
          {t('items.edit')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDuplicate(item)}>
          <Copy className="mr-2 h-4 w-4" />
          {t('items.duplicate')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onToggleAvailability(item)}>
          {item.available ? (
            <>
              <EyeOff className="mr-2 h-4 w-4" />
              {t('items.markUnavailable')}
            </>
          ) : (
            <>
              <Eye className="mr-2 h-4 w-4" />
              {t('items.markAvailable')}
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(item)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t('items.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  // ─── Compact list row ───
  if (compact) {
    return (
      <div
        className={`group flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors ${
          !item.available ? 'opacity-50' : ''
        }`}
      >
        {/* Thumbnail */}
        <div className="relative h-9 w-9 rounded bg-muted overflow-hidden shrink-0">
          {item.photo_url ? (
            <Image
              src={item.photo_url}
              alt={name}
              fill
              className="object-cover"
              sizes="36px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
              🍽️
            </div>
          )}
        </div>

        {/* Name + category */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{name}</div>
          {item.category && (
            <div className="text-[11px] text-muted-foreground truncate">
              {item.category[`name_${language}`] || item.category.name_en}
            </div>
          )}
        </div>

        {/* Availability badge */}
        {!item.available && (
          <Badge variant="destructive" className="text-[10px] h-5 px-1.5 shrink-0">
            <EyeOff className="h-2.5 w-2.5 mr-0.5" />
            Off
          </Badge>
        )}

        {/* Prep time */}
        {item.prep_time_minutes && (
          <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-0.5 shrink-0">
            <Clock className="h-3 w-3" />
            {item.prep_time_minutes}m
          </span>
        )}

        {/* Allergen count */}
        {item.allergens && item.allergens.length > 0 && (
          <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 hidden md:inline shrink-0">
            {item.allergens.length} allergens
          </span>
        )}

        {/* Margin */}
        {margin && (
          <span className={`text-xs font-medium hidden lg:flex items-center gap-0.5 shrink-0 ${marginColor}`}>
            <TrendingUp className="h-3 w-3" />
            {margin}%
          </span>
        )}

        {/* Price */}
        <span className="text-sm font-semibold text-primary flex items-center gap-0.5 shrink-0">
          <Euro className="h-3 w-3" />
          {item.price.toFixed(2)}
        </span>

        {/* Actions */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {actionsMenu}
        </div>
      </div>
    )
  }

  // ─── Full grid card ───
  return (
    <Card
      className={`group relative overflow-hidden transition-all hover:shadow-lg ${
        !item.available ? 'opacity-60' : ''
      }`}
    >
      <CardContent className="p-0">
        {/* Image */}
        <div className="relative h-48 bg-muted overflow-hidden">
          {item.photo_url ? (
            <Image
              src={item.photo_url}
              alt={name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <span className="text-4xl">🍽️</span>
            </div>
          )}

          {/* Availability Badge */}
          {!item.available && (
            <div className="absolute top-2 left-2">
              <Badge variant="destructive" className="gap-1">
                <EyeOff className="h-3 w-3" />
                {t('items.unavailable')}
              </Badge>
            </div>
          )}

          {/* Actions Menu */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {actionsMenu}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Title & Price */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg leading-tight truncate">
                {name}
              </h3>
              {item.category && (
                <p className="text-xs text-muted-foreground">
                  {item.category[`name_${language}`] || item.category.name_en}
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="font-bold text-lg text-primary flex items-center gap-1">
                <Euro className="h-4 w-4" />
                {item.price.toFixed(2)}
              </div>
              {margin && (
                <div className={`text-xs font-medium flex items-center gap-1 justify-end ${marginColor}`}>
                  <TrendingUp className="h-3 w-3" />
                  {margin}%
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}

          {/* Meta Info */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {item.prep_time_minutes && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {item.prep_time_minutes}min
              </div>
            )}
            {item.cost_of_goods && (
              <div className="flex items-center gap-1">
                {t('items.costLabel', { amount: item.cost_of_goods.toFixed(2) })}
              </div>
            )}
          </div>

          {/* Allergens */}
          {item.allergens && item.allergens.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2 border-t">
              {item.allergens.slice(0, 6).map((allergenId) => {
                const allergen = ALLERGENS[allergenId]
                if (!allergen) return null
                const Icon = allergen.icon
                return (
                  <div
                    key={allergenId}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs"
                    title={allergen[`name_${language}`]}
                  >
                    <Icon className={`h-3 w-3 ${allergen.color}`} />
                  </div>
                )
              })}
              {item.allergens.length > 6 && (
                <div className="flex items-center px-2 py-1 rounded-md bg-muted text-xs text-muted-foreground">
                  +{item.allergens.length - 6}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
