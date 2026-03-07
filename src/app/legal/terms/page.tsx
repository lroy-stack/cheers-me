import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — GrandCafe Cheers',
  robots: { index: true, follow: true },
}

export default async function TermsPage() {
  const t = await getTranslations('legal.terms')

  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-foreground mb-1">{t('title')}</h1>
      <p className="text-sm text-muted-foreground mb-8">{t('lastUpdated')}</p>

      <p className="text-foreground leading-relaxed mb-6">{t('intro')}</p>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('contractTitle')}</h2>
        <p className="text-muted-foreground">{t('contractText')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('reservationsTitle')}</h2>
        <p className="text-muted-foreground">{t('reservationsText')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('couponsTitle')}</h2>
        <p className="text-muted-foreground">{t('couponsText')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('conductTitle')}</h2>
        <p className="text-muted-foreground">{t('conductText')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('liabilityTitle')}</h2>
        <p className="text-muted-foreground">{t('liabilityText')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('intellectualTitle')}</h2>
        <p className="text-muted-foreground">{t('intellectualText')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('governingTitle')}</h2>
        <p className="text-muted-foreground">{t('governingText')}</p>
        <p className="text-muted-foreground mt-2">
          EU ODR platform:{' '}
          <Link
            href="https://ec.europa.eu/odr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            ec.europa.eu/odr
          </Link>
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('complaintsTitle')}</h2>
        <p className="text-muted-foreground">{t('complaintsText')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('changesTitle')}</h2>
        <p className="text-muted-foreground">{t('changesText')}</p>
      </section>
    </article>
  )
}
