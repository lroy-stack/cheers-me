'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Mail } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface NewsletterPreviewProps {
  subject: string
  content: string
  htmlContent?: string
}

export function NewsletterPreview({ subject, content, htmlContent }: NewsletterPreviewProps) {
  const t = useTranslations('marketing.newsletterPreview')

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader className="border-b bg-muted/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Mail className="h-4 w-4" />
            {t('preview')}
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{t('from')}</div>
            <div className="text-xs text-muted-foreground">{t('to')}</div>
            <div className="text-xl font-bold mt-2">{subject || t('noSubject')}</div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          {htmlContent ? (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          ) : (
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {content || t('startWriting')}
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-8 border-t text-xs text-muted-foreground text-center space-y-2">
            <p>
              <strong>GrandCafe Cheers Mallorca</strong>
              <br />
              Carrer de Cartago 22, El Arenal, Mallorca 07600
            </p>
            <p>
              {t('followInstagram')}{' '}
              <a
                href="https://instagram.com/cheersmallorca"
                className="text-blue-500 hover:underline"
              >
                @cheersmallorca
              </a>
            </p>
            <p className="text-xs">
              {t('unsubscribeNotice')}
              <br />
              <a href="#" className="text-blue-500 hover:underline">
                {t('unsubscribe')}
              </a>{' '}
              |{' '}
              <a href="#" className="text-blue-500 hover:underline">
                {t('managePreferences')}
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
