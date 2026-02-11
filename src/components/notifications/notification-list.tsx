'use client'

import { useNotifications } from '@/hooks/use-notifications'
import { NotificationItem } from './notification-item'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BellOff, CheckCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function NotificationList() {
  const { notifications, loading, unreadCount, markAsRead } = useNotifications()
  const t = useTranslations('common')

  const handleMarkAllRead = async () => {
    const unreadIds = notifications
      .filter((n) => !n.read_at)
      .map((n) => n.id)

    if (unreadIds.length > 0) {
      await markAsRead(unreadIds)
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold">{t('notifications.title')}</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            className="h-8 text-xs"
          >
            <CheckCheck className="mr-1 h-3 w-3" />
            {t('notifications.markAllRead')}
          </Button>
        )}
      </div>

      {/* Notification list */}
      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <BellOff className="mb-2 h-8 w-8" />
            <p className="text-sm">{t('notifications.empty')}</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
