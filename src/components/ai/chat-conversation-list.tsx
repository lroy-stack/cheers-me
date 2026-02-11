'use client'

import { MessageSquare, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ConversationSummary } from '@/lib/ai/types'
import { cn } from '@/lib/utils'

interface ChatConversationListProps {
  conversations: ConversationSummary[]
  activeId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export function ChatConversationList({
  conversations,
  activeId,
  onSelect,
  onDelete,
  onClose,
}: ChatConversationListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex items-center justify-between">
        <h4 className="text-sm font-semibold">Conversations</h4>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
          Back
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {conversations.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4 text-center">No conversations yet</p>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map(conv => (
              <div
                key={conv.id}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/80 transition-colors group',
                  activeId === conv.id && 'bg-muted'
                )}
                onClick={() => onSelect(conv.id)}
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">
                    {conv.title || 'New conversation'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {conv.message_count} msgs
                    {conv.last_message_at && (
                      <> &middot; {formatRelativeTime(conv.last_message_at)}</>
                    )}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(conv.id)
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString()
}
