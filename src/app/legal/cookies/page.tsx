import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cookie Policy — GrandCafe Cheers',
  robots: { index: true, follow: true },
}

interface CookieItem {
  name: string
  purpose: string
  expiry: string
  party: string
}

export default async function CookiesPage() {
  const t = await getTranslations('legal.cookies')

  const necessary = t.raw('necessary') as { title: string; description: string; items: CookieItem[] }
  const functional = t.raw('functional') as { title: string; description: string; items: CookieItem[] }
  const thirdParty = t.raw('thirdParty') as { title: string; description: string; items: CookieItem[] }

  const CookieTable = ({ items }: { items: CookieItem[] }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 pr-3 font-medium text-foreground">Name</th>
            <th className="text-left py-2 pr-3 font-medium text-foreground">Purpose</th>
            <th className="text-left py-2 pr-3 font-medium text-foreground">Expiry</th>
            <th className="text-left py-2 font-medium text-foreground">Type</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-border/50">
              <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{item.name}</td>
              <td className="py-2 pr-3 text-muted-foreground">{item.purpose}</td>
              <td className="py-2 pr-3 text-muted-foreground">{item.expiry}</td>
              <td className="py-2 text-muted-foreground">{item.party}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-foreground mb-1">{t('title')}</h1>
      <p className="text-sm text-muted-foreground mb-8">{t('lastUpdated')}</p>

      <p className="text-foreground leading-relaxed mb-6">{t('intro')}</p>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('whatTitle')}</h2>
        <p className="text-muted-foreground">{t('whatText')}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('typesTitle')}</h2>

        {/* Necessary */}
        <div className="mb-6 p-4 rounded-lg border border-border bg-card">
          <h3 className="text-base font-semibold text-foreground mb-1">{necessary.title}</h3>
          <p className="text-sm text-muted-foreground mb-3">{necessary.description}</p>
          <CookieTable items={necessary.items} />
        </div>

        {/* Functional */}
        <div className="mb-6 p-4 rounded-lg border border-border bg-card">
          <h3 className="text-base font-semibold text-foreground mb-1">{functional.title}</h3>
          <p className="text-sm text-muted-foreground mb-3">{functional.description}</p>
          <CookieTable items={functional.items} />
        </div>

        {/* Third Party */}
        <div className="mb-6 p-4 rounded-lg border border-border bg-card">
          <h3 className="text-base font-semibold text-foreground mb-1">{thirdParty.title}</h3>
          <p className="text-sm text-muted-foreground mb-3">{thirdParty.description}</p>
          <CookieTable items={thirdParty.items} />
        </div>
      </section>

      <section className="mb-6 p-4 rounded-lg border border-border bg-muted/50">
        <p className="text-muted-foreground text-sm">{t('noAnalytics')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('controlTitle')}</h2>
        <p className="text-muted-foreground">{t('controlText')}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('moreInfoTitle')}</h2>
        <p className="text-muted-foreground">{t('moreInfoText')}</p>
      </section>
    </article>
  )
}
