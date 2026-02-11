'use client'

import { useTranslations } from 'next-intl'
import { TrendingUp, Calendar, FileText, Utensils, ImageIcon, Users } from 'lucide-react'
import Image from 'next/image'
import { useBranding } from '@/hooks/use-branding'
import { useAuth } from '@/hooks/use-auth'
import type { UserRole } from '@/types'

interface AssistantWelcomeProps {
  onSuggestion: (text: string) => void
}

const suggestions = [
  { icon: TrendingUp, key: 'suggestion1' },
  { icon: Calendar, key: 'suggestion2' },
  { icon: FileText, key: 'suggestion3' },
  { icon: Utensils, key: 'suggestion4' },
  { icon: ImageIcon, key: 'suggestion5' },
  { icon: Users, key: 'suggestion6' },
]

const FULL_SUGGESTIONS_ROLES: UserRole[] = ['admin', 'owner', 'manager']

export function AssistantWelcome({ onSuggestion }: AssistantWelcomeProps) {
  const t = useTranslations('common.assistant')
  const { logoUrl } = useBranding()
  const { profile } = useAuth()

  const firstName = profile?.full_name?.split(' ')[0] || ''
  const role = profile?.role
  const visibleSuggestions = role && FULL_SUGGESTIONS_ROLES.includes(role)
    ? suggestions
    : suggestions.slice(0, 4)

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 max-w-2xl mx-auto">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
        <Image src={logoUrl} alt="GrandCafe Cheers" width={32} height={32} className="h-8 w-8 object-contain" />
      </div>

      <h2 className="text-xl font-semibold mb-1">
        {firstName ? t('welcomeGreeting', { name: firstName }) : t('welcomeTitle')}
      </h2>
      {role && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary mb-2 capitalize">
          {role}
        </span>
      )}
      <p className="text-sm text-muted-foreground text-center mb-8">
        {t('welcomeDescription')}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
        {visibleSuggestions.map(({ icon: Icon, key }) => (
          <button
            key={key}
            onClick={() => onSuggestion(t(key))}
            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
          >
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm">{t(key)}</span>
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-6">{t('poweredBy')}</p>
    </div>
  )
}
