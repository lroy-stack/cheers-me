import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Refund Policy & Right of Withdrawal — GrandCafe Cheers',
  robots: { index: true, follow: true },
}

export default async function RefundPage() {
  const t = await getTranslations('legal.refund')

  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-foreground mb-1">{t('title')}</h1>
      <p className="text-sm text-muted-foreground mb-8">{t('lastUpdated')}</p>

      <p className="text-foreground leading-relaxed mb-6">{t('intro')}</p>

      <section className="mb-6 p-4 rounded-lg border border-primary/30 bg-primary/5">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('withdrawalTitle')}</h2>
        <p className="text-muted-foreground">{t('withdrawalText')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('withdrawalHowTitle')}</h2>
        <p className="text-muted-foreground">{t('withdrawalHow')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('withdrawalFormTitle')}</h2>
        <pre className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-4 rounded-lg border border-border font-mono leading-relaxed">
          {t('withdrawalForm')}
        </pre>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('refundProcessTitle')}</h2>
        <p className="text-muted-foreground">{t('refundProcessText')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('exceptionsTitle')}</h2>
        <p className="text-muted-foreground">{t('exceptionsText')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('nonRefundableTitle')}</h2>
        <p className="text-muted-foreground">{t('nonRefundableText')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('contactTitle')}</h2>
        <p className="text-muted-foreground">{t('contactText')}</p>
      </section>
    </article>
  )
}
