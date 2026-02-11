'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { DigitalMenuItemCard, type DigitalMenuItem } from './digital-menu-item-card'
import { CocktailCard, type CocktailMenuItem } from './cocktail-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { ALLERGEN_LIST } from '@/lib/constants/allergens'
import { getCategoryIcon } from '@/lib/constants/menu-categories'
import { Info, UtensilsCrossed, Star, Instagram, MapPin, Clock, TableProperties, Search } from 'lucide-react'
import Image from 'next/image'
import AdRenderer from '@/components/ads/ad-renderer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Category {
  id: string
  name_en: string
  name_nl?: string
  name_es?: string
  name_de?: string
}

interface DigitalMenuClientProps {
  initialItems: DigitalMenuItem[]
  categories: Category[]
  tableNumber?: string | null
}

// ---------------------------------------------------------------------------
// Language helpers
// ---------------------------------------------------------------------------

type Language = 'en' | 'nl' | 'es' | 'de'

interface LanguageOption {
  code: Language
  flag: string
  label: string
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', flag: '\u{1F1EC}\u{1F1E7}', label: 'EN' },
  { code: 'nl', flag: '\u{1F1F3}\u{1F1F1}', label: 'NL' },
  { code: 'es', flag: '\u{1F1EA}\u{1F1F8}', label: 'ES' },
  { code: 'de', flag: '\u{1F1E9}\u{1F1EA}', label: 'DE' },
]

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------

function getTranslation(key: string, language: Language): string {
  const translations: Record<string, Record<Language, string>> = {
    title: {
      en: 'Menu',
      nl: 'Menu',
      es: 'Men\u00FA',
      de: 'Speisekarte',
    },
    subtitle: {
      en: 'GrandCafe Cheers Mallorca',
      nl: 'GrandCafe Cheers Mallorca',
      es: 'GrandCafe Cheers Mallorca',
      de: 'GrandCafe Cheers Mallorca',
    },
    allCategories: {
      en: 'All',
      nl: 'Alles',
      es: 'Todo',
      de: 'Alle',
    },
    allergenInfo: {
      en: 'Allergen Information',
      nl: 'Allergenen Informatie',
      es: 'Informaci\u00F3n de Al\u00E9rgenos',
      de: 'Allergen-Informationen',
    },
    allergenDescription: {
      en: 'We list all EU mandatory allergens. Please inform your server if you have any allergies.',
      nl: 'We vermelden alle EU verplichte allergenen. Vertel uw ober als u allergie\u00EBn heeft.',
      es: 'Listamos todos los al\u00E9rgenos obligatorios de la UE. Informe a su camarero si tiene alergias.',
      de: 'Wir listen alle EU-Pflichtallergene auf. Bitte informieren Sie Ihren Kellner \u00FCber Allergien.',
    },
    noItems: {
      en: 'No items available in this category.',
      nl: 'Geen items beschikbaar in deze categorie.',
      es: 'No hay art\u00EDculos disponibles en esta categor\u00EDa.',
      de: 'Keine Artikel in dieser Kategorie verf\u00FCgbar.',
    },
    signatureTitle: {
      en: 'Signature Cocktails',
      nl: 'Signature Cocktails',
      es: 'C\u00F3cteles Estrella',
      de: 'Signature Cocktails',
    },
    table: {
      en: 'Table',
      nl: 'Tafel',
      es: 'Mesa',
      de: 'Tisch',
    },
    openingHours: {
      en: 'Mon-Sun: 10:30 - 03:00',
      nl: 'Ma-Zo: 10:30 - 03:00',
      es: 'Lun-Dom: 10:30 - 03:00',
      de: 'Mo-So: 10:30 - 03:00',
    },
    searchPlaceholder: {
      en: 'Search menu...',
      nl: 'Zoek in menu...',
      es: 'Buscar en el men\u00FA...',
      de: 'Speisekarte durchsuchen...',
    },
    noSearchResults: {
      en: 'No items match your search.',
      nl: 'Geen items gevonden.',
      es: 'No se encontraron resultados.',
      de: 'Keine Ergebnisse gefunden.',
    },
  }
  return translations[key]?.[language] || translations[key]?.en || key
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.03 },
  },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DigitalMenuClient({
  initialItems,
  categories,
  tableNumber,
}: DigitalMenuClientProps) {
  const [language, setLanguage] = useState<Language>('en')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [headerHeight, setHeaderHeight] = useState(52)
  const headerRef = useRef<HTMLElement>(null)
  const categoryScrollRef = useRef<HTMLDivElement>(null)

  // Dynamically measure header height with ResizeObserver
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setHeaderHeight(entry.contentRect.height)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Scroll active category button into view
  useEffect(() => {
    if (!categoryScrollRef.current) return
    const container = categoryScrollRef.current
    const activeButton = container.querySelector<HTMLElement>('[data-active="true"]')
    if (activeButton) {
      const containerRect = container.getBoundingClientRect()
      const buttonRect = activeButton.getBoundingClientRect()
      const scrollLeft =
        activeButton.offsetLeft - containerRect.width / 2 + buttonRect.width / 2
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' })
    }
  }, [selectedCategory])

  // Filter items by category + search
  const filteredItems = useMemo(() => {
    let items = initialItems
    if (selectedCategory !== 'all') {
      items = items.filter((item) => item.category_id === selectedCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      items = items.filter((item) => {
        const name = (item[`name_${language}`] || item.name_en || '').toLowerCase()
        const desc = (item[`description_${language}`] || item.description_en || '').toLowerCase()
        return name.includes(q) || desc.includes(q)
      })
    }
    return items
  }, [initialItems, selectedCategory, searchQuery, language])

  // Group items by category for display
  const groupedItems = useMemo(() => {
    const groups = new Map<string, DigitalMenuItem[]>()
    filteredItems.forEach((item) => {
      const categoryName =
        item[`category_name_${language}`] || item.category_name_en || 'Other'
      if (!groups.has(categoryName)) {
        groups.set(categoryName, [])
      }
      groups.get(categoryName)?.push(item)
    })
    return Array.from(groups.entries())
  }, [filteredItems, language])

  // Signature cocktails
  const signatureItems = useMemo(() => {
    const items = initialItems.filter(
      (item) => (item as DigitalMenuItem & { is_signature?: boolean }).is_signature
    )
    if (items.length === 0) return []
    if (
      selectedCategory !== 'all' &&
      !items.some((s) => s.category_id === selectedCategory)
    )
      return []
    return items
  }, [initialItems, selectedCategory])

  // Resolve the category name in current language
  const getCategoryLabel = (cat: Category): string =>
    cat[`name_${language}`] || cat.name_en

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-muted/20 dark:from-primary/10 dark:via-background dark:to-muted/10">
      {/* ---------------------------------------------------------------- */}
      {/* Header (single row: logo + title + table + flags + allergen)    */}
      {/* ---------------------------------------------------------------- */}
      <header ref={headerRef} className="sticky top-0 z-50 w-full border-b border-primary/20/60 dark:border-primary/40 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/15 dark:from-primary/20 dark:via-accent/15 dark:to-primary/20 backdrop-blur-md">
        <div className="container mx-auto px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            {/* Left: Logo + title + table badge */}
            <div className="flex items-center gap-2 min-w-0">
              <Image
                src="/icons/logoheader.png"
                alt="GrandCafe Cheers Mallorca"
                width={36}
                height={36}
                className="rounded-lg shadow-sm shrink-0"
              />
              <span className="font-bold text-sm leading-tight tracking-tight text-primary truncate">
                GrandCafe Cheers
              </span>
              {tableNumber && (
                <Badge className="bg-primary text-white hover:bg-primary/80 shadow-sm shrink-0 gap-1 px-2 py-0.5 text-xs font-semibold">
                  <TableProperties className="h-3 w-3" />
                  {getTranslation('table', language)} {tableNumber}
                </Badge>
              )}
            </div>

            {/* Right: Language flags + allergen info button */}
            <div className="flex items-center gap-1.5 shrink-0">
              {LANGUAGES.map((lang) => {
                const isActive = language === lang.code
                return (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`
                      w-7 h-7 rounded-full flex items-center justify-center text-sm
                      transition-all duration-200 cursor-pointer
                      ${
                        isActive
                          ? 'ring-2 ring-primary ring-offset-1 scale-110 bg-white/80 dark:bg-black/30 shadow-md'
                          : 'bg-white/40 dark:bg-black/10 hover:bg-white/70 dark:hover:bg-black/20'
                      }
                    `}
                    aria-label={lang.label}
                  >
                    {lang.flag}
                  </button>
                )
              })}

              {/* Allergen info button */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 h-8 w-8 border-primary/30 bg-white/60 dark:bg-black/20 hover:bg-card dark:hover:bg-black/40"
                  >
                    <Info className="h-4 w-4 text-primary" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="overflow-y-auto p-0">
                  {/* Gradient header */}
                  <div className="bg-gradient-to-br from-primary/15 via-accent/10 to-primary/10 dark:from-primary/25 dark:via-accent/15 dark:to-primary/15 px-6 pt-8 pb-6">
                    <SheetHeader>
                      <SheetTitle className="text-xl font-bold tracking-tight text-primary">
                        {getTranslation('allergenInfo', language)}
                      </SheetTitle>
                      <SheetDescription className="text-sm leading-relaxed mt-2">
                        {getTranslation('allergenDescription', language)}
                      </SheetDescription>
                    </SheetHeader>
                  </div>

                  {/* Allergen list */}
                  <div className="px-4 py-4 space-y-2">
                    {ALLERGEN_LIST.map((allergen, idx) => {
                      const Icon = allergen.icon
                      return (
                        <div key={allergen.id}>
                          <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                            <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/20 shadow-sm`}>
                              <Icon className={`h-6 w-6 ${allergen.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-sm block">
                                {allergen[`name_${language}`]}
                              </span>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                {allergen.id}
                              </span>
                            </div>
                          </div>
                          {idx < ALLERGEN_LIST.length - 1 && (
                            <div className="h-px bg-border/50 mx-3" />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* EU regulation footer */}
                  <div className="px-6 py-4 border-t border-border bg-muted/30">
                    <p className="text-[10px] text-muted-foreground leading-relaxed text-center">
                      EU Regulation 1169/2011 &middot; 14 mandatory allergens
                    </p>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Ad: Top Banner */}
      <div className="container mx-auto px-4 pt-2">
        <AdRenderer page="digital_menu" placement="banner_top" lang={language} />
      </div>

      {/* Ad: Fullscreen Overlay (1x per session) */}
      <AdRenderer page="digital_menu" placement="fullscreen_overlay" lang={language} />

      {/* ---------------------------------------------------------------- */}
      {/* Search + Category Filter (sticky combined)                      */}
      {/* ---------------------------------------------------------------- */}
      <div className="sticky z-40 w-full border-b border-primary/20/40 dark:border-primary/30 bg-white/90 dark:bg-background/90 backdrop-blur-md" style={{ top: headerHeight }}>
        <div className="container mx-auto px-3 py-2 space-y-2">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={getTranslation('searchPlaceholder', language)}
              className="w-full rounded-full border border-border bg-background pl-9 pr-4 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
            />
          </div>

          {/* Category pills */}
          <div
            ref={categoryScrollRef}
            className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {/* "All" button */}
            <button
              data-active={selectedCategory === 'all'}
              onClick={() => setSelectedCategory('all')}
              className={`
                relative shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium
                transition-colors duration-200 cursor-pointer
                ${
                  selectedCategory === 'all'
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                }
              `}
              style={{ scrollSnapAlign: 'start' }}
            >
              <UtensilsCrossed className="h-3 w-3" />
              {getTranslation('allCategories', language)}
              {selectedCategory === 'all' && (
                <motion.div
                  layoutId="category-underline"
                  className="absolute -bottom-1 left-2 right-2 h-0.5 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>

            {categories.map((category) => {
              const isActive = selectedCategory === category.id
              const CategoryIcon = getCategoryIcon(category.name_en)
              return (
                <button
                  key={category.id}
                  data-active={isActive}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`
                    relative shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium
                    transition-colors duration-200 cursor-pointer
                    ${
                      isActive
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                    }
                  `}
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <CategoryIcon className="h-3 w-3" />
                  {getCategoryLabel(category)}
                  {isActive && (
                    <motion.div
                      layoutId="category-underline"
                      className="absolute -bottom-1 left-2 right-2 h-0.5 rounded-full bg-primary"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Signature Cocktails                                             */}
      {/* ---------------------------------------------------------------- */}
      {signatureItems.length > 0 && !searchQuery.trim() && (
        <section className="container mx-auto px-4 pt-6">
          <div className="rounded-2xl border border-primary/20/60 dark:border-primary/40 overflow-hidden">
            {/* Glass morphism container */}
            <div className="bg-gradient-to-r from-primary/10 via-accent/8 to-destructive/5 dark:from-primary/15 dark:via-accent/10 dark:to-destructive/8 backdrop-blur-sm p-4 md:p-6 space-y-4">
              {/* Title */}
              <div className="flex items-center justify-center gap-2">
                <Star className="h-4 w-4 text-primary fill-primary" />
                <h2 className="text-lg font-bold text-primary tracking-tight">
                  {getTranslation('signatureTitle', language)}
                </h2>
                <Star className="h-4 w-4 text-primary fill-primary" />
              </div>

              {/* Glass morphism card wrapper */}
              <div className="rounded-xl backdrop-blur-sm bg-white/30 dark:bg-black/20 p-3 md:p-4">
                <motion.div
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4"
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-40px' }}
                >
                  {signatureItems.map((item) => (
                    <motion.div key={item.id} variants={fadeInUp}>
                      <CocktailCard
                        item={item as CocktailMenuItem}
                        language={language}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Menu Items                                                      */}
      {/* ---------------------------------------------------------------- */}
      <main className="container mx-auto px-4 py-6">
        {groupedItems.length === 0 ? (
          <div className="text-center py-16">
            <UtensilsCrossed className="h-14 w-14 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-lg">
              {searchQuery.trim()
                ? getTranslation('noSearchResults', language)
                : getTranslation('noItems', language)}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedItems.map(([categoryName, items], catIdx) => (
              <section key={categoryName} className="space-y-4">
                {/* Section header: gold line - title - gold line */}
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-primary/80/60" />
                  <h2 className="text-lg md:text-xl font-bold text-center whitespace-nowrap text-foreground/90">
                    {categoryName}
                  </h2>
                  <div className="h-px flex-1 bg-primary/80/60" />
                </div>

                {/* Items grid with staggered animation */}
                <motion.div
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4"
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-40px' }}
                >
                  {items.map((item) => {
                    const cocktailItem = item as DigitalMenuItem & {
                      glass_type?: string
                    }
                    return (
                      <motion.div key={item.id} variants={fadeInUp}>
                        {cocktailItem.glass_type ? (
                          <CocktailCard
                            item={item as CocktailMenuItem}
                            language={language}
                          />
                        ) : (
                          <DigitalMenuItemCard
                            item={item}
                            language={language}
                          />
                        )}
                      </motion.div>
                    )
                  })}
                </motion.div>

                {/* Ad between categories (show after every 2nd category) */}
                {catIdx > 0 && catIdx % 2 === 1 && (
                  <AdRenderer page="digital_menu" placement="between_categories" lang={language} />
                )}
              </section>
            ))}
          </div>
        )}
      </main>

      {/* ---------------------------------------------------------------- */}
      {/* Footer                                                          */}
      {/* ---------------------------------------------------------------- */}
      <footer className="border-t border-primary/20/40 dark:border-primary/30 bg-muted/30 mt-12">
        <div className="container mx-auto px-4 py-10 space-y-4">
          {/* Logo + name */}
          <div className="flex items-center justify-center gap-2.5">
            <Image
              src="/icons/logoheader.png"
              alt="GrandCafe Cheers Mallorca"
              width={28}
              height={28}
              className="rounded"
            />
            <span className="text-lg font-semibold text-foreground/80">
              GrandCafe Cheers Mallorca
            </span>
          </div>

          {/* Address */}
          <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>Carrer de Cartago 22, El Arenal, Mallorca 07600</span>
          </div>

          {/* Opening hours */}
          <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>{getTranslation('openingHours', language)}</span>
          </div>

          {/* Instagram */}
          <div className="flex items-center justify-center">
            <a
              href="https://www.instagram.com/cheersmallorca"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary dark:hover:text-primary transition-colors"
            >
              <Instagram className="h-4 w-4" />
              <span>@cheersmallorca</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
