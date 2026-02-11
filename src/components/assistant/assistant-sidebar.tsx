'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConversationSearch } from './conversation-search'
import { ConversationGroup } from './conversation-group'
import { Plus, ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { locales, localeNames, type Locale } from '@/i18n/config'
import type { ConversationSummary } from '@/lib/ai/types'

interface AssistantSidebarProps {
  conversations: ConversationSummary[]
  activeConversationId: string | null
  onSelectConversation: (id: string) => void | Promise<void>
  onNewConversation: () => void
  onDeleteConversation: (id: string) => void | Promise<void>
  onRenameConversation?: (id: string, title: string) => void | Promise<void>
  onTogglePinConversation?: (id: string) => void | Promise<void>
  onOpenGallery?: () => void
}

function getLocaleFromCookie(): Locale {
  if (typeof document === 'undefined') return 'en'
  const match = document.cookie.match(/NEXT_LOCALE=(\w+)/)
  return (match?.[1] as Locale) || 'en'
}

function groupConversationsByDate(conversations: ConversationSummary[]) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)

  const pinned: ConversationSummary[] = []
  const todayGroup: ConversationSummary[] = []
  const yesterdayGroup: ConversationSummary[] = []
  const thisWeekGroup: ConversationSummary[] = []
  const olderGroup: ConversationSummary[] = []

  for (const conv of conversations) {
    if (conv.pinned) {
      pinned.push(conv)
      continue
    }

    const date = new Date(conv.last_message_at || conv.created_at)
    if (date >= today) {
      todayGroup.push(conv)
    } else if (date >= yesterday) {
      yesterdayGroup.push(conv)
    } else if (date >= weekAgo) {
      thisWeekGroup.push(conv)
    } else {
      olderGroup.push(conv)
    }
  }

  return { pinned, todayGroup, yesterdayGroup, thisWeekGroup, olderGroup }
}

export function AssistantSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  onTogglePinConversation,
  onOpenGallery,
}: AssistantSidebarProps) {
  const t = useTranslations('common.assistant')
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedModel, setSelectedModel] = useState('auto')
  const [selectedLocale, setSelectedLocale] = useState<Locale>(getLocaleFromCookie)

  const handleLocaleChange = (locale: string) => {
    const newLocale = locale as Locale
    setSelectedLocale(newLocale)
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`
    router.refresh()
  }

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return conversations
    const q = searchQuery.toLowerCase()
    return conversations.filter(c =>
      c.title?.toLowerCase().includes(q)
    )
  }, [conversations, searchQuery])

  const groups = useMemo(() => groupConversationsByDate(filtered), [filtered])

  return (
    <div className="flex flex-col h-full w-full bg-sidebar">
      {/* Header */}
      <div className="flex items-center gap-2 h-14 px-4 border-b border-sidebar-border shrink-0">
        <Image src="/icons/logoheader.png" alt="GrandCafe Cheers" width={20} height={20} className="h-5 w-5 object-contain" />
        <h2 className="text-sm font-semibold text-sidebar-foreground flex-1">
          {t('title')}
        </h2>
        {onOpenGallery && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenGallery}
            className="h-8 w-8 text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
            title={t('gallery') || 'Gallery'}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewConversation}
          className="h-8 w-8 text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
          title={t('newChat')}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 shrink-0">
        <ConversationSearch value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1 sidebar-scroll">
        <div className="px-2 pb-4 overflow-hidden">
          {groups.pinned.length > 0 && (
            <ConversationGroup
              label={t('pinned')}
              conversations={groups.pinned}
              activeId={activeConversationId}
              onSelect={onSelectConversation}
              onDelete={onDeleteConversation}
              onRename={onRenameConversation}
              onTogglePin={onTogglePinConversation}
            />
          )}
          {groups.todayGroup.length > 0 && (
            <ConversationGroup
              label={t('today')}
              conversations={groups.todayGroup}
              activeId={activeConversationId}
              onSelect={onSelectConversation}
              onDelete={onDeleteConversation}
              onRename={onRenameConversation}
              onTogglePin={onTogglePinConversation}
            />
          )}
          {groups.yesterdayGroup.length > 0 && (
            <ConversationGroup
              label={t('yesterday')}
              conversations={groups.yesterdayGroup}
              activeId={activeConversationId}
              onSelect={onSelectConversation}
              onDelete={onDeleteConversation}
              onRename={onRenameConversation}
              onTogglePin={onTogglePinConversation}
            />
          )}
          {groups.thisWeekGroup.length > 0 && (
            <ConversationGroup
              label={t('thisWeek')}
              conversations={groups.thisWeekGroup}
              activeId={activeConversationId}
              onSelect={onSelectConversation}
              onDelete={onDeleteConversation}
              onRename={onRenameConversation}
              onTogglePin={onTogglePinConversation}
            />
          )}
          {groups.olderGroup.length > 0 && (
            <ConversationGroup
              label={t('older')}
              conversations={groups.olderGroup}
              activeId={activeConversationId}
              onSelect={onSelectConversation}
              onDelete={onDeleteConversation}
              onRename={onRenameConversation}
              onTogglePin={onTogglePinConversation}
            />
          )}

          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              {searchQuery ? t('noResults') : t('noConversations')}
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Footer — Settings */}
      <div className="border-t border-sidebar-border px-3 py-3 shrink-0 space-y-2">
        {/* Model selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-sidebar-foreground/50 shrink-0 w-12">{t('model')}:</span>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="flex-1 h-7 text-xs text-sidebar-foreground border border-sidebar-border bg-sidebar-primary/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto (Haiku/Sonnet)</SelectItem>
              <SelectItem value="claude-haiku-4-5-20251001">Haiku 4.5</SelectItem>
              <SelectItem value="claude-sonnet-4-5-20250929">Sonnet 4.5</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Language selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-sidebar-foreground/50 shrink-0 w-12">{t('language')}:</span>
          <Select value={selectedLocale} onValueChange={handleLocaleChange}>
            <SelectTrigger className="flex-1 h-7 text-xs text-sidebar-foreground border border-sidebar-border bg-sidebar-primary/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {locales.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {localeNames[loc]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
