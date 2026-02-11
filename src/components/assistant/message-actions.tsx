'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Pencil, Trash2, RefreshCw, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/lib/ai/types'

interface MessageActionsProps {
  message: ChatMessage
  messageIndex: number
  isLastAssistant: boolean
  onEditAndResend: (index: number, content: string) => Promise<void>
  onDelete: (index: number) => void
  onRegenerate: () => Promise<void>
}

export function MessageActions({
  message,
  messageIndex,
  isLastAssistant,
  onEditAndResend,
  onDelete,
  onRegenerate,
}: MessageActionsProps) {
  const t = useTranslations('common.assistant')
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [message.content])

  const handleStartEdit = useCallback(() => {
    setEditValue(message.content)
    setEditing(true)
  }, [message.content])

  const handleSubmitEdit = useCallback(() => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== message.content) {
      onEditAndResend(messageIndex, trimmed)
    }
    setEditing(false)
    setEditValue('')
  }, [editValue, message.content, messageIndex, onEditAndResend])

  if (editing) {
    return (
      <div className={cn("mt-1 mb-3", message.role === 'user' ? 'mr-11' : 'ml-11')}>
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmitEdit()
            }
            if (e.key === 'Escape') {
              setEditing(false)
              setEditValue('')
            }
          }}
          className="w-full min-h-[60px] p-2 text-sm border rounded-lg bg-background resize-y focus:outline-none focus:ring-1 focus:ring-ring"
          autoFocus
        />
        <div className="flex gap-1 mt-1">
          <Button size="sm" variant="default" className="h-7 text-xs" onClick={handleSubmitEdit}>
            {t('editSend')}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditing(false); setEditValue('') }}>
            {t('cancel')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex items-center gap-0.5 mt-0.5 mb-2 opacity-0 group-hover/msg:opacity-100 max-sm:opacity-100 transition-opacity",
      message.role === 'user' ? 'justify-end mr-11' : 'ml-11'
    )}>
      {/* Copy — available for all messages */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
      </Button>

      {/* Edit — only user messages */}
      {message.role === 'user' && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleStartEdit}
        >
          <Pencil className="h-3 w-3 text-muted-foreground" />
        </Button>
      )}

      {/* Delete — user messages only */}
      {message.role === 'user' && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onDelete(messageIndex)}
        >
          <Trash2 className="h-3 w-3 text-muted-foreground" />
        </Button>
      )}

      {/* Regenerate — last assistant message only */}
      {message.role === 'assistant' && isLastAssistant && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onRegenerate}
        >
          <RefreshCw className="h-3 w-3 text-muted-foreground" />
        </Button>
      )}
    </div>
  )
}
