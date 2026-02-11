'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { AppSidebar } from './app-sidebar'
import { UserNav } from './user-nav'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { Menu } from 'lucide-react'
import Image from 'next/image'
import { useBranding } from '@/hooks/use-branding'
// LazyChatPanel removed — AI assistant is now a dedicated page at /assistant

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const t = useTranslations('common.shell')
  const { logoUrl } = useBranding()

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 border-r border-sidebar-border bg-sidebar no-print">
        {/* Logo */}
        <div className="flex items-center gap-3 h-16 px-4 border-b border-sidebar-border">
          <Image src={logoUrl} alt="Cheers Mallorca" width={32} height={32} className="shrink-0" />
          <div>
            <h1 className="text-sm font-bold text-sidebar-foreground leading-tight">
              {t('brandName')}
            </h1>
            <p className="text-xs text-sidebar-foreground/60">
              {t('brandLocation')}
            </p>
          </div>
        </div>
        <AppSidebar />
      </aside>

      {/* Mobile sidebar (Sheet) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 no-print bg-sidebar">
          <SheetTitle className="sr-only">{t('navigation')}</SheetTitle>
          <div className="flex items-center gap-3 h-16 px-4 border-b border-sidebar-border">
            <Image src={logoUrl} alt="Cheers Mallorca" width={32} height={32} className="shrink-0" />
            <div>
              <h1 className="text-sm font-bold text-sidebar-foreground leading-tight">
                {t('brandName')}
              </h1>
              <p className="text-xs text-sidebar-foreground/60">
                {t('brandLocation')}
              </p>
            </div>
          </div>
          <AppSidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content area */}
      <div className="flex flex-col flex-1 md:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-40 border-b border-border bg-card no-print">
          <div className="flex h-16 items-center px-4 sm:px-6 lg:px-8">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden mr-2"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex-1" />

            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <NotificationBell />
              <UserNav />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>

    </div>
  )
}
