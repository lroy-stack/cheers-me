'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type Notification = {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  data?: Record<string, unknown>
  read_at: string | null
  action_url: string | null
  created_at: string
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Fetch notifications
  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    try {
      setLoading(true)
      const url = `/api/notifications${unreadOnly ? '?unread=true' : ''}`
      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        setNotifications(data.notifications || [])
        const unread = (data.notifications || []).filter(
          (n: Notification) => !n.read_at
        ).length
        setUnreadCount(unread)
      } else {
        setError(data.error || 'Failed to fetch notifications')
      }
    } catch (err) {
      setError('Failed to fetch notifications')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Mark notifications as read
  const markAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: notificationIds }),
      })

      if (response.ok) {
        // Update local state
        setNotifications((prev) =>
          prev.map((n) =>
            notificationIds.includes(n.id)
              ? { ...n, read_at: new Date().toISOString() }
              : n
          )
        )
        setUnreadCount((prev) => Math.max(0, prev - notificationIds.length))
      }
    } catch (err) {
      console.error('Failed to mark notifications as read:', err)
    }
  }, [])

  // Delete notifications
  const deleteNotifications = useCallback(async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: notificationIds }),
      })

      if (response.ok) {
        // Update local state
        setNotifications((prev) =>
          prev.filter((n) => !notificationIds.includes(n.id))
        )
        const deletedUnreadCount = notifications.filter(
          (n) => notificationIds.includes(n.id) && !n.read_at
        ).length
        setUnreadCount((prev) => Math.max(0, prev - deletedUnreadCount))
      }
    } catch (err) {
      console.error('Failed to delete notifications:', err)
    }
  }, [notifications])

  // Subscribe to realtime notifications
  useEffect(() => {
    fetchNotifications()

    const channel = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications((prev) => [newNotification, ...prev])
          setUnreadCount((prev) => prev + 1)

          // Show browser notification if permission granted
          if (
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            new Notification(newNotification.title, {
              body: newNotification.body,
              icon: '/icons/icon-192.png',
              badge: '/icons/icon-192.png',
              tag: newNotification.id,
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchNotifications, supabase])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    deleteNotifications,
  }
}
