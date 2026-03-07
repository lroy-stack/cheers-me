import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Aviso Legal — GrandCafe Cheers',
  robots: { index: true, follow: true },
}

export default async function AvisoLegalPage() {
  const t = await getTranslations('legal.avisoLegal')

  const fields = t.raw('fields') as Record<string, string>
  const values = t.raw('values') as Record<string, string>

  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold text-foreground mb-1">{t('title')}</h1>
      <p className="text-sm text-muted-foreground mb-1">{t('subtitle')}</p>
      <p className="text-sm text-muted-foreground mb-8">{t('lastUpdated')}</p>

      {/* Identity */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">{t('identityTitle')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <tbody>
              {Object.keys(fields).map((key) => (
                <tr key={key} className="border-b border-border/50">
                  <td className="py-3 pr-4 font-medium text-foreground w-48">{fields[key]}</td>
                  <td className="py-3 text-muted-foreground">{values[key]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Activity */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('activityTitle')}</h2>
        <p className="text-muted-foreground">{t('activityText')}</p>
      </section>

      {/* Supervisory */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('supervisoryTitle')}</h2>
        <p className="text-muted-foreground">{t('supervisoryText')}</p>
      </section>

      {/* Intellectual */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('intellectualTitle')}</h2>
        <p className="text-muted-foreground">{t('intellectualText')}</p>
      </section>

      {/* Liability */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('liabilityTitle')}</h2>
        <p className="text-muted-foreground">{t('liabilityText')}</p>
      </section>

      {/* Law */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('lawTitle')}</h2>
        <p className="text-muted-foreground">{t('lawText')}</p>
      </section>
    </article>
  )
}
