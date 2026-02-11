'use client'

import { useAuth } from '@/hooks/use-auth'
import { useTranslations } from 'next-intl'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'
import {
  LogOut,
  Settings,
  Bot,
  CalendarDays,
  DollarSign,
  Users,
  Landmark,
  CookingPot,
  Package,
  ListChecks,
  Beer,
  Map,
  Music,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { UserRole } from '@/types'

interface QuickLink {
  labelKey: string
  href: string
  icon: React.ElementType
}

const quickLinksByRole: Record<UserRole, QuickLink[]> = {
  admin: [
    { labelKey: 'aiAssistant', href: '/assistant', icon: Bot },
    { labelKey: 'reservations', href: '/reservations', icon: CalendarDays },
    { labelKey: 'sales', href: '/sales', icon: DollarSign },
    { labelKey: 'employees', href: '/employees', icon: Users },
    { labelKey: 'finance', href: '/finance', icon: Landmark },
  ],
  owner: [
    { labelKey: 'aiAssistant', href: '/assistant', icon: Bot },
    { labelKey: 'reservations', href: '/reservations', icon: CalendarDays },
    { labelKey: 'sales', href: '/sales', icon: DollarSign },
    { labelKey: 'employees', href: '/employees', icon: Users },
    { labelKey: 'finance', href: '/finance', icon: Landmark },
  ],
  manager: [
    { labelKey: 'aiAssistant', href: '/assistant', icon: Bot },
    { labelKey: 'reservations', href: '/reservations', icon: CalendarDays },
    { labelKey: 'sales', href: '/sales', icon: DollarSign },
    { labelKey: 'employees', href: '/employees', icon: Users },
    { labelKey: 'events', href: '/events', icon: CalendarDays },
  ],
  kitchen: [
    { labelKey: 'aiAssistant', href: '/assistant', icon: Bot },
    { labelKey: 'kitchenDisplay', href: '/menu/kitchen', icon: CookingPot },
    { labelKey: 'inventory', href: '/stock', icon: Package },
    { labelKey: 'tasks', href: '/tasks', icon: ListChecks },
  ],
  bar: [
    { labelKey: 'aiAssistant', href: '/assistant', icon: Bot },
    { labelKey: 'beerKegs', href: '/stock/beer-kegs', icon: Beer },
    { labelKey: 'inventory', href: '/stock', icon: Package },
    { labelKey: 'tasks', href: '/tasks', icon: ListChecks },
  ],
  waiter: [
    { labelKey: 'aiAssistant', href: '/assistant', icon: Bot },
    { labelKey: 'reservations', href: '/reservations', icon: CalendarDays },
    { labelKey: 'floorPlan', href: '/reservations/floor-plan', icon: Map },
    { labelKey: 'tasks', href: '/tasks', icon: ListChecks },
  ],
  dj: [
    { labelKey: 'aiAssistant', href: '/assistant', icon: Bot },
    { labelKey: 'events', href: '/events', icon: Music },
    { labelKey: 'tasks', href: '/tasks', icon: ListChecks },
  ],
}

export function UserNav() {
  const { user, profile, signOut, loading } = useAuth()
  const router = useRouter()
  const t = useTranslations('common.userNav')
  const tNav = useTranslations('common.nav')

  if (loading || !user || !profile) {
    return (
      <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
    )
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleSignOut = async () => {
    await signOut()
  }

  const links = quickLinksByRole[profile.role] || []

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10 border-2 border-primary">
            <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || 'User'} />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {getInitials(profile.full_name || 'User')}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{profile.full_name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
            <p className="text-xs leading-none text-muted-foreground mt-1">
              <span className="inline-block px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                {profile.role}
              </span>
            </p>
          </div>
        </DropdownMenuLabel>
        {links.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal py-1">
                {t('quickAccess')}
              </DropdownMenuLabel>
              {links.map((link) => (
                <DropdownMenuItem key={link.href} onClick={() => router.push(link.href)}>
                  <link.icon className="mr-2 h-4 w-4" />
                  <span>{tNav(link.labelKey)}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>{t('settings')}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t('logOut')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
