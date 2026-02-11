'use client'

import { useState, useMemo } from 'react'
import { AllergenLegend } from './allergen-legend'
import { AllergenFilter } from './allergen-filter'
import { type AllergenType, ALLERGENS } from '@/lib/constants/allergens'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Search, UtensilsCrossed, Download, FileJson, FileSpreadsheet } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTranslations } from 'next-intl'

interface MenuItem {
  id: string
  category_id: string
  category_name_en?: string
  category_name_nl?: string
  category_name_es?: string
  name_en: string
  name_nl?: string
  name_es?: string
  allergens?: AllergenType[]
  price: number
}

interface Category {
  id: string
  name_en: string
  name_nl?: string
  name_es?: string
}

interface AllergenInfoClientProps {
  initialItems: MenuItem[]
  categories: Category[]
}

export function AllergenInfoClient({
  initialItems,
  categories,
}: AllergenInfoClientProps) {
  const [language, setLanguage] = useState<'en' | 'nl' | 'es'>('en')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [allergenFilter, setAllergenFilter] = useState<AllergenType[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const t = useTranslations('menu')

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(`/api/menu/allergens/export?format=${format}&language=${language}`)

      if (!response.ok) {
        throw new Error('Export failed')
      }

      if (format === 'csv') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `allergen-information-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `allergen-information-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Export error:', error)
      alert(t('allergens.exportFailed'))
    }
  }

  const getTranslation = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      title: {
        en: 'Allergen Information',
        nl: 'Allergenen Informatie',
        es: 'Información de Alérgenos',
      },
      subtitle: {
        en: 'Complete allergen information for all menu items at GrandCafe Cheers Mallorca. EU Regulation 1169/2011 compliant.',
        nl: 'Volledige allergeneninformatie voor alle menu-items bij GrandCafe Cheers Mallorca. Conform EU-verordening 1169/2011.',
        es: 'Información completa de alérgenos para todos los elementos del menú en GrandCafe Cheers Mallorca. Cumple con el Reglamento UE 1169/2011.',
      },
      language: {
        en: 'Language',
        nl: 'Taal',
        es: 'Idioma',
      },
      category: {
        en: 'Category',
        nl: 'Categorie',
        es: 'Categoría',
      },
      allCategories: {
        en: 'All Categories',
        nl: 'Alle Categorieën',
        es: 'Todas las Categorías',
      },
      searchPlaceholder: {
        en: 'Search menu items...',
        nl: 'Zoek menu-items...',
        es: 'Buscar artículos del menú...',
      },
      menuItemsTable: {
        en: 'Menu Items & Allergens',
        nl: 'Menu-items & Allergenen',
        es: 'Artículos del Menú y Alérgenos',
      },
      tableDescription: {
        en: 'Filter and search through all menu items to find allergen information',
        nl: 'Filter en zoek door alle menu-items om allergeneninformatie te vinden',
        es: 'Filtre y busque en todos los artículos del menú para encontrar información de alérgenos',
      },
      itemName: {
        en: 'Item Name',
        nl: 'Naam',
        es: 'Nombre',
      },
      categoryHeader: {
        en: 'Category',
        nl: 'Categorie',
        es: 'Categoría',
      },
      allergens: {
        en: 'Allergens',
        nl: 'Allergenen',
        es: 'Alérgenos',
      },
      price: {
        en: 'Price',
        nl: 'Prijs',
        es: 'Precio',
      },
      noAllergens: {
        en: 'None',
        nl: 'Geen',
        es: 'Ninguno',
      },
      noItems: {
        en: 'No items match your filters.',
        nl: 'Geen items komen overeen met uw filters.',
        es: 'Ningún artículo coincide con sus filtros.',
      },
      itemsFound: {
        en: 'items found',
        nl: 'items gevonden',
        es: 'artículos encontrados',
      },
    }
    return translations[key]?.[language] || translations[key]?.en || key
  }

  // Filter and search logic
  const filteredItems = useMemo(() => {
    let filtered = initialItems

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((item) => item.category_id === selectedCategory)
    }

    // Filter by allergens (exclude items that contain selected allergens)
    if (allergenFilter.length > 0) {
      filtered = filtered.filter((item) => {
        const itemAllergens = item.allergens || []
        return !allergenFilter.some((allergen) => itemAllergens.includes(allergen))
      })
    }

    // Search by name
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((item) => {
        const name = item[`name_${language}`] || item.name_en
        return name.toLowerCase().includes(query)
      })
    }

    return filtered
  }, [initialItems, selectedCategory, allergenFilter, searchQuery, language])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {getTranslation('title')}
              </h1>
              <p className="text-muted-foreground mt-1">
                {getTranslation('subtitle')}
              </p>
            </div>
          </div>

          {/* Export Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                {t('allergens.export')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('json')}>
                <FileJson className="mr-2 h-4 w-4" />
                {t('allergens.exportJson')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {t('allergens.exportCsv')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Allergen Legend */}
      <AllergenLegend language={language} />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5" />
            {getTranslation('menuItemsTable')}
          </CardTitle>
          <CardDescription>{getTranslation('tableDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Language Selector */}
            <Select value={language} onValueChange={(v) => setLanguage(v as 'en' | 'nl' | 'es')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">🇬🇧 English</SelectItem>
                <SelectItem value="nl">🇳🇱 Nederlands</SelectItem>
                <SelectItem value="es">🇪🇸 Español</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{getTranslation('allCategories')}</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category[`name_${language}`] || category.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={getTranslation('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Allergen Filter */}
          <div className="flex items-center justify-between">
            <AllergenFilter
              value={allergenFilter}
              onChange={setAllergenFilter}
              language={language}
            />
            <p className="text-sm text-muted-foreground">
              {filteredItems.length} {getTranslation('itemsFound')}
            </p>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{getTranslation('itemName')}</TableHead>
                  <TableHead>{getTranslation('categoryHeader')}</TableHead>
                  <TableHead>{getTranslation('allergens')}</TableHead>
                  <TableHead className="text-right">{getTranslation('price')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {getTranslation('noItems')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => {
                    const name = item[`name_${language}`] || item.name_en
                    const categoryName =
                      item[`category_name_${language}`] || item.category_name_en
                    const allergens = item.allergens || []

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{categoryName}</Badge>
                        </TableCell>
                        <TableCell>
                          {allergens.length === 0 ? (
                            <span className="text-sm text-muted-foreground">
                              {getTranslation('noAllergens')}
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {allergens.map((allergenId) => {
                                const allergen = ALLERGENS[allergenId]
                                if (!allergen) return null
                                const Icon = allergen.icon
                                return (
                                  <div
                                    key={allergenId}
                                    className="flex items-center justify-center w-6 h-6 rounded-full bg-muted"
                                    title={allergen[`name_${language}`]}
                                  >
                                    <Icon className={`h-3.5 w-3.5 ${allergen.color}`} />
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          €{item.price.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
