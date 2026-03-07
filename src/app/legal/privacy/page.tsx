import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — GrandCafe Cheers',
  robots: { index: true, follow: true },
}

export default async function PrivacyPage() {
  const t = await getTranslations('legal.privacy')

  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-foreground mb-1">{t('title')}</h1>
      <p className="text-sm text-muted-foreground mb-8">{t('lastUpdated')}</p>

      <p className="text-foreground leading-relaxed mb-6">{t('intro')}</p>

      {/* Data Controller */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('controllerTitle')}</h2>
        <p className="text-muted-foreground">{t('controllerText')}</p>
      </section>

      {/* Data Collected */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('dataCollectedTitle')}</h2>
        <p className="text-muted-foreground mb-2">{t('dataCollectedText')}</p>
        <ul className="list-disc list-inside space-y-1">
          {(t.raw('dataItems') as string[]).map((item, i) => (
            <li key={i} className="text-muted-foreground text-sm">{item}</li>
          ))}
        </ul>
      </section>

      {/* Purposes */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('purposesTitle')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-medium text-foreground">Purpose</th>
                <th className="text-left py-2 font-medium text-foreground">Legal Basis</th>
              </tr>
            </thead>
            <tbody>
              {(t.raw('purposes') as Array<{purpose: string; basis: string}>).map((row, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2 pr-4 text-muted-foreground">{row.purpose}</td>
                  <td className="py-2 text-muted-foreground">{row.basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Retention */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('retentionTitle')}</h2>
        <p className="text-muted-foreground mb-2">{t('retentionText')}</p>
        <ul className="list-disc list-inside space-y-1">
          {(t.raw('retentionItems') as string[]).map((item, i) => (
            <li key={i} className="text-muted-foreground text-sm">{item}</li>
          ))}
        </ul>
      </section>

      {/* Third-Party Processors */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('processorsTitle')}</h2>
        <p className="text-muted-foreground mb-3">{t('processorsText')}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-medium text-foreground">Processor</th>
                <th className="text-left py-2 pr-4 font-medium text-foreground">Purpose</th>
                <th className="text-left py-2 font-medium text-foreground">Location</th>
              </tr>
            </thead>
            <tbody>
              {(t.raw('processors') as Array<{name: string; purpose: string; location: string}>).map((row, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2 pr-4 text-muted-foreground font-medium">{row.name}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{row.purpose}</td>
                  <td className="py-2 text-muted-foreground">{row.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Rights */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('rightsTitle')}</h2>
        <p className="text-muted-foreground mb-2">{t('rightsText')}</p>
        <ul className="list-disc list-inside space-y-1">
          {(t.raw('rights') as string[]).map((right, i) => (
            <li key={i} className="text-muted-foreground text-sm">{right}</li>
          ))}
        </ul>
        <p className="text-muted-foreground mt-3 text-sm font-medium">{t('rightsContact')}</p>
      </section>

      {/* Cookies */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('cookiesTitle')}</h2>
        <p className="text-muted-foreground">{t('cookiesText')}</p>
      </section>

      {/* Contact */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('contactTitle')}</h2>
        <p className="text-muted-foreground">{t('contactText')}</p>
      </section>
    </article>
  )
}
