import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import BookingHero from '@/components/booking/booking-hero'
import BookingWizardLoader from '@/components/booking/booking-wizard-loader'
import SocialProof from '@/components/booking/social-proof'
import TonightAtCheers from '@/components/booking/tonight-at-cheers'
import GiftVoucherSection from '@/components/booking/gift-voucher-section'
import NewsletterSection from '@/components/booking/newsletter-section'
import FeaturedCarousel from '@/components/booking/featured-carousel'
import AdRenderer from '@/components/ads/ad-renderer'
import { PolaroidPair } from '@/components/booking/polaroid-photo'
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
 * Public Booking Landing Page — Premium Experience
 * Accessible without authentication
 * URL: /booking
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

export default async function BookingPage() {
  const webConfig = await getWebConfig()

  if (!webConfig.booking_enabled) {
    return <ModuleDisabledPage module="Online Booking" />
  }
  return (
    <BookingLanguageProvider messages={allMessages}>
      <div className="min-h-screen bg-background">
        {/* 1. Hero — Full-screen with photo background */}
        <BookingHero />

        {/* Active Promotions */}
        <Suspense fallback={null}>
          <div className="px-4 pt-4">
            <div className="max-w-md mx-auto">
              <AdRenderer page="booking" placement="banner_top" />
            </div>
          </div>
        </Suspense>

        {/* 2. Featured Carousel — Cocktails & Dishes from DB */}
        <FeaturedCarousel />

        {/* Polaroid pair: World Kitchen & Cocktails */}
        <PolaroidPair
          items={[
            { image: '/tapas.jpeg', captionKey: 'worldKitchen', rotation: -3 },
            { image: '/expresso_martini.jpeg', captionKey: 'cocktails', rotation: 4 },
          ]}
        />

        {/* 3. Tonight's events */}
        <Suspense fallback={null}>
          <TonightAtCheers />
        </Suspense>

        {/* Polaroid pair: Burgers & Vibes */}
        <PolaroidPair
          items={[
            { image: '/burger.jpeg', captionKey: 'burgers', rotation: 2 },
            { image: '/cheers.jpeg', captionKey: 'vibes', rotation: -5 },
          ]}
        />

        {/* 4. Booking Wizard */}
        <main id="booking-wizard">
          <BookingWizardLoader />
        </main>

        {/* 5. Gift Voucher */}
        <GiftVoucherSection />

        {/* 6. Newsletter */}
        <NewsletterSection />

        {/* 7. Social Proof */}
        <SocialProof />

        {/* 9. Contact & Footer */}
        <BookingFooter />
      </div>
    </BookingLanguageProvider>
  )
}

function BookingFooter() {
  return (
    <>
      <div className="py-8 px-4">
        <div className="max-w-md mx-auto bg-card rounded-xl border border-border p-6 text-center space-y-3">
          <h3 className="font-semibold text-foreground">Need Help?</h3>
          <p className="text-sm text-muted-foreground">
            For large groups (12+), same-day reservations, or special requests, call us directly.
          </p>
          <div className="space-y-1 text-sm">
            <p>
              <a href="tel:+34971XXXXXX" className="text-primary hover:underline font-medium">
                +34 971 XXX XXX
              </a>
            </p>
            <p>
              <a href="mailto:info@cheersmallorca.com" className="text-primary hover:underline">
                info@cheersmallorca.com
              </a>
            </p>
            <p>
              <a
                href="https://instagram.com/cheersmallorca"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                @cheersmallorca
              </a>
            </p>
          </div>
        </div>
      </div>

      <footer className="border-t border-border py-6 px-4">
        <div className="max-w-4xl mx-auto text-center text-sm text-muted-foreground space-y-1">
          <p>Carrer de Cartago 22, El Arenal (Platja de Palma), Mallorca 07600</p>
          <p>Open April 1 - November 1 &bull; High Season Hours: 10:30 - 03:00</p>
          <p className="mt-3">&copy; 2026 GrandCafe Cheers. All rights reserved.</p>
        </div>
      </footer>
    </>
  )
}
