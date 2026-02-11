'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { AssistantModelBadge } from './assistant-model-badge'
import { ArrowLeft, PanelLeft, PanelLeftClose } from 'lucide-react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'

interface AssistantHeaderProps {
  conversationTitle?: string | null
  activeModel?: string | null
  modelReason?: string | null
  onOpenSidebar: () => void
  sidebarCollapsed?: boolean
  onToggleSidebar?: () => void
}

export function AssistantHeader({
  conversationTitle,
  activeModel,
  modelReason,
  onOpenSidebar,
  sidebarCollapsed,
  onToggleSidebar,
}: AssistantHeaderProps) {
  const t = useTranslations('common.assistant')

  return (
    <header className="flex items-center gap-2 h-14 px-4 border-b border-border bg-card shrink-0">
      {/* Mobile sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-8 w-8"
        onClick={onOpenSidebar}
      >
        <PanelLeft className="h-4 w-4" />
      </Button>

      {/* Desktop sidebar toggle — shows when sidebar is collapsed */}
      {onToggleSidebar && (
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex h-8 w-8"
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? t('showSidebar') : t('hideSidebar')}
        >
          {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      )}

      {/* Back to app */}
      <Link href="/dashboard">
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('backToApp')}</span>
        </Button>
      </Link>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-medium truncate">
          {conversationTitle || t('title')}
        </h1>
      </div>

      {/* Model badge */}
      {activeModel && (
        <AssistantModelBadge model={activeModel} reason={modelReason} />
      )}

      <ThemeToggle />
    </header>
  )
}
