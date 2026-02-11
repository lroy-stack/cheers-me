'use client'

import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface ResourceSearchProps {
  value: string
  onChange: (value: string) => void
}

export function ResourceSearch({ value, onChange }: ResourceSearchProps) {
  const t = useTranslations('resources')

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={t('searchPlaceholder')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10"
      />
    </div>
  )
}
