'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { useAuthContext } from '@/components/providers/auth-provider'
import type { UserRole } from '@/types'
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Clock,
  UtensilsCrossed,
  ChefHat,
  Smartphone,
  ShieldAlert,
  Package,
  Beer,
  ArrowLeftRight,
  Truck,
  BookOpen,
  Map,
  ListOrdered,
  TrendingUp,
  Receipt,
  Coins,
  Wallet,
  Calendar,
  Music,
  Trophy,
  Megaphone,
  PenSquare,
  Mail,
  Settings,
  Ticket,
  PiggyBank,
  FileText,
  Heart,
  Star,
  Monitor,
  Wine,
  CreditCard,
  MessageSquare,
  Bot,
  Gift,
  Newspaper,
  Building2,
  CalendarDays,
} from 'lucide-react'

interface NavItem {
  labelKey: string
  href: string
  icon: React.ElementType
  roles?: UserRole[]
}

interface NavGroup {
  titleKey: string
  items: NavItem[]
  roles?: UserRole[]
}

const ALL_ROLES: UserRole[] = ['admin', 'manager', 'owner', 'kitchen', 'bar', 'waiter', 'dj']

const navGroups: NavGroup[] = [
  {
    titleKey: 'general',
    items: [
      { labelKey: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
      { labelKey: 'aiAssistant', href: '/assistant', icon: Bot },
    ],
  },
  {
    titleKey: 'staff',
    items: [
      { labelKey: 'employees', href: '/staff', icon: Users, roles: ['admin', 'manager', 'owner'] },
      { labelKey: 'schedule', href: '/staff/schedule', icon: CalendarClock, roles: ['admin', 'manager', 'owner'] },
      { labelKey: 'mySchedule', href: '/staff/my-schedule', icon: CalendarDays, roles: ALL_ROLES },
      { labelKey: 'timeClock', href: '/staff/clock', icon: Clock, roles: ALL_ROLES },
      { labelKey: 'feedback', href: '/staff/feedback', icon: MessageSquare, roles: ['admin', 'manager', 'owner'] },
      { labelKey: 'tasks', href: '/staff/tasks', icon: ListOrdered, roles: ALL_ROLES },
      { labelKey: 'resources', href: '/staff/resources', icon: BookOpen, roles: ALL_ROLES },
    ],
  },
  {
    titleKey: 'menu',
    items: [
      { labelKey: 'overview', href: '/menu', icon: UtensilsCrossed, roles: ['admin', 'manager', 'owner', 'kitchen'] },
      { labelKey: 'builder', href: '/menu/builder', icon: PenSquare, roles: ['admin', 'manager', 'owner', 'kitchen'] },
      { labelKey: 'kitchenDisplay', href: '/menu/kitchen', icon: ChefHat, roles: ['admin', 'manager', 'kitchen'] },
      { labelKey: 'allergens', href: '/menu/allergens', icon: ShieldAlert, roles: ['admin', 'manager', 'owner', 'kitchen'] },
      { labelKey: 'recipes', href: '/menu/recipes', icon: Wine, roles: ALL_ROLES },
    ],
  },
  {
    titleKey: 'stock',
    roles: ['admin', 'manager', 'kitchen', 'bar'],
    items: [
      { labelKey: 'inventory', href: '/stock', icon: Package },
      { labelKey: 'beerKegs', href: '/stock/beers', icon: Beer, roles: ['admin', 'manager', 'bar'] },
      { labelKey: 'movements', href: '/stock/movements', icon: ArrowLeftRight },
      { labelKey: 'suppliers', href: '/stock/suppliers', icon: Truck },
    ],
  },
  {
    titleKey: 'reservations',
    roles: ['admin', 'manager', 'owner', 'waiter'],
    items: [
      { labelKey: 'overview', href: '/reservations', icon: BookOpen },
      { labelKey: 'floorPlan', href: '/reservations/floorplan', icon: Map },
      { labelKey: 'waitlist', href: '/reservations/waitlist', icon: ListOrdered },
    ],
  },
  {
    titleKey: 'sales',
    roles: ['admin', 'manager', 'owner'],
    items: [
      { labelKey: 'overview', href: '/sales', icon: TrendingUp },
      { labelKey: 'registerClose', href: '/sales/close', icon: Receipt },
      { labelKey: 'tips', href: '/sales/tips', icon: Coins },
      { labelKey: 'expenses', href: '/sales/expenses', icon: Wallet },
    ],
  },
  {
    titleKey: 'events',
    roles: ['admin', 'manager', 'bar', 'dj'],
    items: [
      { labelKey: 'calendar', href: '/events', icon: Calendar },
      { labelKey: 'djs', href: '/events/djs', icon: Music },
      { labelKey: 'sports', href: '/events/sports', icon: Trophy },
    ],
  },
  {
    titleKey: 'marketing',
    roles: ['admin', 'manager'],
    items: [
      { labelKey: 'contentCalendar', href: '/marketing', icon: Megaphone },
      { labelKey: 'createPost', href: '/marketing/create', icon: PenSquare },
      { labelKey: 'newsletter', href: '/marketing/newsletter', icon: Mail },
    ],
  },
  {
    titleKey: 'advertising',
    roles: ['admin', 'manager', 'owner'],
    items: [
      { labelKey: 'adsOverview', href: '/ads', icon: Newspaper },
      { labelKey: 'giftCoupons', href: '/coupons', icon: Gift, roles: ['admin', 'manager', 'owner', 'waiter', 'bar'] },
    ],
  },
  {
    titleKey: 'finance',
    roles: ['admin', 'manager', 'owner'],
    items: [
      { labelKey: 'dashboard', href: '/finance', icon: PiggyBank },
      { labelKey: 'reports', href: '/finance/reports', icon: FileText },
    ],
  },
  {
    titleKey: 'customers',
    roles: ['admin', 'manager', 'waiter'],
    items: [
      { labelKey: 'crm', href: '/customers', icon: Heart },
      { labelKey: 'reviews', href: '/customers/reviews', icon: Star },
    ],
  },
  {
    titleKey: 'public',
    items: [
      { labelKey: 'digitalMenu', href: '/menu/digital', icon: Smartphone },
      { labelKey: 'kiosk', href: '/kiosk', icon: Monitor },
      { labelKey: 'publicForm', href: '/booking', icon: Ticket },
    ],
  },
  {
    titleKey: 'account',
    items: [
      { labelKey: 'settings', href: '/settings', icon: Settings },
      { labelKey: 'restaurantSettings', href: '/settings/restaurant', icon: Building2, roles: ['admin', 'manager', 'owner'] },
      { labelKey: 'scheduleSettings', href: '/settings/schedule', icon: CalendarClock, roles: ['admin', 'manager', 'owner'] },
      { labelKey: 'fiscalSettings', href: '/settings/fiscal', icon: FileText, roles: ['admin', 'manager', 'owner'] },
      { labelKey: 'posSettings', href: '/settings/pos', icon: CreditCard, roles: ['admin', 'manager', 'owner'] },
    ],
  },
]

function isAllowed(roles: UserRole[] | undefined, userRole: UserRole | undefined): boolean {
  if (!roles) return true
  if (!userRole) return false
  return roles.includes(userRole)
}

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const t = useTranslations('common.nav')
  const { profile } = useAuthContext()
  const userRole = profile?.role

  return (
    <nav className="flex flex-col gap-1 py-4 overflow-y-auto h-full">
      {navGroups.map((group) => {
        if (!isAllowed(group.roles, userRole)) return null

        const visibleItems = group.items.filter((item) =>
          isAllowed(item.roles, userRole)
        )

        if (visibleItems.length === 0) return null

        return (
          <div key={group.titleKey} className="px-3 mb-2">
            <p className="px-2 mb-1 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              {t(group.titleKey)}
            </p>
            {visibleItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-primary/15 text-sidebar-primary'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {t(item.labelKey)}
                </Link>
              )
            })}
          </div>
        )
      })}
    </nav>
  )
}
