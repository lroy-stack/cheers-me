'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  ProductWithSupplier,
  Supplier,
  BeerKegWithProduct,
  StockAlertWithProduct,
} from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Plus,
  Package,
  AlertTriangle,
  TrendingDown,
  Beer,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { ProductList } from '@/components/stock/product-list'
import { AddProductDialog } from '@/components/stock/add-product-dialog'
import { BeerKegGrid, BeerKegStats } from '@/components/stock/beer-keg-grid'
import { createClient } from '@/lib/supabase/client'

interface InventoryDashboardProps {
  initialProducts: ProductWithSupplier[]
  initialSuppliers: Supplier[]
  initialKegs: BeerKegWithProduct[]
  initialAlerts: StockAlertWithProduct[]
}

export function InventoryDashboard({
  initialProducts,
  initialSuppliers,
  initialKegs,
  initialAlerts,
}: InventoryDashboardProps) {
  const t = useTranslations('stock')
  const [products, setProducts] = useState(initialProducts)
  const [suppliers] = useState(initialSuppliers)
  const [kegs, setKegs] = useState(initialKegs)
  const [alerts, setAlerts] = useState(initialAlerts)
  const [addProductOpen, setAddProductOpen] = useState(false)
  const [addStockProduct, setAddStockProduct] = useState<ProductWithSupplier | null>(null)
  const [addStockQuantity, setAddStockQuantity] = useState(1)
  const [addStockLoading, setAddStockLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  // Calculate stats
  const lowStockProducts = products.filter(
    (p) => p.min_stock !== null && p.current_stock < p.min_stock
  )
  const outOfStockProducts = products.filter((p) => p.current_stock === 0)
  const totalStockValue = products.reduce(
    (sum, p) => sum + p.current_stock * p.cost_per_unit,
    0
  )
  const unresolvedAlerts = alerts.filter((a) => !a.resolved)

  // Set up realtime subscriptions
  useEffect(() => {
    const supabase = createClient()

    // Subscribe to products changes
    const productsChannel = supabase
      .channel('products_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          refreshData()
        }
      )
      .subscribe()

    // Subscribe to kegs changes
    const kegsChannel = supabase
      .channel('kegs_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kegs' },
        () => {
          refreshData()
        }
      )
      .subscribe()

    // Subscribe to alerts changes
    const alertsChannel = supabase
      .channel('alerts_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stock_alerts' },
        () => {
          refreshData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(productsChannel)
      supabase.removeChannel(kegsChannel)
      supabase.removeChannel(alertsChannel)
    }
  }, [])

  const refreshData = async () => {
    setIsRefreshing(true)
    const supabase = createClient()

    try {
      const [productsResult, kegsResult, alertsResult] = await Promise.all([
        supabase
          .from('products')
          .select(
            `
            *,
            supplier:suppliers(
              id,
              name,
              contact_person,
              email,
              phone
            )
          `
          )
          .order('name'),
        supabase
          .from('kegs')
          .select(
            `
            *,
            product:products(
              id,
              name,
              category
            )
          `
          )
          .eq('status', 'active')
          .order('current_liters'),
        supabase
          .from('stock_alerts')
          .select(
            `
            *,
            product:products(
              id,
              name,
              category,
              current_stock,
              min_stock,
              unit
            )
          `
          )
          .eq('resolved', false)
          .order('created_at', { ascending: false }),
      ])

      if (productsResult.data) setProducts(productsResult.data)
      if (kegsResult.data) {
        const kegsWithStats = kegsResult.data.map((keg) => ({
          ...keg,
          percent_remaining: (keg.current_liters / keg.initial_liters) * 100,
          liters_consumed: keg.initial_liters - keg.current_liters,
        }))
        setKegs(kegsWithStats)
      }
      if (alertsResult.data) setAlerts(alertsResult.data)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleAddStock = async () => {
    if (!addStockProduct || addStockQuantity <= 0) return
    setAddStockLoading(true)
    try {
      const response = await fetch('/api/stock/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: addStockProduct.id,
          movement_type: 'in',
          quantity: addStockQuantity,
          reason: t('inventory.stockReceived'),
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || t('inventory.addStockFailed'))
      }
      toast({
        title: t('inventory.stockAdded'),
        description: t('inventory.stockAddedDescription', {
          quantity: addStockQuantity,
          unit: addStockProduct.unit,
          name: addStockProduct.name,
        }),
      })
      setAddStockProduct(null)
      setAddStockQuantity(1)
      refreshData()
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('inventory.addStockFailed'),
        variant: 'destructive',
      })
    } finally {
      setAddStockLoading(false)
    }
  }

  const handleResolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/stock/alerts/${alertId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: true }),
      })

      if (response.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId))
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('dashboard.totalStockValue')}</p>
                <p className="text-2xl font-bold">{'\u20ac'}{totalStockValue.toFixed(2)}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('dashboard.lowStockItems')}</p>
                <p className="text-2xl font-bold text-primary">{lowStockProducts.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('dashboard.outOfStock')}</p>
                <p className="text-2xl font-bold text-red-500">{outOfStockProducts.length}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('dashboard.activeKegs')}</p>
                <p className="text-2xl font-bold">{kegs.length}</p>
              </div>
              <Beer className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {unresolvedAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('alerts.activeAlerts')}</h2>
            <Badge variant="destructive">{unresolvedAlerts.length}</Badge>
          </div>
          <div className="space-y-2">
            {unresolvedAlerts.slice(0, 5).map((alert) => (
              <Alert key={alert.id}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="flex items-center justify-between">
                  <span>{alert.alert_type}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResolveAlert(alert.id)}
                  >
                    {t('alerts.resolve')}
                  </Button>
                </AlertTitle>
                <AlertDescription>
                  {alert.message} -{' '}
                  <span className="font-medium">{alert.product.name}</span>
                </AlertDescription>
              </Alert>
            ))}
            {unresolvedAlerts.length > 5 && (
              <p className="text-sm text-muted-foreground">
                {t('alerts.moreAlerts', { count: unresolvedAlerts.length - 5 })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="products" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="products">{t('dashboard.products')}</TabsTrigger>
            <TabsTrigger value="beer-kegs">
              {t('dashboard.beerKegs')}
              {kegs.filter((k) => k.percent_remaining < 20).length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {kegs.filter((k) => k.percent_remaining < 20).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              {t('common.refresh')}
            </Button>
            <Button size="sm" onClick={() => setAddProductOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('dashboard.addProduct')}
            </Button>
          </div>
        </div>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.inventoryOverview')}</CardTitle>
              <CardDescription>
                {t('dashboard.inventoryOverviewDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProductList products={products} onAddStock={(product) => {
                setAddStockProduct(product)
                setAddStockQuantity(1)
              }} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="beer-kegs" className="space-y-4">
          <BeerKegStats kegs={kegs} />
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.activeBeerKegs')}</CardTitle>
              <CardDescription>
                {t('dashboard.activeBeerKegsDescription', { count: kegs.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BeerKegGrid kegs={kegs} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Product Dialog */}
      <AddProductDialog
        open={addProductOpen}
        onOpenChange={setAddProductOpen}
        onSuccess={refreshData}
        suppliers={suppliers}
      />

      {/* Add Stock Dialog */}
      <Dialog open={!!addStockProduct} onOpenChange={(open) => !open && setAddStockProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('inventory.addStock')}</DialogTitle>
            <DialogDescription>
              {addStockProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">{t('inventory.currentStock')}</span>
                <span className="text-2xl font-bold">
                  {addStockProduct?.current_stock} {addStockProduct?.unit}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add_qty">{t('inventory.quantityToAdd')}</Label>
              <Input
                id="add_qty"
                type="number"
                min="1"
                step="1"
                value={addStockQuantity}
                onChange={(e) => setAddStockQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStockProduct(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddStock} disabled={addStockLoading}>
              {addStockLoading ? t('common.saving') : t('inventory.addStock')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
