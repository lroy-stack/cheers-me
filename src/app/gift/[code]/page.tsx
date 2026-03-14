import { getTranslations } from 'next-intl/server'
import CouponPublicView from '@/components/coupons/coupon-public-view'

export async function generateMetadata() {
  const t = await getTranslations('coupons.purchase')
  return {
    title: `${t('giftVoucherLabel')} — ${t('brandName')}`,
  }
}

export default async function GiftCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const t = await getTranslations('coupons.purchase')

  return (
    <div className="min-h-screen bg-background">
      {/* Print styles */}
      <style>{`
        @media print {
          nav, header, footer, .print\\:hidden { display: none !important; }
          body { background: white !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-6 px-4 print:hidden">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-primary-foreground text-sm font-semibold tracking-wider">{t('brandName').toUpperCase()}</p>
        </div>
      </div>

      <main className="py-8 px-4">
        <CouponPublicView code={code} />
      </main>

      <footer className="py-6 px-4 border-t border-border print:hidden">
        <div className="max-w-lg mx-auto text-center text-xs text-muted-foreground">
          <p>{t('footerAddress')}</p>
        </div>
      </footer>
    </div>
  )
}
