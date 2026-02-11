import { Suspense } from 'react'
import { DigitalMenuClient } from '@/components/menu/digital-menu-client'
import { createClient } from '@/lib/supabase/server'
import { Skeleton } from '@/components/ui/skeleton'
import { getWebConfig } from '@/lib/utils/get-web-config'
import { ModuleDisabledPage } from '@/components/module-disabled'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getMenuData() {
  const supabase = await createClient()

  // Fetch menu items with categories and allergens
  const { data: items, error } = await supabase
    .from('v_menu_items_with_allergens')
    .select('*')
    .eq('available', true)
    .order('category_name_en, sort_order')

  if (error) {
    console.error('Error fetching menu items:', error)
    return { items: [], categories: [] }
  }

  // Get unique categories
  const categories = Array.from(
    new Set(items?.map((item) => item.category_id) || [])
  ).map((categoryId) => {
    const item = items?.find((i) => i.category_id === categoryId)
    return {
      id: categoryId,
      name_en: item?.category_name_en || '',
      name_nl: item?.category_name_nl || '',
      name_es: item?.category_name_es || '',
      name_de: item?.category_name_de || '',
    }
  })

  return { items: items || [], categories }
}

export default async function DigitalMenuPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string }>
}) {
  const webConfig = await getWebConfig()

  if (!webConfig.digital_menu_enabled) {
    return <ModuleDisabledPage module="Digital Menu" />
  }

  const { items, categories } = await getMenuData()
  const params = await searchParams
  const tableNumber = params.table || null

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<MenuSkeleton />}>
        <DigitalMenuClient
          initialItems={items}
          categories={categories}
          tableNumber={tableNumber}
        />
      </Suspense>
    </div>
  )
}

function MenuSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-10 w-48 mx-auto" />
        <Skeleton className="h-8 w-full max-w-md mx-auto rounded-full" />
      </div>

      {/* Category Tabs Skeleton */}
      <div className="flex gap-1.5 overflow-x-auto pb-2">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 shrink-0 rounded-full" />
        ))}
      </div>

      {/* Menu Items Skeleton — grid 2x2 mobile */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}
