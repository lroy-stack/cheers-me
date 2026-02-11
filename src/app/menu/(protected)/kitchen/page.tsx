import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/utils/auth'
import { redirect } from 'next/navigation'
import { KitchenDisplayClient } from '@/components/menu/kitchen-display-client'
import { getTranslations } from 'next-intl/server'

export default async function KitchenDisplayPage() {
  const t = await getTranslations('menu')
  // Check authentication and role
  const userData = await getCurrentUser()

  if (!userData) {
    redirect('/login')
  }

  // Only kitchen staff, managers, and admins can access KDS
  if (!['admin', 'manager', 'kitchen'].includes(userData.profile.role)) {
    redirect('/dashboard')
  }

  const supabase = await createClient()

  // Fetch active kitchen orders (pending or in_progress)
  const { data: orders, error } = await supabase
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

  if (error) {
    console.error('Error fetching kitchen orders:', error)
  }

  return (
    <div className="-m-4 md:-m-6 h-full flex flex-col">
      {/* Header */}
      <div className="bg-background border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('kitchen.title')}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('kitchen.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('en-GB', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Client-side component with real-time updates */}
      <KitchenDisplayClient initialOrders={orders || []} />
    </div>
  )
}
