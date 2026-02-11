'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Wine, Coffee, Sparkles, LayoutGrid, List, Euro } from 'lucide-react'
import { CocktailCard, type CocktailMenuItem } from '@/components/menu/cocktail-card'
import { CocktailDetailDialog } from '@/components/menu/cocktail-detail-dialog'
import { GlassTypeIcon } from '@/components/menu/glass-type-icon'
import { useAuth } from '@/hooks/use-auth'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const EDIT_ROLES = new Set(['admin', 'owner', 'manager', 'bar'])
const COST_ROLES = new Set(['admin', 'owner', 'manager'])

export default function RecipesPage() {
  const t = useTranslations('menu')
  const { profile } = useAuth()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'classic' | 'coffee' | 'spritz'>('all')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const { data: cocktails, isLoading, mutate } = useSWR<CocktailMenuItem[]>(
    '/api/menu/cocktails',
    fetcher
  )

  const userRole = profile?.role || 'waiter'
  const canEdit = EDIT_ROLES.has(userRole)
  const showCosts = COST_ROLES.has(userRole)

  // Detect user language from document
  const lang = (typeof document !== 'undefined'
    ? document.documentElement.lang?.split('-')[0]
    : 'en') as 'en' | 'nl' | 'es' | 'de'
  const language = ['en', 'nl', 'es', 'de'].includes(lang) ? lang : 'en'

  const filtered = (cocktails || []).filter((c) => {
    const name = c[`name_${language}`] || c.name_en
    const matchesSearch = !search || name.toLowerCase().includes(search.toLowerCase()) ||
      (c.base_spirit || '').toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'all' ||
      (filter === 'classic' && c.category_name_en === 'Classic Cocktails') ||
      (filter === 'coffee' && c.category_name_en === 'Coffee Cocktails') ||
      (filter === 'spritz' && c.category_name_en === 'Spritz & Sangria')
    return matchesSearch && matchesFilter
  })

  // Edit handlers — trigger SWR revalidation after edits
  const handleEditDone = () => { mutate() }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('recipes.title')}</h1>
        <p className="text-muted-foreground">{t('recipes.subtitle')}</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('recipes.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Badge
            variant={filter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter('all')}
          >
            {t('recipes.all')}
          </Badge>
          <Badge
            variant={filter === 'classic' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter('classic')}
          >
            <Wine className="mr-1 h-3 w-3" />
            {t('recipes.classics')}
          </Badge>
          <Badge
            variant={filter === 'coffee' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter('coffee')}
          >
            <Coffee className="mr-1 h-3 w-3" />
            {t('recipes.coffee')}
          </Badge>
          <Badge
            variant={filter === 'spritz' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter('spritz')}
          >
            <Sparkles className="mr-1 h-3 w-3" />
            {t('recipes.spritz')}
          </Badge>
        </div>
        <div className="flex gap-1">
          <Button
            variant={view === 'grid' ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setView('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setView('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className={view === 'grid' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'space-y-3'}>
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className={view === 'grid' ? 'h-48' : 'h-16'} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wine className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('recipes.noResults')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t('recipes.showing', { count: filtered.length })}
            </p>
          </div>
          {view === 'grid' ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {filtered.map((cocktail) => (
                <CocktailCard
                  key={cocktail.id}
                  item={cocktail}
                  language={language}
                  canEdit={canEdit}
                  showCosts={showCosts}
                  onEditMetadata={handleEditDone}
                  onEditIngredients={handleEditDone}
                  onEditSteps={handleEditDone}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border divide-y">
              {filtered.map((cocktail) => {
                const cName = cocktail[`name_${language}`] || cocktail.name_en
                return (
                  <CocktailDetailDialog
                    key={cocktail.id}
                    item={cocktail}
                    language={language}
                    canEdit={canEdit}
                    showCosts={showCosts}
                    onEditMetadata={handleEditDone}
                    onEditIngredients={handleEditDone}
                    onEditSteps={handleEditDone}
                  >
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors">
                      {cocktail.glass_type && (
                        <GlassTypeIcon glassType={cocktail.glass_type} size="sm" />
                      )}
                      <span className="flex-1 text-sm font-medium truncate">{cName}</span>
                      {cocktail.is_signature && (
                        <Badge className="bg-primary text-white text-[10px] h-5 px-1.5 shrink-0">Signature</Badge>
                      )}
                      {cocktail.preparation_method && (
                        <span className="text-xs text-muted-foreground capitalize hidden sm:inline shrink-0">
                          {cocktail.preparation_method}
                        </span>
                      )}
                      {cocktail.difficulty_level && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full ${
                                i < ({ easy: 1, medium: 2, advanced: 3 }[cocktail.difficulty_level!] || 0)
                                  ? 'bg-primary'
                                  : 'bg-muted'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                      {cocktail.base_spirit && (
                        <span className="text-xs text-muted-foreground hidden md:inline w-20 truncate shrink-0">
                          {cocktail.base_spirit}
                        </span>
                      )}
                      <span className="text-sm font-semibold text-primary flex items-center gap-0.5 shrink-0">
                        <Euro className="h-3 w-3" />
                        {cocktail.price.toFixed(2)}
                      </span>
                    </button>
                  </CocktailDetailDialog>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
