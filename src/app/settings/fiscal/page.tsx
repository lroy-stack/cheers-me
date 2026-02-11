'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { FiscalSettingsForm } from '@/components/settings/fiscal-settings-form'
import { Toaster } from '@/components/ui/toaster'

export default function FiscalSettingsPage() {
  const t = useTranslations('settings.fiscal')

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      <FiscalSettingsForm />

      <Toaster />
    </div>
  )
}
