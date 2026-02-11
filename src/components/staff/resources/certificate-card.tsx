'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Award, Download } from 'lucide-react'
import type { GuideMetadata } from '@/lib/data/resource-guides'
import type { TrainingRecord } from '@/types'

interface CertificateCardProps {
  guide: GuideMetadata
  record: TrainingRecord
  locale: string
}

export function CertificateCard({ guide, record, locale }: CertificateCardProps) {
  const t = useTranslations('resources')

  const completedDate = new Date(record.created_at).toLocaleDateString(
    locale === 'es' ? 'es-ES' : locale === 'nl' ? 'nl-NL' : locale === 'de' ? 'de-DE' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  )

  const handleDownload = () => {
    const url = `/api/staff/training/certificate/${guide.code}?lang=${locale}`
    const a = document.createElement('a')
    a.href = url
    a.download = `certificate-${guide.code}-${locale}.pdf`
    a.click()
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-2 shrink-0">
            <Award className="h-5 w-5 text-green-700 dark:text-green-300" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-sm leading-tight truncate">
              {t(guide.titleKey)}
            </h3>
            <Badge variant="outline" className="font-mono text-xs mt-1">
              {guide.code}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>
            <span className="font-medium">{t('training.certifiedOn')}</span>
            <p>{completedDate}</p>
          </div>
          <div>
            <span className="font-medium">{t('training.score')}</span>
            <p>{record.score ?? 0}%</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="w-full flex items-center gap-2"
        >
          <Download className="h-3.5 w-3.5" />
          {t('training.downloadCertificate')}
        </Button>
      </CardContent>
    </Card>
  )
}
