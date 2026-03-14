'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useBookingLanguage } from './booking-language-provider'
import { Wine, UtensilsCrossed, Calendar, Music, Tv } from 'lucide-react'
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

interface TonightEvent {
  id: string
  title: string
  start_time: string
  end_time: string
  event_type: string
  dj?: { name: string; genre: string }
  home_team?: string
  away_team?: string
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

/** Mobile carousel with snap */
function MobileCarousel({ items, lang }: { items: FeaturedItem[]; lang: LangSuffix }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handleScroll = () => {
      const cardWidth = el.querySelector('[data-card]')?.clientWidth || 300
      const index = Math.round(el.scrollLeft / (cardWidth + 16))
      setActiveIndex(Math.min(index, items.length - 1))
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [items.length])

  return (
    <div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide touch-pan-y -mx-4 px-4"
      >
        {items.map((item) => (
          <FeaturedCard key={item.id} item={item} lang={lang} className="shrink-0 w-[280px] snap-start" />
        ))}
      </div>
      {items.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {items.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === activeIndex ? 'bg-primary w-5' : 'bg-muted-foreground/20 w-1.5'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/** Featured card — glass-morphism style */
function FeaturedCard({ item, lang, className = '' }: { item: FeaturedItem; lang: LangSuffix; className?: string }) {
  return (
    <motion.div
      data-card
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={`group rounded-2xl overflow-hidden bg-card/50 backdrop-blur-sm border border-border/50 shadow-sm hover:shadow-xl transition-all duration-300 ${className}`}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        {item.photo_url ? (
          <Image
            src={item.photo_url}
            alt={getLocalizedField(item, 'name', lang)}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 640px) 280px, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 via-accent/5 to-transparent flex items-center justify-center">
            {item.type === 'cocktail' ? (
              <Wine className="w-10 h-10 text-primary/30" />
            ) : (
              <UtensilsCrossed className="w-10 h-10 text-primary/30" />
            )}
          </div>
        )}

        {/* Category chip */}
        {item.category && (
          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full glass text-white text-xs font-medium">
            {getCategoryName(item, lang)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-foreground text-base leading-tight">
            {getLocalizedField(item, 'name', lang)}
          </h3>
          <span className="shrink-0 font-semibold text-primary text-sm">
            &euro;{Number(item.price).toFixed(2)}
          </span>
        </div>

        {getLocalizedField(item, 'description', lang) && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {getLocalizedField(item, 'description', lang)}
          </p>
        )}

        {item.glass_type && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70 pt-1">
            <Wine className="w-3 h-3" />
            <span className="capitalize">{item.glass_type.replace('_', ' ')}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/** Tonight events banner */
function TonightBanner({ events, t }: { events: TonightEvent[]; t: (key: string) => string }) {
  if (events.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 rounded-2xl glass p-4 sm:p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">{t('tonight.heading')}</span>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide">
        {events.map((event) => (
          <div
            key={event.id}
            className="shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-background/50 border border-border/30"
          >
            {event.event_type === 'dj_night' || event.dj ? (
              <Music className="w-4 h-4 text-primary shrink-0" />
            ) : (
              <Tv className="w-4 h-4 text-primary shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
              <p className="text-xs text-muted-foreground">{event.start_time} — {event.end_time}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export default function FeaturedCarousel() {
  const { language, t } = useBookingLanguage()
  const [cocktails, setCocktails] = useState<FeaturedItem[]>([])
  const [food, setFood] = useState<FeaturedItem[]>([])
  const [events, setEvents] = useState<TonightEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/public/menu/featured').then(r => r.json()),
      fetch('/api/public/events/tonight').then(r => r.json()).catch(() => ({ events: [] })),
    ]).then(([menuData, eventsData]) => {
      if (menuData.cocktails) setCocktails(menuData.cocktails)
      if (menuData.food) setFood(menuData.food)
      if (eventsData.events) setEvents(eventsData.events)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[340px] rounded-2xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  const allItems = [...cocktails, ...food]
  if (allItems.length === 0) return null

  const lang = language as LangSuffix

  const sectionTitle = language === 'nl' ? 'Specialiteiten van het Huis'
    : language === 'es' ? 'Especiales de la Casa'
    : language === 'de' ? 'Spezialitäten des Hauses'
    : 'House Specials'

  return (
    <section className="py-16 sm:py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 sm:mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light text-foreground tracking-tight">
            {sectionTitle}
          </h2>
        </motion.div>

        {/* Tonight's events banner */}
        <TonightBanner events={events} t={t} />

        {/* Desktop: grid layout */}
        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 gap-5">
          {allItems.map((item) => (
            <FeaturedCard key={item.id} item={item} lang={lang} />
          ))}
        </div>

        {/* Mobile: carousel */}
        <div className="sm:hidden">
          <MobileCarousel items={allItems} lang={lang} />
        </div>

        {/* CTA to full menu */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-10 sm:mt-12"
        >
          <a
            href="/digital"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-primary/20 text-primary font-medium text-sm glow-hover transition-all hover:border-primary/40 hover:bg-primary/5"
          >
            {language === 'nl' ? 'Bekijk de volledige kaart'
              : language === 'es' ? 'Ver carta completa'
              : language === 'de' ? 'Vollständige Karte ansehen'
              : 'View Full Menu'}
            <span aria-hidden="true">&rarr;</span>
          </a>
        </motion.div>
      </div>
    </section>
  )
}
