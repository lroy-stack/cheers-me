'use client'

import { useState, useEffect, useCallback } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if push notifications are supported
  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window

  // Initialize permission state
  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission)
    }
  }, [isSupported])

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      setError('Push notifications are not supported')
      return false
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result === 'granted'
    } catch (err) {
      setError('Failed to request notification permission')
      console.error(err)
      return false
    }
  }, [isSupported])

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError('Push notifications are not supported')
      return
    }

    if (permission !== 'granted') {
      const granted = await requestPermission()
      if (!granted) {
        setError('Notification permission denied')
        return
      }
    }

    try {
      setLoading(true)
      setError(null)

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // Subscribe to push notifications
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      setSubscription(sub)

      // Send subscription to backend
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(sub.getKey('p256dh')),
            auth: arrayBufferToBase64(sub.getKey('auth')),
          },
          device_name: getDeviceName(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save subscription')
      }

      setIsSubscribed(true)
    } catch (err) {
      setError('Failed to subscribe to push notifications')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [isSupported, permission, requestPermission])

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!subscription) return

    try {
      setLoading(true)
      setError(null)

      // Unsubscribe from push manager
      await subscription.unsubscribe()

      // Notify backend
      await fetch('/api/notifications/subscribe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
        }),
      })

      setSubscription(null)
      setIsSubscribed(false)
    } catch (err) {
      setError('Failed to unsubscribe from push notifications')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [subscription])

  // Check existing subscription on mount
  useEffect(() => {
    if (!isSupported) return

    const checkSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        const sub = await registration.pushManager.getSubscription()

        if (sub) {
          setSubscription(sub)
          setIsSubscribed(true)
        }
      } catch (err) {
        console.error('Failed to check subscription:', err)
      }
    }

    checkSubscription()
  }, [isSupported])

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
  }
}

// Helper functions
function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

function getDeviceName(): string {
  const ua = navigator.userAgent
  if (/mobile/i.test(ua)) return 'Mobile Device'
  if (/tablet|ipad/i.test(ua)) return 'Tablet'
  return 'Desktop'
}
