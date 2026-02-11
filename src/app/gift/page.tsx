import { getTranslations } from 'next-intl/server'
import CouponPurchaseForm from '@/components/coupons/coupon-purchase-form'
import { Gift } from 'lucide-react'

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
      <div className="bg-gradient-to-br from-[#1a1a2e] to-[#2d2d4e] text-white py-12 px-4">
        <div className="max-w-lg mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#c9a84c]/20 mb-4">
            <Gift className="h-8 w-8 text-[#c9a84c]" />
          </div>
          <h1 className="text-3xl font-bold mb-3">{t('heroTitle')}</h1>
          <p className="text-white/80 text-sm">{t('heroSubtitle')}</p>
        </div>
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
