'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useBookingLanguage } from './booking-language-provider'
import { Wine, UtensilsCrossed, Star, ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'

interface FeaturedItem {
  id: string
  name_en: string
  name_nl: string | null
  name_es: string | null
  name_de: string | null
  description_en: string | null
  description_nl: string | null
  description_es: string | null
  description_de: string | null
  price: number
  photo_url: string | null
  category: { name_en: string; name_nl: string | null; name_es: string | null; name_de: string | null } | null
  type: 'cocktail' | 'food'
  glass_type: string | null
}

type LangSuffix = 'en' | 'nl' | 'es' | 'de'

function getLocalizedField(item: FeaturedItem, field: 'name' | 'description', lang: LangSuffix): string {
  const key = `${field}_${lang}` as keyof FeaturedItem
  const value = item[key] as string | null
  if (value) return value
  return (item[`${field}_en`] as string) || ''
}

function getCategoryName(item: FeaturedItem, lang: LangSuffix): string {
  if (!item.category) return ''
  const key = `name_${lang}` as keyof typeof item.category
  return (item.category[key] as string) || item.category.name_en || ''
}

function CarouselRow({
  items,
  lang,
  language,
}: {
  items: FeaturedItem[]
  lang: LangSuffix
  language: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [isPaused, setIsPaused] = useState(false)

  const scrollToIndex = useCallback((index: number) => {
    const el = scrollRef.current
    if (!el) return
    const cards = el.querySelectorAll('[data-card]') as NodeListOf<HTMLElement>
    if (cards[index]) {
      const cardLeft = cards[index].offsetLeft - el.offsetLeft
      el.scrollTo({ left: cardLeft, behavior: 'smooth' })
      setActiveIndex(index)
    }
  }, [])

  useEffect(() => {
    if (items.length <= 1 || isPaused) return
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % items.length
        scrollToIndex(next)
        return next
      })
    }, 4000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [items.length, isPaused, scrollToIndex])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handleScroll = () => {
      const scrollLeft = el.scrollLeft
      const cardWidth = el.querySelector('[data-card]')?.clientWidth || 280
      const gap = 16
      const index = Math.round(scrollLeft / (cardWidth + gap))
      setActiveIndex(Math.min(index, items.length - 1))
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [items.length])

  if (items.length === 0) return null

  return (
    <div>
      <div className="relative group">
        <button
          onClick={() => scrollToIndex(Math.max(0, activeIndex - 1))}
          className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-background/80 border border-border shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => scrollToIndex(Math.min(items.length - 1, activeIndex + 1))}
          className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-background/80 border border-border shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div
          ref={scrollRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
        >
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              data-card
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="shrink-0 w-[280px] snap-start rounded-2xl overflow-hidden bg-card border border-border shadow-md hover:shadow-xl transition-shadow"
            >
              {/* Image */}
              <div className="relative h-44 overflow-hidden">
                {item.photo_url ? (
                  <Image
                    src={item.photo_url}
                    alt={getLocalizedField(item, 'name', lang)}
                    fill
                    className="object-cover"
                    sizes="280px"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10 flex items-center justify-center">
                    {item.type === 'cocktail' ? (
                      <Wine className="w-12 h-12 text-primary/40" />
                    ) : (
                      <UtensilsCrossed className="w-12 h-12 text-primary/40" />
                    )}
                  </div>
                )}

                {/* Recommended badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-white text-xs font-semibold">
                  <Star className="w-3 h-3 fill-current" />
                  {language === 'nl' ? 'Aanbevolen' : language === 'es' ? 'Recomendado' : language === 'de' ? 'Empfohlen' : 'Recommended'}
                </div>

                {/* Category chip */}
                {item.category && (
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs">
                    {getCategoryName(item, lang)}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-foreground leading-tight">
                    {getLocalizedField(item, 'name', lang)}
                  </h3>
                  <span className="shrink-0 font-bold text-primary">
                    &euro;{Number(item.price).toFixed(2)}
                  </span>
                </div>

                {getLocalizedField(item, 'description', lang) && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {getLocalizedField(item, 'description', lang)}
                  </p>
                )}

                {item.glass_type && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Wine className="w-3 h-3" />
                    <span className="capitalize">{item.glass_type.replace('_', ' ')}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Dots navigation */}
      {items.length > 1 && (
        <div className="flex justify-center gap-2 mt-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToIndex(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === activeIndex ? 'bg-primary w-6' : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function FeaturedCarousel() {
  const { language } = useBookingLanguage()
  const [cocktails, setCocktails] = useState<FeaturedItem[]>([])
  const [food, setFood] = useState<FeaturedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/public/menu/featured')
      .then((r) => r.json())
      .then((data) => {
        if (data.cocktails) setCocktails(data.cocktails)
        if (data.food) setFood(data.food)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="shrink-0 w-[280px] h-[340px] rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (cocktails.length === 0 && food.length === 0) return null

  const lang = language as LangSuffix

  const sectionTitle = language === 'nl' ? 'Specialiteiten van het Huis' : language === 'es' ? 'Especiales de la Casa' : language === 'de' ? 'Spezialitäten des Hauses' : 'House Specials'

  return (
    <section className="py-12 px-4">
      <div className="max-w-5xl mx-auto space-y-10">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl sm:text-4xl font-bold text-center text-foreground flex items-center justify-center gap-3"
        >
          <Star className="w-8 h-8 text-primary fill-primary" />
          {sectionTitle}
        </motion.h2>

        {/* Cocktails */}
        {cocktails.length > 0 && (
          <CarouselRow items={cocktails} lang={lang} language={language} />
        )}

        {/* Food */}
        {food.length > 0 && (
          <CarouselRow items={food} lang={lang} language={language} />
        )}
      </div>
    </section>
  )
}
