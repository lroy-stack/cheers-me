'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface WaitlistEmptyStateProps {
  onAddGuest?: () => void
}

export function WaitlistEmptyState({ onAddGuest }: WaitlistEmptyStateProps) {
  const t = useTranslations('reservations')
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-cyan-500/10 p-6 mb-4">
          <Users className="h-12 w-12 text-cyan-500" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{t('waitlist.noWaiting')}</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          {t('waitlist.emptyDescription')}
        </p>
        {onAddGuest && (
          <Button onClick={onAddGuest}>
            <Plus className="mr-2 h-4 w-4" />
            {t('waitlist.addToWaitlist')}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
