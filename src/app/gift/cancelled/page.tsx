import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { XCircle, RotateCcw } from 'lucide-react'

export async function generateMetadata() {
  const t = await getTranslations('coupons.cancelled')
  return { title: t('title') }
}

export default async function GiftCancelledPage() {
  const t = await getTranslations('coupons.cancelled')

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100">
          <XCircle className="h-10 w-10 text-amber-600" />
        </div>

        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>

        <p className="text-sm text-muted-foreground">{t('description')}</p>

        <Link
          href="/gift"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          <RotateCcw className="h-5 w-5" />
          {t('tryAgain')}
        </Link>
      </div>
    </div>
  )
}
