'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MoreHorizontal, Pencil, Pin, PinOff, Trash2, MessageSquare } from 'lucide-react'
import type { ConversationSummary } from '@/lib/ai/types'

interface ConversationGroupProps {
  label: string
  conversations: ConversationSummary[]
  activeId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onRename?: (id: string, title: string) => void
  onTogglePin?: (id: string) => void
}

export function ConversationGroup({
  label,
  conversations,
  activeId,
  onSelect,
  onDelete,
  onRename,
  onTogglePin,
}: ConversationGroupProps) {
  const t = useTranslations('common.assistant')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingId])

  const handleRenameSubmit = (id: string) => {
    const trimmed = renameValue.trim()
    if (trimmed && onRename) {
      onRename(id, trimmed)
    }
    setRenamingId(null)
    setRenameValue('')
  }

  return (
    <div className="mb-3">
      <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
        {label}
      </p>
      {conversations.map((conv) => {
        const isActive = activeId === conv.id

        return (
          <div
            key={conv.id}
            className={cn(
              'group relative flex items-center gap-2 rounded-md px-2 pr-1 py-1.5 text-sm cursor-pointer transition-colors overflow-hidden',
              isActive
                ? 'bg-sidebar-primary/15 text-sidebar-primary'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
            onClick={() => {
              if (renamingId !== conv.id) {
                onSelect(conv.id)
              }
            }}
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" />

            {renamingId === conv.id ? (
              <input
                ref={renameInputRef}
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameSubmit(conv.id)
                  } else if (e.key === 'Escape') {
                    setRenamingId(null)
                    setRenameValue('')
                  }
                }}
                onBlur={() => handleRenameSubmit(conv.id)}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 min-w-0 text-sm bg-transparent border border-primary/30 rounded px-1 py-0 outline-none focus:border-primary"
              />
            ) : (
              <span
                className="flex-1 min-w-0 truncate text-sm"
                title={conv.title || t('newConversation')}
              >
                {conv.title || t('newConversation')}
              </span>
            )}

            {renamingId !== conv.id && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-50 hover:opacity-100 group-hover:opacity-80 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="bottom" className="w-40">
                  {onRename && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        setRenamingId(conv.id)
                        setRenameValue(conv.title || '')
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>{t('rename')}</span>
                    </DropdownMenuItem>
                  )}
                  {onTogglePin && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        onTogglePin(conv.id)
                      }}
                    >
                      {conv.pinned ? (
                        <>
                          <PinOff className="h-3.5 w-3.5" />
                          <span>{t('unpin')}</span>
                        </>
                      ) : (
                        <>
                          <Pin className="h-3.5 w-3.5" />
                          <span>{t('pin')}</span>
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                  {(onRename || onTogglePin) && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteId(conv.id)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{t('delete')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )
      })}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteConfirmation')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) onDelete(deleteId)
                setDeleteId(null)
              }}
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
