import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { InventoryDashboard } from './inventory-dashboard'
import { Skeleton } from '@/components/ui/skeleton'

export default async function StockPage() {
  const t = await getTranslations('stock')
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch initial data for the inventory dashboard
  const [productsResult, suppliersResult, kegsResult, alertsResult] = await Promise.all([
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
    supabase.from('suppliers').select('*').order('name'),
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

  // Calculate keg percentages
  const kegsWithStats = (kegsResult.data || []).map((keg) => ({
    ...keg,
    percent_remaining: (keg.current_liters / keg.initial_liters) * 100,
    liters_consumed: keg.initial_liters - keg.current_liters,
  }))

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('inventory.subtitle')}
          </p>
        </div>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <InventoryDashboard
          initialProducts={productsResult.data || []}
          initialSuppliers={suppliersResult.data || []}
          initialKegs={kegsWithStats}
          initialAlerts={alertsResult.data || []}
        />
      </Suspense>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  )
}
