import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import BookingHero from '@/components/booking/booking-hero'
import BookingWizardLoader from '@/components/booking/booking-wizard-loader'
import ExperienceShowcase from '@/components/booking/experience-showcase'
import FeaturedCarousel from '@/components/booking/featured-carousel'
import SocialProof from '@/components/booking/social-proof'
import BookingFooter from '@/components/booking/booking-footer'
import FloatingReserveButton from '@/components/booking/floating-reserve-button'
import { BookingLanguageProvider } from '@/components/booking/booking-language-provider'
import { getWebConfig } from '@/lib/utils/get-web-config'
import { ModuleDisabledPage } from '@/components/module-disabled'

import messagesEn from '@/i18n/messages/en/booking.json'
import messagesNl from '@/i18n/messages/nl/booking.json'
import messagesEs from '@/i18n/messages/es/booking.json'
import messagesDe from '@/i18n/messages/de/booking.json'

const allMessages = {
  en: messagesEn,
  nl: messagesNl,
  es: messagesEs,
  de: messagesDe,
} as Record<'en' | 'nl' | 'es' | 'de', Record<string, unknown>>

/**
 * Public Landing Page — GrandCafe Cheers
 * Accessible without authentication
 * URL: /
 */

export async function generateMetadata() {
  const [t, webConfig] = await Promise.all([
    getTranslations('booking'),
    getWebConfig(),
  ])

  return {
    title: webConfig.seo_title || t('meta.title'),
    description: webConfig.meta_description || t('meta.description'),
    openGraph: {
      title: webConfig.seo_title || t('meta.ogTitle'),
      description: webConfig.meta_description || t('meta.ogDescription'),
      images: ['/images/grandcafe-cheers-og.jpg'],
    },
  }
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FoodEstablishment',
  name: 'GrandCafe Cheers',
  description: 'World kitchen, big fiesta! Beach bar & restaurant in Mallorca with craft cocktails and live DJs.',
  url: 'https://grandcafe-cheers-app.vercel.app/',
  telephone: '+34971XXXXXX',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Carrer de Cartago 22',
    addressLocality: 'El Arenal (Platja de Palma)',
    postalCode: '07600',
    addressRegion: 'Mallorca',
    addressCountry: 'ES',
  },
  servesCuisine: ['World Kitchen', 'Cocktails', 'Burgers'],
  priceRange: '€€',
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '10:30',
      closes: '03:00',
    },
  ],
  hasMap: 'https://maps.google.com/?q=Carrer+de+Cartago+22,+El+Arenal,+Mallorca',
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    bestRating: '5',
    ratingCount: '240',
  },
}

export default async function HomePage() {
  const webConfig = await getWebConfig()

  if (!webConfig.booking_enabled) {
    return <ModuleDisabledPage module="Online Booking" />
  }
  return (
    <BookingLanguageProvider messages={allMessages}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-background">
        {/* Floating sticky reserve button */}
        <FloatingReserveButton />

        {/* 1. Cinematic Hero — full screen */}
        <BookingHero />

        {/* 2. Experience Showcase — full-bleed parallax blocks + stats */}
        <ExperienceShowcase />

        {/* 3. Featured Menu — glass cards + tonight events */}
        <Suspense fallback={null}>
          <FeaturedCarousel />
        </Suspense>

        {/* 4. Booking Wizard — the star */}
        <main id="booking-wizard">
          <BookingWizardLoader />
        </main>

        {/* 5. Trust & Community — dark section with reviews, newsletter, gift */}
        <SocialProof />

        {/* 6. Footer */}
        <BookingFooter />
      </div>
    </BookingLanguageProvider>
  )
}
