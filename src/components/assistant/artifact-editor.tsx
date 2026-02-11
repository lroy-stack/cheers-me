'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Pencil, Send, X } from 'lucide-react'

interface ArtifactEditorProps {
  artifactId: string
  onSubmitEdit: (instruction: string) => void
  disabled?: boolean
}

export function ArtifactEditor({ artifactId, onSubmitEdit, disabled }: ArtifactEditorProps) {
  const t = useTranslations('common.assistant')
  const [isEditing, setIsEditing] = useState(false)
  const [instruction, setInstruction] = useState('')

  const handleSubmit = useCallback(() => {
    if (!instruction.trim()) return
    onSubmitEdit(`[ARTIFACT_EDIT:${artifactId}] ${instruction.trim()}`)
    setInstruction('')
    setIsEditing(false)
  }, [artifactId, instruction, onSubmitEdit])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      setIsEditing(false)
      setInstruction('')
    }
  }, [handleSubmit])

  if (!isEditing) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-xs h-7"
        onClick={() => setIsEditing(true)}
        disabled={disabled}
      >
        <Pencil className="h-3 w-3" />
        {t('editArtifact')}
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <textarea
        value={instruction}
        onChange={e => setInstruction(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('editPlaceholder')}
        className="flex-1 min-h-[36px] max-h-[80px] px-3 py-1.5 text-sm border rounded-md bg-background resize-y"
        autoFocus
        disabled={disabled}
      />
      <Button
        variant="default"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={handleSubmit}
        disabled={!instruction.trim() || disabled}
      >
        <Send className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => { setIsEditing(false); setInstruction('') }}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
