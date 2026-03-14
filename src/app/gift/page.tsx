import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import Image from 'next/image'
import CouponPurchaseForm from '@/components/coupons/coupon-purchase-form'
import { ArrowLeft } from 'lucide-react'

export async function generateMetadata() {
  const t = await getTranslations('coupons.purchase')
  return {
    title: `${t('heroTitle')} — GrandCafe Cheers`,
    description: t('heroSubtitle'),
    openGraph: {
      title: t('heroTitle'),
      description: t('heroSubtitle'),
    },
  }
}

export default async function GiftPage() {
  const t = await getTranslations('coupons.purchase')

  return (
    <div className="min-h-screen bg-background">
      {/* Hero with background image */}
      <div className="relative h-[50vh] min-h-[340px] max-h-[480px] overflow-hidden">
        {/* Background image with Ken Burns */}
        <div className="absolute inset-0">
          <Image
            src="/cheers.jpeg"
            alt="GrandCafe Cheers Mallorca"
            fill
            className="object-cover animate-ken-burns"
            sizes="100vw"
            priority
          />
          {/* Radial gradient overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.65)_70%,rgba(0,0,0,0.85)_100%)]" />
        </div>

        {/* Back link — top left */}
        <div className="absolute top-6 left-6 z-20">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-foreground/70 hover:text-foreground transition-colors glass rounded-full px-4 py-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backToHome')}
          </Link>
        </div>

        {/* Hero content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extralight text-foreground tracking-tight leading-[1.05]">
            {t('heroTitle')}
          </h1>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg font-light text-foreground/60 max-w-md">
            {t('heroSubtitle')}
          </p>
        </div>

        {/* Bottom gradient fade into background */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-20" />
      </div>

      {/* Purchase form in glass container */}
      <main className="relative z-30 -mt-16 px-4 pb-12">
        <div className="max-w-lg mx-auto">
          <div className="bg-card/50 backdrop-blur-sm border border-border/40 rounded-2xl p-6 sm:p-8 shadow-xl">
            <CouponPurchaseForm />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/30">
        <div className="max-w-lg mx-auto text-center text-xs text-muted-foreground space-y-1">
          <p>GrandCafe Cheers &middot; Carrer de Cartago 22, El Arenal, Mallorca 07600</p>
          <p>@cheersmallorca</p>
        </div>
      </footer>
    </div>
  )
}
