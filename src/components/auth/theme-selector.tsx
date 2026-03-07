'use client'

import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const t = useTranslations('settings.appearance')

  const options = [
    { value: 'light', icon: Sun, label: t('light'), desc: t('lightDesc') },
    { value: 'dark', icon: Moon, label: t('dark'), desc: t('darkDesc') },
    { value: 'system', icon: Monitor, label: t('system'), desc: t('systemDesc') },
  ] as const

  async function handleThemeChange(value: 'light' | 'dark' | 'system') {
    setTheme(value)
    // Persist to DB (fire-and-forget, non-critical)
    try {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: value }),
      })
    } catch {
      // Non-critical — theme already applied locally via next-themes
    }
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {options.map(({ value, icon: Icon, label, desc }) => (
        <Button
          key={value}
          variant="ghost"
          onClick={() => handleThemeChange(value)}
          className={cn(
            'flex flex-col items-center gap-2 rounded-lg border-2 h-auto p-4 transition-colors',
            theme === value
              ? 'border-primary bg-primary/10'
              : 'border-transparent bg-muted/50'
          )}
        >
          <Icon className="h-6 w-6" />
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground text-center">{desc}</span>
        </Button>
      ))}
    </div>
  )
}
