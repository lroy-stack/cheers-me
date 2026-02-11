'use client'

import { useEffect, useState } from 'react'

export interface ServiceWorkerState {
  isSupported: boolean
  isRegistered: boolean
  isPending: boolean
  error: Error | null
}

/**
 * Hook for managing service worker registration and lifecycle
 * Handles PWA installation, updates, and offline functionality
 */
export function useServiceWorker(): ServiceWorkerState {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isPending: false,
    error: null,
  })

  useEffect(() => {
    // Check if service workers are supported
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    setState((prev) => ({ ...prev, isSupported: true }))

    let registered = false

    const registerServiceWorker = async () => {
      try {
        setState((prev) => ({ ...prev, isPending: true }))

        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        })

        registered = true
        setState((prev) => ({
          ...prev,
          isRegistered: true,
          isPending: false,
          error: null,
        }))

        console.log('Service Worker registered successfully', registration)

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is ready, notify user to refresh
                console.log('New service worker available, refresh to update')
              }
            })
          }
        })

        // Check for updates periodically
        setInterval(() => {
          registration.update().catch((err) => {
            console.error('Failed to check for service worker updates:', err)
          })
        }, 60000) // Check every minute
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setState((prev) => ({
          ...prev,
          isRegistered: registered,
          isPending: false,
          error,
        }))
        console.error('Service Worker registration failed:', error)
      }
    }

    registerServiceWorker()
  }, [])

  return state
}

/**
 * Hook for managing web push notifications
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true)
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = async () => {
    if (!isSupported) {
      console.warn('Notifications are not supported in this browser')
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      setPermission(permission)
      return permission === 'granted'
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }

  const sendNotification = (title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') {
      console.warn('Notifications are not enabled')
      return
    }

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        options,
      })
    } else {
      new Notification(title, options)
    }
  }

  const subscribeToPushNotifications = async () => {
    if (!isSupported || permission !== 'granted') {
      console.warn('Notifications are not enabled')
      return null
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })
      return subscription
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
      return null
    }
  }

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
    subscribeToPushNotifications,
  }
}
