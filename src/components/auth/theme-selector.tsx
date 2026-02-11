'use client'

import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const t = useTranslations('settings.appearance')

  const options = [
    { value: 'light', icon: Sun, label: t('light'), desc: t('lightDesc') },
    { value: 'dark', icon: Moon, label: t('dark'), desc: t('darkDesc') },
    { value: 'system', icon: Monitor, label: t('system'), desc: t('systemDesc') },
  ] as const

  return (
    <div className="grid grid-cols-3 gap-3">
      {options.map(({ value, icon: Icon, label, desc }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors hover:bg-accent',
            theme === value
              ? 'border-primary bg-primary/10'
              : 'border-transparent bg-muted/50'
          )}
        >
          <Icon className="h-6 w-6" />
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground text-center">{desc}</span>
        </button>
      ))}
    </div>
  )
}
