'use client'

import { useState } from 'react'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Bell, BellOff, X } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useTranslations } from 'next-intl'

export function NotificationPermissionPrompt() {
  const {
    isSupported,
    permission,
    isSubscribed,
    loading,
    error,
    subscribe,
    unsubscribe: _unsubscribe,
  } = usePushNotifications()

  const t = useTranslations('common.notificationPermission')
  const [dismissed, setDismissed] = useState(false)

  // Don't show if already subscribed, not supported, or user dismissed
  const shouldShow =
    isSupported && !isSubscribed && permission !== 'denied' && !dismissed

  if (!shouldShow) return null

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{t('enable')}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          {t('enableDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-3">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="flex gap-2">
          <Button onClick={subscribe} disabled={loading} size="sm">
            <Bell className="mr-2 h-4 w-4" />
            {loading ? t('enabling') : t('enable')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDismissed(true)}
          >
            {t('maybeLater')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function NotificationSettings() {
  const {
    isSupported,
    permission,
    isSubscribed,
    loading,
    error,
    subscribe,
    unsubscribe,
  } = usePushNotifications()

  const t = useTranslations('common.notificationPermission')

  if (!isSupported) {
    return (
      <Alert>
        <BellOff className="h-4 w-4" />
        <AlertDescription>
          {t('notSupported')}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">{t('pushTitle')}</h3>
          <p className="text-sm text-muted-foreground">
            {isSubscribed
              ? t('willReceive')
              : t('enableToStay')}
          </p>
        </div>
        <Button
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={loading || permission === 'denied'}
          variant={isSubscribed ? 'outline' : 'default'}
          size="sm"
        >
          {loading ? (
            t('loading')
          ) : isSubscribed ? (
            <>
              <BellOff className="mr-2 h-4 w-4" />
              {t('disable')}
            </>
          ) : (
            <>
              <Bell className="mr-2 h-4 w-4" />
              {t('enable')}
            </>
          )}
        </Button>
      </div>

      {permission === 'denied' && (
        <Alert variant="destructive">
          <AlertDescription>
            {t('blocked')}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isSubscribed && (
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertDescription>
            {t('enabled')}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
