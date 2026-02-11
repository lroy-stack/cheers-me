'use client'

import { Badge } from '@/components/ui/badge'
import { Clock, Flame, CheckCircle2, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

type OrderStatus = 'pending' | 'in_progress' | 'ready' | 'served' | 'cancelled'

interface OrderStatusBadgeProps {
  status: OrderStatus
  className?: string
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const t = useTranslations('menu')

  const config: Record<
    OrderStatus,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }
  > = {
    pending: {
      label: t('kitchen.newOrders'),
      variant: 'default',
      icon: <Clock className="h-3 w-3" />,
    },
    in_progress: {
      label: t('kitchen.inProgress'),
      variant: 'secondary',
      icon: <Flame className="h-3 w-3" />,
    },
    ready: {
      label: t('kitchen.ready'),
      variant: 'outline',
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    served: {
      label: t('kitchen.completed'),
      variant: 'outline',
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    cancelled: {
      label: t('kitchen.cancelled'),
      variant: 'destructive',
      icon: <XCircle className="h-3 w-3" />,
    },
  }

  const { label, variant, icon } = config[status]

  return (
    <Badge variant={variant} className={className}>
      <span className="flex items-center gap-1">
        {icon}
        {label}
      </span>
    </Badge>
  )
}
