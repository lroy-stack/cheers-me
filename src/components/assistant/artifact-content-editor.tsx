'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Save, X, Pencil } from 'lucide-react'

interface ArtifactContentEditorProps {
  artifactId: string
  initialContent: string
  artifactType: string
  onSaved?: (newVersionId: string) => void
}

export function ArtifactContentEditor({ artifactId, initialContent, artifactType, onSaved }: ArtifactContentEditorProps) {
  const t = useTranslations('common.assistant')
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(initialContent)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/ai/artifacts/${artifactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (res.ok) {
        const data = await res.json()
        setEditing(false)
        onSaved?.(data.id)
      } else {
        setError('Failed to save')
      }
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setContent(initialContent)
    setEditing(false)
    setError(null)
  }

  if (!editing) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs gap-1"
        onClick={() => setEditing(true)}
      >
        <Pencil className="h-3 w-3" />
        {t('editArtifact')}
      </Button>
    )
  }

  const isJsonType = artifactType === 'chart' || artifactType === 'table'

  return (
    <div className="space-y-2">
      <Textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        rows={isJsonType ? 8 : 12}
        className="font-mono text-xs resize-y"
        placeholder={isJsonType ? 'JSON content...' : 'HTML/Code content...'}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleCancel}>
          <X className="h-3 w-3" />
          {t('cancel')}
        </Button>
        <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={saving || content === initialContent}>
          <Save className="h-3 w-3" />
          {saving ? '...' : t('save')}
        </Button>
      </div>
    </div>
  )
}
