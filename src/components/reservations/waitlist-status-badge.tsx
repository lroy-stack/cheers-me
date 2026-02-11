'use client'

import { Badge } from '@/components/ui/badge'
import {
  Clock,
  Bell,
  Check,
  X,
  AlertCircle,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

type WaitlistStatus = 'waiting' | 'notified' | 'seated' | 'cancelled' | 'expired'

interface WaitlistStatusBadgeProps {
  status: WaitlistStatus
}

export function WaitlistStatusBadge({ status }: WaitlistStatusBadgeProps) {
  const t = useTranslations('reservations.waitlist')

  const config = {
    waiting: {
      label: t('statusWaiting'),
      icon: Clock,
      className: 'bg-primary/10 text-primary hover:bg-primary/20',
    },
    notified: {
      label: t('statusNotified'),
      icon: Bell,
      className: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
    },
    seated: {
      label: t('statusSeated'),
      icon: Check,
      className: 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
    },
    cancelled: {
      label: t('statusCancelled'),
      icon: X,
      className: 'bg-muted0/10 text-muted-foreground hover:bg-muted0/20',
    },
    expired: {
      label: t('statusExpired'),
      icon: AlertCircle,
      className: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
    },
  }

  const { label, icon: Icon, className } = config[status]

  return (
    <Badge variant="outline" className={className}>
      <Icon className="mr-1 h-3 w-3" />
      {label}
    </Badge>
  )
}
