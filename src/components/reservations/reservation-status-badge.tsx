'use client'

import { Badge } from '@/components/ui/badge'
import { useTranslations } from 'next-intl'
import {
  Clock,
  CheckCircle2,
  Users,
  CheckCheck,
  XCircle,
  UserX
} from 'lucide-react'

type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'seated'
  | 'completed'
  | 'cancelled'
  | 'no_show'

interface ReservationStatusBadgeProps {
  status: ReservationStatus
  className?: string
}

const statusConfig = {
  pending: {
    labelKey: 'overview.pending' as const,
    variant: 'secondary' as const,
    icon: Clock,
    className: 'bg-primary/10 text-primary dark:bg-primary/10 dark:text-primary',
  },
  confirmed: {
    labelKey: 'overview.confirmed' as const,
    variant: 'default' as const,
    icon: CheckCircle2,
    className: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400',
  },
  seated: {
    labelKey: 'overview.seated' as const,
    variant: 'default' as const,
    icon: Users,
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  },
  completed: {
    labelKey: 'overview.completed' as const,
    variant: 'default' as const,
    icon: CheckCheck,
    className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  },
  cancelled: {
    labelKey: 'overview.cancelled' as const,
    variant: 'secondary' as const,
    icon: XCircle,
    className: 'bg-muted text-foreground dark:bg-muted dark:text-muted-foreground',
  },
  no_show: {
    labelKey: 'overview.noShow' as const,
    variant: 'destructive' as const,
    icon: UserX,
    className: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  },
}

export function ReservationStatusBadge({ status, className }: ReservationStatusBadgeProps) {
  const t = useTranslations('reservations')
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={`${config.className} ${className || ''}`}>
      <Icon className="mr-1 h-3 w-3" />
      {t(config.labelKey)}
    </Badge>
  )
}
