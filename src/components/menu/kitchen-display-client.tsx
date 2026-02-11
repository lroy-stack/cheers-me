'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { OrderCard } from './order-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Volume2, VolumeX, RefreshCw, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
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

interface KitchenDisplayClientProps {
  initialOrders: KitchenOrder[]
}

export function KitchenDisplayClient({ initialOrders }: KitchenDisplayClientProps) {
  const [orders, setOrders] = useState<KitchenOrder[]>(initialOrders)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'in_progress'>('all')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const supabase = createClient()
  const { toast } = useToast()
  const t = useTranslations('menu')

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch((err) => {
        console.error('Failed to play notification sound:', err)
      })
    }
  }, [soundEnabled])

  // Handle order status change
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const response = await fetch(`/api/kitchen/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update order status')
      }

      const updatedOrder = await response.json()

      // Update local state
      setOrders((prevOrders) =>
        prevOrders
          .map((order) => (order.id === orderId ? updatedOrder : order))
          .filter((order) => order.status === 'pending' || order.status === 'in_progress')
      )

      toast({
        title: 'Order updated',
        description: `Order ${updatedOrder.ticket_number} marked as ${newStatus.replace('_', ' ')}`,
      })
    } catch (error) {
      console.error('Error updating order:', error)
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        variant: 'destructive',
      })
    }
  }

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const { data, error } = await supabase
        .from('kitchen_orders')
        .select(`
          *,
          table:tables(
            id,
            table_number,
            section
          ),
          waiter:employees!kitchen_orders_waiter_id_fkey(
            id,
            profile:profiles(
              id,
              full_name
            )
          ),
          items:kitchen_order_items(
            id,
            menu_item_id,
            quantity,
            notes,
            status,
            created_at,
            completed_at,
            menu_item:menu_items(
              id,
              name_en,
              name_nl,
              name_es,
              prep_time_minutes,
              photo_url
            )
          )
        `)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: true })

      if (error) throw error

      setOrders(data || [])
      toast({
        title: 'Refreshed',
        description: 'Orders updated successfully',
      })
    } catch (error) {
      console.error('Error refreshing orders:', error)
      toast({
        title: 'Error',
        description: 'Failed to refresh orders',
        variant: 'destructive',
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('kitchen_orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kitchen_orders',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // New order created - fetch full details
            const { data } = await supabase
              .from('kitchen_orders')
              .select(`
                *,
                table:tables(
                  id,
                  table_number,
                  section
                ),
                waiter:employees!kitchen_orders_waiter_id_fkey(
                  id,
                  profile:profiles(
                    id,
                    full_name
                  )
                ),
                items:kitchen_order_items(
                  id,
                  menu_item_id,
                  quantity,
                  notes,
                  status,
                  created_at,
                  completed_at,
                  menu_item:menu_items(
                    id,
                    name_en,
                    name_nl,
                    name_es,
                    prep_time_minutes,
                    photo_url
                  )
                )
              `)
              .eq('id', payload.new.id)
              .single()

            if (data) {
              setOrders((prev) => [data, ...prev])
              playNotificationSound()
              toast({
                title: '🔔 New Order!',
                description: `Order ${data.ticket_number} received`,
              })
            }
          } else if (payload.eventType === 'UPDATE') {
            // Order updated
            const updatedOrder = payload.new as KitchenOrder

            setOrders((prev) => {
              // If order is no longer active (ready/served/cancelled), remove it
              if (!['pending', 'in_progress'].includes(updatedOrder.status)) {
                return prev.filter((order) => order.id !== updatedOrder.id)
              }

              // Otherwise update it
              const index = prev.findIndex((order) => order.id === updatedOrder.id)
              if (index !== -1) {
                const updated = [...prev]
                updated[index] = { ...updated[index], ...updatedOrder }
                return updated
              }

              return prev
            })
          } else if (payload.eventType === 'DELETE') {
            // Order deleted
            setOrders((prev) => prev.filter((order) => order.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, toast, playNotificationSound])

  // Filter orders based on active tab
  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'all') return true
    return order.status === activeTab
  })

  // Identify priority orders (older than 15 minutes)
  const getPriorityOrders = () => {
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000
    return filteredOrders.filter((order) => {
      const orderTime = new Date(order.created_at).getTime()
      return orderTime < fifteenMinutesAgo && order.status !== 'ready'
    })
  }

  const priorityOrders = getPriorityOrders()

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Hidden audio element for notifications */}
      <audio
        ref={audioRef}
        src="/notification-sound.mp3"
        preload="auto"
        style={{ display: 'none' }}
      />

      {/* Controls Bar */}
      <div className="bg-muted/30 border-b px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList>
              <TabsTrigger value="all">
                {t('kitchen.allOrders')}
                <Badge variant="secondary" className="ml-2">
                  {orders.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="pending">
                {t('kitchen.new')}
                <Badge variant="secondary" className="ml-2">
                  {orders.filter((o) => o.status === 'pending').length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="in_progress">
                {t('kitchen.cooking')}
                <Badge variant="secondary" className="ml-2">
                  {orders.filter((o) => o.status === 'in_progress').length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {priorityOrders.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 font-medium">
                <AlertTriangle className="h-4 w-4" />
                {t('kitchen.urgentOrders', { count: priorityOrders.length })}
              </div>
            )}

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? t('kitchen.disableSound') : t('kitchen.enableSound')}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title={t('kitchen.refreshOrders')}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-4">🍳</div>
            <h3 className="text-xl font-semibold mb-2">{t('kitchen.noOrders')}</h3>
            <p className="text-muted-foreground">
              {t('kitchen.noOrdersRealtime')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusChange={handleStatusChange}
                isPriority={priorityOrders.some((po) => po.id === order.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
