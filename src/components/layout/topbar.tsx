'use client'

import { UserNav } from './user-nav'
import { Button } from '@/components/ui/button'
import { Bell, Menu } from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useBranding } from '@/hooks/use-branding'

export function Topbar() {
  const t = useTranslations('common')
  const { logoUrl } = useBranding()

  return (
    <div className="border-b border-border bg-card">
      <div className="flex h-16 items-center px-4 sm:px-6 lg:px-8">
        {/* Mobile menu button */}
        <Button variant="ghost" size="icon" className="md:hidden mr-2">
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo/Brand */}
        <div className="flex items-center space-x-3">
          <Image src={logoUrl} alt="Cheers Mallorca" width={32} height={32} />
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-foreground">
              {t('shell.brandName')}
            </h1>
            <p className="text-xs text-muted-foreground">
              {t('shell.brandLocation')}
            </p>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side actions */}
        <div className="flex items-center space-x-2">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
          </Button>

          {/* User menu */}
          <UserNav />
        </div>
      </div>
    </div>
  )
}
