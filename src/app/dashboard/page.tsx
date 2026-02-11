import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { getCurrentUser } from '@/lib/utils/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users, UtensilsCrossed, ChefHat, Package, Beer,
  BookOpen, Map, TrendingUp, Calendar, Music,
  Megaphone, Settings, Trophy, Receipt,
} from 'lucide-react'

export const metadata = {
  title: 'Dashboard | GrandCafe Cheers',
  description: 'GrandCafe Cheers management dashboard',
}

async function getDashboardStats() {
  const supabase = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  // Fetch stats in parallel
  const [reservationsRes, stockAlertsRes, employeesRes] = await Promise.all([
    supabase
      .from('reservations')
      .select('id, status', { count: 'exact' })
      .eq('date', today),
    supabase
      .from('stock_alerts')
      .select('id', { count: 'exact' })
      .eq('resolved', false),
    supabase
      .from('employees')
      .select('id', { count: 'exact' })
      .is('date_terminated', null),
  ])

  const reservations = reservationsRes.data || []
  const confirmed = reservations.filter(r => r.status === 'confirmed').length
  const pending = reservations.filter(r => r.status === 'pending').length

  return {
    reservationsTotal: reservationsRes.count || 0,
    reservationsConfirmed: confirmed,
    reservationsPending: pending,
    stockAlerts: stockAlertsRes.count || 0,
    activeStaff: employeesRes.count || 0,
  }
}

interface ModuleLink {
  labelKey: string
  href: string
  icon: React.ElementType
  roles: string[]
}

const moduleLinks: ModuleLink[] = [
  { labelKey: 'staffManagement', href: '/staff', icon: Users, roles: ['admin', 'manager'] },
  { labelKey: 'salesOverview', href: '/sales', icon: TrendingUp, roles: ['admin', 'manager'] },
  { labelKey: 'registerClose', href: '/sales/close', icon: Receipt, roles: ['admin', 'manager'] },
  { labelKey: 'menuLabel', href: '/menu', icon: UtensilsCrossed, roles: ['kitchen', 'admin', 'manager'] },
  { labelKey: 'kitchenDisplay', href: '/menu/kitchen', icon: ChefHat, roles: ['kitchen', 'admin', 'manager'] },
  { labelKey: 'inventory', href: '/stock', icon: Package, roles: ['kitchen', 'admin', 'manager'] },
  { labelKey: 'beerKegs', href: '/stock/beers', icon: Beer, roles: ['bar', 'admin', 'manager'] },
  { labelKey: 'events', href: '/events', icon: Calendar, roles: ['bar', 'dj', 'admin', 'manager'] },
  { labelKey: 'djs', href: '/events/djs', icon: Music, roles: ['dj', 'admin', 'manager'] },
  { labelKey: 'sports', href: '/events/sports', icon: Trophy, roles: ['bar', 'admin', 'manager'] },
  { labelKey: 'reservations', href: '/reservations', icon: BookOpen, roles: ['waiter', 'admin', 'manager'] },
  { labelKey: 'floorPlan', href: '/reservations/floorplan', icon: Map, roles: ['waiter', 'admin', 'manager'] },
  { labelKey: 'marketing', href: '/marketing', icon: Megaphone, roles: ['admin', 'manager'] },
  { labelKey: 'settings', href: '/settings', icon: Settings, roles: ['admin', 'manager', 'kitchen', 'bar', 'waiter', 'dj', 'owner'] },
]

export default async function DashboardPage() {
  const userData = await getCurrentUser()

  if (!userData) {
    redirect('/login')
  }

  const { profile } = userData
  const [stats, t, tProfile] = await Promise.all([
    getDashboardStats(),
    getTranslations('dashboard'),
    getTranslations('dashboard.profile'),
  ])

  const qa = await getTranslations('dashboard.quickAccess')
  const st = await getTranslations('dashboard.stats')

  const visibleModules = moduleLinks.filter(m => m.roles.includes(profile.role))

  return (
    <div className="bg-muted -m-4 md:-m-6 p-4 md:p-6 min-h-full">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-primary to-accent rounded-lg p-8 text-white shadow-lg">
          <h1 className="text-3xl font-bold">
            {t('welcome', { name: profile.full_name })}
          </h1>
          <p className="mt-2 text-primary-foreground/80">
            {t('subtitle')}
          </p>
          <Badge className="mt-4 bg-white/20 hover:bg-white/30 text-white border-white/40">
            {profile.role.toUpperCase()}
          </Badge>
        </div>

        {/* Quick Stats — Real data */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/sales">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <CardDescription>{st('activeStaff')}</CardDescription>
                <CardTitle className="text-2xl">{stats.activeStaff}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{st('activeEmployees')}</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/reservations">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <CardDescription>{st('reservationsToday')}</CardDescription>
                <CardTitle className="text-2xl">{stats.reservationsTotal}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {st('confirmedPending', { confirmed: stats.reservationsConfirmed, pending: stats.reservationsPending })}
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/staff">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <CardDescription>{st('teamSize')}</CardDescription>
                <CardTitle className="text-2xl">{stats.activeStaff}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{st('activeEmployees')}</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/stock">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <CardDescription>{st('stockAlerts')}</CardDescription>
                <CardTitle className={`text-2xl ${stats.stockAlerts > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                  {stats.stockAlerts}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {stats.stockAlerts > 0 ? st('needsAttention') : st('allGood')}
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Profile Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>{tProfile('title')}</CardTitle>
            <CardDescription>
              {tProfile('subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{tProfile('email')}</p>
                <p className="text-base">{userData.user.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{tProfile('phone')}</p>
                <p className="text-base">{profile.phone || tProfile('notSet')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{tProfile('language')}</p>
                <p className="text-base capitalize">{profile.language}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions — Clickable module links */}
        <Card>
          <CardHeader>
            <CardTitle>{qa('title')}</CardTitle>
            <CardDescription>
              {qa('subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {visibleModules.map((mod) => {
                const Icon = mod.icon
                return (
                  <Link key={mod.href} href={mod.href}>
                    <div className="flex items-center gap-2 rounded-lg border border-border p-3 hover:bg-primary/5 hover:border-primary/30 dark:hover:bg-primary/10 dark:hover:border-primary/30 transition-colors cursor-pointer">
                      <Icon className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm font-medium truncate">{qa(mod.labelKey)}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
