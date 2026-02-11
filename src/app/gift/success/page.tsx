import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { CheckCircle, Gift, Download, ShoppingBag, Image as ImageIcon } from 'lucide-react'

export async function generateMetadata() {
  const t = await getTranslations('coupons.success')
  return { title: t('title') }
}

export default async function GiftSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const t = await getTranslations('coupons.success')
  const { code } = await searchParams

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>

        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>

        <p className="text-sm text-muted-foreground">{t('description')}</p>

        <div className="space-y-3">
          {code && (
            <>
              <Link
                href={`/gift/${code}`}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                <Gift className="h-5 w-5" />
                {t('viewVoucher')}
              </Link>

              <a
                href={`/api/public/coupons/${code}/pdf`}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-border font-medium hover:bg-muted transition-colors"
              >
                <Download className="h-5 w-5" />
                {t('downloadPdf')}
              </a>

              <a
                href={`/api/public/coupons/${code}/png`}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-border font-medium hover:bg-muted transition-colors"
              >
                <ImageIcon className="h-5 w-5" />
                Download Image (PNG)
              </a>
            </>
          )}

          <Link
            href="/gift"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-border font-medium hover:bg-muted transition-colors text-sm"
          >
            <ShoppingBag className="h-4 w-4" />
            {t('buyAnother')}
          </Link>
        </div>
      </div>
    </div>
  )
}
