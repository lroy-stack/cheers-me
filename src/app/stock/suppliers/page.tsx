import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { SuppliersDashboard } from './suppliers-dashboard'
import { Skeleton } from '@/components/ui/skeleton'

export default async function SuppliersPage() {
  const t = await getTranslations('stock')
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch initial suppliers data
  const { data: suppliers, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching suppliers:', error)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('suppliers.title')}</h1>
          <p className="text-muted-foreground">
            {t('suppliers.subtitle')}
          </p>
        </div>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <SuppliersDashboard initialSuppliers={suppliers || []} />
      </Suspense>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  )
}
