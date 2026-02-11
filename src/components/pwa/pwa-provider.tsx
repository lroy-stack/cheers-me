'use client'

import { useEffect } from 'react'
import { useServiceWorker, usePushNotifications } from '@/hooks/use-service-worker'
import { PwaInstallPrompt } from './install-prompt'

/**
 * PWA Provider Component
 * Initializes all PWA features: service worker, push notifications, install prompt
 */
export function PwaProvider({ children }: { children: React.ReactNode }) {
  useServiceWorker()
  const pushNotifications = usePushNotifications()

  useEffect(() => {
    // Initialize push notifications if permission was already granted
    if (pushNotifications.permission === 'granted') {
      pushNotifications.subscribeToPushNotifications().catch((error) => {
        console.error('Failed to subscribe to push notifications:', error)
      })
    }
  }, [pushNotifications])

  return (
    <>
      {children}
      <PwaInstallPrompt />
    </>
  )
}
