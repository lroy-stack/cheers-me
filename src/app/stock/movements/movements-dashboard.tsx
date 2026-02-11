'use client'

import { useState, useMemo, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { MovementHistoryTable } from '@/components/stock/movement-history-table'
import { WasteLogsTable } from '@/components/stock/waste-logs-table'
import { LogMovementDialog } from '@/components/stock/log-movement-dialog'
import { LogWasteDialog } from '@/components/stock/log-waste-dialog'
import type { Product, StockMovementWithProduct, WasteLogWithProduct } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils/currency'
import { createClient } from '@/lib/supabase/client'

interface MovementsDashboardProps {
  initialProducts: Product[]
  initialMovements: StockMovementWithProduct[]
  initialWasteLogs: WasteLogWithProduct[]
}

export function MovementsDashboard({
  initialProducts,
  initialMovements,
  initialWasteLogs,
}: MovementsDashboardProps) {
  const t = useTranslations('stock')
  const [products] = useState<Product[]>(initialProducts)
  const [movements, setMovements] = useState<StockMovementWithProduct[]>(initialMovements)
  const [wasteLogs, setWasteLogs] = useState<WasteLogWithProduct[]>(initialWasteLogs)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  // Set up realtime subscriptions
  useEffect(() => {
    const supabase = createClient()

    // Subscribe to stock_movements changes
    const movementsChannel = supabase
      .channel('stock_movements_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_movements',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the full movement with relations
            const { data } = await supabase
              .from('stock_movements')
              .select(`
                *,
                product:products(id, name, category, unit),
                recorded_by_employee:employees!stock_movements_recorded_by_fkey(
                  id,
                  profile:profiles(full_name, email)
                )
              `)
              .eq('id', payload.new.id)
              .single()

            if (data) {
              setMovements((prev) => [data as StockMovementWithProduct, ...prev])
            }
          } else if (payload.eventType === 'UPDATE') {
            setMovements((prev) =>
              prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m))
            )
          } else if (payload.eventType === 'DELETE') {
            setMovements((prev) => prev.filter((m) => m.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    // Subscribe to waste_logs changes
    const wasteChannel = supabase
      .channel('waste_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waste_logs',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the full waste log with relations
            const { data } = await supabase
              .from('waste_logs')
              .select(`
                *,
                product:products(id, name, category, unit, cost_per_unit),
                recorded_by_employee:employees!waste_logs_recorded_by_fkey(
                  id,
                  profile:profiles(full_name, email)
                )
              `)
              .eq('id', payload.new.id)
              .single()

            if (data) {
              setWasteLogs((prev) => [data as WasteLogWithProduct, ...prev])
            }
          } else if (payload.eventType === 'UPDATE') {
            setWasteLogs((prev) =>
              prev.map((w) => (w.id === payload.new.id ? { ...w, ...payload.new } : w))
            )
          } else if (payload.eventType === 'DELETE') {
            setWasteLogs((prev) => prev.filter((w) => w.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(movementsChannel)
      supabase.removeChannel(wasteChannel)
    }
  }, [])

  // Calculate KPIs
  const kpis = useMemo(() => {
    const today = new Date()
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Count movements by type (last 7 days)
    const recentMovements = movements.filter(
      (m) => new Date(m.created_at) >= last7Days
    )
    const stockIn = recentMovements.filter((m) => m.movement_type === 'in').length
    const stockOut = recentMovements.filter((m) => m.movement_type === 'out').length

    // Calculate waste value (last 30 days)
    const recentWaste = wasteLogs.filter(
      (w) => new Date(w.created_at) >= last30Days
    )
    const wasteValue = recentWaste.reduce(
      (sum, w) => sum + w.quantity * (w.product?.cost_per_unit || 0),
      0
    )

    return {
      totalMovements: movements.length,
      stockInLast7Days: stockIn,
      stockOutLast7Days: stockOut,
      wasteValueLast30Days: wasteValue,
      wasteItemsLast30Days: recentWaste.length,
    }
  }, [movements, wasteLogs])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      // Fetch movements
      const movementsRes = await fetch('/api/stock/movements?limit=100')
      if (!movementsRes.ok) throw new Error('Failed to fetch movements')
      const movementsData = await movementsRes.json()
      setMovements(movementsData)

      // Fetch waste logs
      const wasteRes = await fetch('/api/stock/waste?limit=50')
      if (!wasteRes.ok) throw new Error('Failed to fetch waste logs')
      const wasteData = await wasteRes.json()
      setWasteLogs(wasteData)

      toast({
        title: t('movementsDashboard.dataRefreshed'),
        description: t('movementsDashboard.dataRefreshedDescription'),
      })
    } catch (error) {
      console.error('Failed to refresh data:', error)
      toast({
        title: t('movementsDashboard.refreshFailed'),
        description: t('movementsDashboard.refreshFailedDescription'),
        variant: 'destructive',
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleMovementCreated = (newMovement: StockMovementWithProduct) => {
    setMovements((prev) => [newMovement, ...prev])
    toast({
      title: t('movementsDashboard.movementRecorded'),
      description: `${newMovement.movement_type.toUpperCase()}: ${Math.abs(newMovement.quantity)} ${newMovement.product.unit} of ${newMovement.product.name}`,
    })
  }

  const handleWasteLogged = (newWaste: WasteLogWithProduct) => {
    setWasteLogs((prev) => [newWaste, ...prev])
    toast({
      title: t('movementsDashboard.wasteLogged'),
      description: t('movementsDashboard.wasteLoggedDescription', { quantity: newWaste.quantity, unit: newWaste.product?.unit || '', name: newWaste.product?.name || '' }),
    })
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('movementsDashboard.title')}</h1>
          <p className="text-muted-foreground">
            {t('movementsDashboard.description')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownToLine className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">{t('movementsDashboard.stockIn7d')}</span>
            </div>
            <div className="text-2xl font-bold">{kpis.stockInLast7Days}</div>
            <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {t('movementsDashboard.deliveries')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpFromLine className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">{t('movementsDashboard.stockOut7d')}</span>
            </div>
            <div className="text-2xl font-bold">{kpis.stockOutLast7Days}</div>
            <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              {t('movementsDashboard.usage')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Trash2 className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">{t('movementsDashboard.waste30d')}</span>
            </div>
            <div className="text-2xl font-bold">{kpis.wasteItemsLast30Days}</div>
            <p className="text-xs text-red-500 mt-1">
              {t('movementsDashboard.lost', { value: formatCurrency(kpis.wasteValueLast30Days) })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">{t('movementsDashboard.totalMovements')}</span>
            </div>
            <div className="text-2xl font-bold">{kpis.totalMovements}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('movementsDashboard.allTime')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs with Movement History and Waste Logs */}
      <Tabs defaultValue="movements" className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="movements">{t('movementsDashboard.movementHistory')}</TabsTrigger>
            <TabsTrigger value="waste">{t('movementsDashboard.wasteLogs')}</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <LogMovementDialog products={products} onMovementCreated={handleMovementCreated} />
            <LogWasteDialog products={products} onWasteLogged={handleWasteLogged} />
          </div>
        </div>

        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle>{t('movementsDashboard.movementHistory')}</CardTitle>
              <CardDescription>
                {t('movementsDashboard.movementHistoryDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MovementHistoryTable movements={movements} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="waste">
          <Card>
            <CardHeader>
              <CardTitle>{t('movementsDashboard.wasteLogs')}</CardTitle>
              <CardDescription>
                {t('movementsDashboard.wasteLogsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WasteLogsTable wasteLogs={wasteLogs} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
