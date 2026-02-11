import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { AllergenInfoClient } from '@/components/menu/allergen-info-client'
import { Skeleton } from '@/components/ui/skeleton'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'Allergen Information | GrandCafe Cheers',
  description: 'Complete allergen information for all menu items at GrandCafe Cheers Mallorca',
}

async function getAllergenData() {
  const supabase = await createClient()

  // Fetch all menu items with allergens
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
    }
  })

  return { items: items || [], categories }
}

export default async function AllergenInfoPage() {
  const { items, categories } = await getAllergenData()

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Suspense fallback={<AllergenInfoSkeleton />}>
        <AllergenInfoClient initialItems={items} categories={categories} />
      </Suspense>
    </div>
  )
}

function AllergenInfoSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-full max-w-2xl" />
      </div>

      {/* Legend Skeleton */}
      <Skeleton className="h-[400px] w-full rounded-lg" />

      {/* Table Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    </div>
  )
}
