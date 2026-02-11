'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { OrderStatusBadge } from './order-status-badge'
import { Badge } from '@/components/ui/badge'
import { Clock, User, Hash, MapPin, CheckCircle2, Play } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useTranslations } from 'next-intl'

type OrderStatus = 'pending' | 'in_progress' | 'ready' | 'served' | 'cancelled'

interface KitchenOrder {
  id: string
  ticket_number: string
  table_id: string | null
  status: OrderStatus
  created_at: string
  started_at: string | null
  completed_at: string | null
  table: {
    id: string
    table_number: string
    section: string | null
  } | null
  waiter: {
    id: string
    profile: {
      id: string
      full_name: string
    }
  } | null
  items: Array<{
    id: string
    menu_item_id: string
    quantity: number
    notes: string | null
    status: OrderStatus
    created_at: string
    completed_at: string | null
    menu_item: {
      id: string
      name_en: string
      name_nl: string | null
      name_es: string | null
      prep_time_minutes: number | null
      photo_url: string | null
    }
  }>
}

interface OrderCardProps {
  order: KitchenOrder
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void
  isPriority?: boolean
}

export function OrderCard({ order, onStatusChange, isPriority = false }: OrderCardProps) {
  const t = useTranslations('menu')
  const getElapsedTime = () => {
    const startTime = order.started_at ? new Date(order.started_at) : new Date(order.created_at)
    return formatDistanceToNow(startTime, { addSuffix: false })
  }

  const getTotalItems = () => {
    return order.items.reduce((sum, item) => sum + item.quantity, 0)
  }

  const handleStartCooking = () => {
    onStatusChange(order.id, 'in_progress')
  }

  const handleMarkReady = () => {
    onStatusChange(order.id, 'ready')
  }

  return (
    <Card
      className={`transition-all hover:shadow-lg ${
        isPriority ? 'border-2 border-red-500 shadow-red-100' : ''
      } ${order.status === 'pending' ? 'bg-primary/5/50 dark:bg-primary/5' : ''} ${
        order.status === 'in_progress' ? 'bg-blue-50/50 dark:bg-blue-950/10' : ''
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Ticket Number */}
            <div className="flex items-center gap-2 mb-2">
              <Hash className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-xl font-bold">{order.ticket_number}</h3>
              {isPriority && (
                <Badge variant="destructive" className="text-xs">
                  {t('kitchen.urgent')}
                </Badge>
              )}
            </div>

            {/* Order Info */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {order.table && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {t('kitchen.tableNumber')} {order.table.table_number}
                    {order.table.section && ` (${order.table.section})`}
                  </span>
                </div>
              )}
              {order.waiter && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{order.waiter.profile.full_name}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{getElapsedTime()}</span>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <OrderStatusBadge status={order.status} />
        </div>
      </CardHeader>

      <CardContent>
        {/* Order Items */}
        <div className="space-y-2 mb-4">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-2 p-2 rounded-lg bg-background/50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-bold">
                    {item.quantity}x
                  </Badge>
                  <span className="font-medium">{item.menu_item.name_en}</span>
                </div>
                {item.notes && (
                  <p className="text-sm text-muted-foreground mt-1 ml-12 italic">
                    {t('kitchen.note', { notes: item.notes })}
                  </p>
                )}
              </div>
              {item.menu_item.prep_time_minutes && (
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  ~{item.menu_item.prep_time_minutes}min
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {order.status === 'pending' && (
            <Button onClick={handleStartCooking} className="flex-1" size="lg">
              <Play className="mr-2 h-4 w-4" />
              {t('kitchen.startCooking')}
            </Button>
          )}
          {order.status === 'in_progress' && (
            <Button onClick={handleMarkReady} className="flex-1" size="lg" variant="default">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {t('kitchen.markReady')}
            </Button>
          )}
        </div>

        {/* Footer Stats */}
        <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>{t('kitchen.totalItems', { count: getTotalItems() })}</span>
          <span>{t('kitchen.orderTime')}: {new Date(order.created_at).toLocaleTimeString('en-GB')}</span>
        </div>
      </CardContent>
    </Card>
  )
}
