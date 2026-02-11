import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { MovementsDashboard } from './movements-dashboard'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Stock Movements | GrandCafe Cheers',
  description: 'Track and manage stock movements',
}

async function getInitialData() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch products for the dropdown
  const { data: products } = await supabase
    .from('products')
    .select('id, name, category, unit, current_stock')
    .order('name')

  // Fetch recent movements (last 100)
  const { data: movements } = await supabase
    .from('stock_movements')
    .select(`
      *,
      product:products(
        id,
        name,
        category,
        unit
      ),
      recorded_by_employee:employees!stock_movements_recorded_by_fkey(
        id,
        profile:profiles(
          full_name,
          email
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  // Fetch waste logs
  const { data: wasteLogs } = await supabase
    .from('waste_logs')
    .select(`
      *,
      product:products(
        id,
        name,
        category,
        unit,
        cost_per_unit
      ),
      recorded_by_employee:employees!waste_logs_recorded_by_fkey(
        id,
        profile:profiles(
          full_name,
          email
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  return {
    products: (products || []).map((p) => ({
      ...p,
      min_stock: null as number | null,
      max_stock: null as number | null,
      cost_per_unit: 0,
      supplier_id: null as string | null,
      created_at: '',
      updated_at: '',
    })),
    movements: movements || [],
    wasteLogs: wasteLogs || [],
  }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  )
}

export default async function StockMovementsPage() {
  const { products, movements, wasteLogs } = await getInitialData()

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Suspense fallback={<LoadingSkeleton />}>
        <MovementsDashboard
          initialProducts={products}
          initialMovements={movements}
          initialWasteLogs={wasteLogs}
        />
      </Suspense>
    </div>
  )
}
