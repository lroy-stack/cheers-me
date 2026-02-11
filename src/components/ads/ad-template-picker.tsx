'use client'

import type { AdTemplate } from '@/types'
import { useTranslations } from 'next-intl'
import { Trophy, Utensils, Clock, Wine, Pencil } from 'lucide-react'

interface AdTemplatePickerProps {
  selected: AdTemplate
  onChange: (template: AdTemplate) => void
}

const templates: { value: AdTemplate; icon: React.ElementType; colors: { bg: string; text: string } }[] = [
  { value: 'football_match', icon: Trophy, colors: { bg: '#1a472a', text: '#ffffff' } },
  { value: 'special_menu', icon: Utensils, colors: { bg: '#1a1a2e', text: '#c9a84c' } },
  { value: 'happy_hour', icon: Clock, colors: { bg: '#e94560', text: '#ffffff' } },
  { value: 'cocktail_presentation', icon: Wine, colors: { bg: '#2d1b4e', text: '#e8d5a0' } },
  { value: 'custom', icon: Pencil, colors: { bg: '#1a1a2e', text: '#ffffff' } },
]

export default function AdTemplatePicker({ selected, onChange }: AdTemplatePickerProps) {
  const t = useTranslations('ads.template')

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {templates.map(({ value, icon: Icon, colors }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={`relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
            selected === value
              ? 'border-primary ring-2 ring-primary/20'
              : 'border-border hover:border-primary/40'
          }`}
        >
          <div
            className="w-full h-16 rounded-md flex items-center justify-center"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            <Icon className="h-6 w-6" />
          </div>
          <span className="text-xs font-medium text-center">{t(value)}</span>
        </button>
      ))}
    </div>
  )
}
