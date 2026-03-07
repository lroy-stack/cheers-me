import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import CouponPurchaseForm from '@/components/coupons/coupon-purchase-form'
import { Gift, ArrowLeft } from 'lucide-react'

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
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-12 px-4">
        <div className="max-w-lg mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-foreground/20 mb-4">
            <Gift className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-3">{t('heroTitle')}</h1>
          <p className="text-primary-foreground/80 text-sm">{t('heroSubtitle')}</p>
        </div>
      </div>

      {/* Back link */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {t('backToHome')}
        </Link>
      </div>

      {/* Purchase form */}
      <main className="py-8 px-4">
        <CouponPurchaseForm />
      </main>

      {/* Footer info */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-lg mx-auto text-center text-xs text-muted-foreground space-y-1">
          <p>GrandCafe Cheers · Carrer de Cartago 22, El Arenal, Mallorca 07600</p>
          <p>@cheersmallorca</p>
        </div>
      </footer>
    </div>
  )
}
