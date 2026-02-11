/**
 * Kiosk Turnstile Widget Component
 *
 * This component renders the Cloudflare Turnstile challenge widget for kiosk security.
 * It appears after PIN entry and before verification to prevent automated attacks.
 *
 * Features:
 * - Automatic theme detection (light/dark mode)
 * - Internationalized (uses user's locale)
 * - Timeout protection (30 seconds)
 * - Retry on error
 * - Loading states
 *
 * @see https://developers.cloudflare.com/turnstile/
 */

'use client'

import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import { useTheme } from 'next-themes'

type WidgetState = 'LOADING' | 'READY' | 'SUCCESS' | 'ERROR' | 'TIMEOUT'

interface KioskTurnstileWidgetProps {
  onSuccess: (token: string) => void
  onError: (error: string) => void
  onExpire: () => void
}

export function KioskTurnstileWidget({ onSuccess, onError, onExpire }: KioskTurnstileWidgetProps) {
  const t = useTranslations('kiosk')
  const locale = useLocale()
  const { resolvedTheme } = useTheme()
  const [state, setState] = useState<WidgetState>('LOADING')
  const turnstileRef = useRef<TurnstileInstance>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cloudflare Turnstile site key from environment
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  // Log configuration on mount
  useEffect(() => {
    console.log('[Turnstile] Widget mounted', {
      siteKey: siteKey ? `${siteKey.substring(0, 10)}...` : 'undefined',
      locale,
      theme: resolvedTheme
    })
  }, [])

  useEffect(() => {
    // Set timeout for widget load (30 seconds)
    timeoutRef.current = setTimeout(() => {
      if (state === 'LOADING' || state === 'READY') {
        console.error('[Turnstile] Widget timeout after 30s - check domain configuration', { state, siteKey })
        setState('TIMEOUT')
        onError(t('securityCheckTimeout'))
      }
    }, 30000)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [state, onError, t])

  const handleSuccess = (token: string) => {
    console.log('[Turnstile] Success! Token received')
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setState('SUCCESS')
    onSuccess(token)
  }

  const handleErrorCallback = () => {
    console.error('[Turnstile] Widget error callback triggered')
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setState('ERROR')
  }

  const handleExpireCallback = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setState('ERROR')
    onExpire()
  }

  const handleRetry = () => {
    setState('LOADING')
    if (turnstileRef.current) {
      turnstileRef.current.reset()
    }
    // Reset timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      if (state === 'LOADING' || state === 'READY') {
        setState('TIMEOUT')
        onError(t('securityCheckTimeout'))
      }
    }, 30000)
  }

  if (!siteKey) {
    console.error('[Turnstile] NEXT_PUBLIC_TURNSTILE_SITE_KEY is not configured')
    return (
      <div className="flex flex-col items-center space-y-4 p-6 bg-destructive/10 rounded-lg border border-destructive">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-sm text-destructive text-center">
          Turnstile configuration error. NEXT_PUBLIC_TURNSTILE_SITE_KEY is missing.
        </p>
        <p className="text-xs text-muted-foreground text-center">
          Check Vercel environment variables
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Loading State */}
      {state === 'LOADING' && (
        <div className="flex flex-col items-center space-y-2 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t('securityCheck')}</p>
        </div>
      )}

      {/* Success State (brief) */}
      {state === 'SUCCESS' && (
        <div className="flex flex-col items-center space-y-2 py-8">
          <ShieldCheck className="h-8 w-8 text-green-500" />
          <p className="text-sm text-green-600 dark:text-green-400">
            {t('securityCheckPassed') || 'Security check passed'}
          </p>
        </div>
      )}

      {/* Error State */}
      {state === 'ERROR' && (
        <div className="flex flex-col items-center space-y-4 p-6 bg-destructive/10 rounded-lg border border-destructive">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-sm text-destructive text-center">{t('securityCheckFailed')}</p>
          <Button onClick={handleRetry} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {t('retry')}
          </Button>
        </div>
      )}

      {/* Timeout State */}
      {state === 'TIMEOUT' && (
        <div className="flex flex-col items-center space-y-4 p-6 bg-destructive/10 rounded-lg border border-destructive">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-sm text-destructive text-center">{t('securityCheckTimeout')}</p>
          <Button onClick={handleRetry} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {t('retry')}
          </Button>
        </div>
      )}

      {/* Turnstile Widget */}
      <div className={state === 'READY' || state === 'LOADING' ? 'block' : 'hidden'}>
        <Turnstile
          ref={turnstileRef}
          siteKey={siteKey}
          onSuccess={handleSuccess}
          onError={handleErrorCallback}
          onExpire={handleExpireCallback}
          options={{
            theme: resolvedTheme === 'dark' ? 'dark' : 'light',
            language: locale as 'en' | 'es' | 'nl' | 'de',
            size: 'normal', // 300x65px - good for tablets
            appearance: 'always',
            retry: 'auto',
          }}
          onLoad={() => {
            console.log('[Turnstile] Widget loaded successfully')
            setState('READY')
          }}
        />
      </div>
    </div>
  )
}
