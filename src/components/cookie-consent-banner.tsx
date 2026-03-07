'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Cookie, Settings, X } from 'lucide-react'

const CONSENT_KEY = 'cheers_cookie_consent'

interface ConsentState {
  necessary: true
  functional: boolean
  marketing: boolean
}

function getStoredConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(CONSENT_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function storeConsent(consent: ConsentState) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent))
  } catch {
    // ignore storage errors
  }
}

export function CookieConsentBanner() {
  const t = useTranslations('legal.cookieConsent')
  const [visible, setVisible] = useState(false)
  const [showCustomize, setShowCustomize] = useState(false)
  const [functional, setFunctional] = useState(true)
  const [marketing, setMarketing] = useState(false)

  useEffect(() => {
    const stored = getStoredConsent()
    if (!stored) {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  const handleAcceptAll = () => {
    storeConsent({ necessary: true, functional: true, marketing: false })
    setVisible(false)
  }

  const handleRejectAll = () => {
    storeConsent({ necessary: true, functional: false, marketing: false })
    setVisible(false)
  }

  const handleSavePreferences = () => {
    storeConsent({ necessary: true, functional, marketing })
    setVisible(false)
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm shadow-2xl',
        'animate-in slide-in-from-bottom-4 duration-300'
      )}
    >
      <div className="max-w-6xl mx-auto px-4 py-4">
        {!showCustomize ? (
          /* Simple banner */
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Cookie className="w-5 h-5 text-primary shrink-0 hidden sm:block" />
            <p className="text-sm text-muted-foreground flex-1">
              {t('message')}{' '}
              <Link href="/legal/cookies" className="text-primary underline hover:no-underline">
                {t('learnMore')}
              </Link>
            </p>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCustomize(true)}
                className="text-muted-foreground"
              >
                <Settings className="w-3.5 h-3.5 mr-1.5" />
                {t('customize')}
              </Button>
              <Button variant="outline" size="sm" onClick={handleRejectAll}>
                {t('rejectAll')}
              </Button>
              <Button size="sm" onClick={handleAcceptAll}>
                {t('acceptAll')}
              </Button>
            </div>
          </div>
        ) : (
          /* Customize panel */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{t('customize')}</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowCustomize(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {/* Necessary — always on */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <input
                  type="checkbox"
                  checked
                  disabled
                  className="mt-0.5 h-4 w-4 rounded border-border"
                  aria-label={t('necessary')}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{t('necessary')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('necessaryDesc')}</p>
                </div>
              </div>

              {/* Functional */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <input
                  type="checkbox"
                  checked={functional}
                  onChange={(e) => setFunctional(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border cursor-pointer"
                  aria-label={t('functional')}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{t('functional')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('functionalDesc')}</p>
                </div>
              </div>

              {/* Marketing */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border cursor-pointer"
                  aria-label={t('marketing')}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{t('marketing')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('marketingDesc')}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleRejectAll}>
                {t('rejectAll')}
              </Button>
              <Button size="sm" onClick={handleSavePreferences}>
                {t('savePreferences')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
