'use client'

import { useTranslations } from 'next-intl'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface ConversationSearchProps {
  value: string
  onChange: (value: string) => void
}

export function ConversationSearch({ value, onChange }: ConversationSearchProps) {
  const t = useTranslations('common.assistant')

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-sidebar-foreground/40" />
      <Input
        placeholder={t('searchPlaceholder')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 pl-8 text-sm text-sidebar-foreground placeholder:text-sidebar-foreground/40 bg-sidebar-accent/50 border-sidebar-border"
      />
    </div>
  )
}
