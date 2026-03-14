import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import BookingHero from '@/components/booking/booking-hero'
import BookingWizardLoader from '@/components/booking/booking-wizard-loader'
import ExperienceShowcase from '@/components/booking/experience-showcase'
import FeaturedCarousel from '@/components/booking/featured-carousel'
import SocialProof from '@/components/booking/social-proof'
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

function BookingFooter() {
  return (
    <footer className="relative overflow-hidden bg-[oklch(0.10_0.02_15)]">
      <div className="relative z-10">
        {/* Contact grid */}
        <div className="py-12 sm:py-14 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
              {/* Visit Us */}
              <div className="text-center space-y-2.5">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/5 mb-1">
                  <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="font-medium text-white/80 text-sm">Visit Us</h3>
                <p className="text-xs text-white/35 leading-relaxed">
                  Carrer de Cartago 22<br />
                  El Arenal (Platja de Palma)<br />
                  Mallorca 07600
                </p>
                <a
                  href="https://maps.google.com/?q=Carrer+de+Cartago+22,+El+Arenal,+Mallorca"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs text-primary/80 hover:text-primary transition-colors font-medium"
                >
                  Get Directions &rarr;
                </a>
              </div>

              {/* Contact */}
              <div className="text-center space-y-2.5">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/5 mb-1">
                  <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3 className="font-medium text-white/80 text-sm">Contact</h3>
                <div className="space-y-1 text-xs">
                  <p>
                    <a href="tel:+34971XXXXXX" className="text-white/35 hover:text-primary transition-colors">
                      +34 971 XXX XXX
                    </a>
                  </p>
                  <p>
                    <a href="mailto:info@cheersmallorca.com" className="text-white/35 hover:text-primary transition-colors">
                      info@cheersmallorca.com
                    </a>
                  </p>
                </div>
              </div>

              {/* Hours & Socials */}
              <div className="text-center space-y-2.5">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/5 mb-1">
                  <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-medium text-white/80 text-sm">Hours</h3>
                <p className="text-xs text-white/35">
                  April 1 &ndash; November 1<br />
                  10:30 &ndash; 03:00 daily
                </p>
                {/* Social links */}
                <div className="flex items-center justify-center gap-2.5 pt-1">
                  {[
                    { href: 'https://instagram.com/cheersmallorca', label: 'Instagram', path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z' },
                    { href: 'https://facebook.com/cheersmallorca', label: 'Facebook', path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
                    { href: 'https://wa.me/34971XXXXXX', label: 'WhatsApp', path: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z' },
                  ].map(({ href, label, path }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-primary/20 transition-colors"
                      aria-label={label}
                    >
                      <svg className="w-3.5 h-3.5 text-white/40" fill="currentColor" viewBox="0 0 24 24">
                        <path d={path} />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 py-5 px-4">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[10px] text-white/20">
              &copy; 2026 GrandCafe Cheers. All rights reserved.
            </p>

            <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] text-white/20">
              <a href="/digital" className="hover:text-white/50 transition-colors">Digital Menu</a>
              <a href="/legal/privacy" className="hover:text-white/50 transition-colors">Privacy</a>
              <a href="/legal/terms" className="hover:text-white/50 transition-colors">Terms</a>
              <a href="/legal/refund" className="hover:text-white/50 transition-colors">Refunds</a>
              <a href="/legal/aviso-legal" className="hover:text-white/50 transition-colors">Aviso Legal</a>
            </nav>
          </div>

          <p className="text-center text-[9px] text-white/10 mt-3 max-w-4xl mx-auto">
            Hojas de Reclamaciones disponibles en el establecimiento &bull;{' '}
            <a
              href="https://www.caib.es/sites/consum"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/30 transition-colors underline"
            >
              Consum &ndash; Govern de les Illes Balears
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
