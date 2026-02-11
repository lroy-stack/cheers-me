'use client'

import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'
import { Notification } from '@/hooks/use-notifications'
import { useNotifications } from '@/hooks/use-notifications'
import { cn } from '@/lib/utils'
import {
  Calendar,
  CalendarCheck,
  CalendarPlus,
  CalendarX,
  Clock,
  Users,
  Bell,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  schedule_published: Calendar,
  shift_assigned: CalendarCheck,
  shift_changed: Calendar,
  shift_reminder: Clock,
  swap_requested: Users,
  swap_approved: CalendarCheck,
  swap_rejected: CalendarX,
  clock_reminder: Clock,
  system: Bell,
  reservation_new: CalendarPlus,
  reservation_confirmed: CalendarCheck,
  reservation_cancelled: CalendarX,
}

interface NotificationItemProps {
  notification: Notification
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const router = useRouter()
  const { markAsRead, deleteNotifications } = useNotifications()
  const t = useTranslations('common')

  const Icon = iconMap[notification.type] || Bell
  const isUnread = !notification.read_at

  const handleClick = async () => {
    // Mark as read
    if (isUnread) {
      await markAsRead([notification.id])
    }

    // Navigate to action URL if provided
    if (notification.action_url) {
      router.push(notification.action_url)
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteNotifications([notification.id])
  }

  return (
    <div
      className={cn(
        'group relative flex cursor-pointer gap-3 p-4 transition-colors hover:bg-muted/50',
        isUnread && 'bg-primary/5'
      )}
      onClick={handleClick}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
          isUnread ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 space-y-1">
        <p className={cn('text-sm', isUnread && 'font-semibold')}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground">{notification.body}</p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
          })}
        </p>
      </div>

      {/* Unread indicator and delete button */}
      <div className="flex flex-col items-end justify-between">
        {isUnread && (
          <div className="h-2 w-2 rounded-full bg-primary"></div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={handleDelete}
        >
          <X className="h-3 w-3" />
          <span className="sr-only">{t('notifications.deleteNotification')}</span>
        </Button>
      </div>
    </div>
  )
}
