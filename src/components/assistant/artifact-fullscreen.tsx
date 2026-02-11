'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArtifactRenderer } from '@/components/ai/artifact-renderer'
import { ArtifactErrorBoundary } from '@/components/ai/artifact-error-boundary'
import { Copy, Download, Check, Send, Minimize2, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { downloadArtifact, isImageArtifact, getImageSrc } from './artifact-download'
import { ImageLightbox } from './image-lightbox'
import type { Artifact } from '@/lib/ai/types'

interface ArtifactFullscreenProps {
  artifact: Artifact
  onClose: () => void
  onEditSubmit?: (instruction: string) => void
  isStreaming?: boolean
}

const TYPE_LABELS: Record<string, string> = {
  html: 'HTML', chart: 'Chart', table: 'Table', mermaid: 'Diagram',
  calendar: 'Calendar', pdf: 'PDF', code: 'Code', form: 'Form',
}

export function ArtifactFullscreen({ artifact, onClose, onEditSubmit, isStreaming }: ArtifactFullscreenProps) {
  const t = useTranslations('common.assistant')
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview')
  const [editText, setEditText] = useState('')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(artifact.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [artifact.content])

  const handleDownload = useCallback(() => {
    downloadArtifact(artifact)
  }, [artifact])

  const handleEditSubmit = useCallback(() => {
    if (!editText.trim() || !onEditSubmit) return
    onEditSubmit(`[ARTIFACT_EDIT:${artifact.id}] ${editText.trim()}`)
    setEditText('')
  }, [editText, artifact.id, onEditSubmit])

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEditSubmit()
    }
  }, [handleEditSubmit])

  return (
    <>
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* ── Header: same pattern as side panel ── */}
      <div className="flex items-center gap-1.5 h-12 px-4 border-b border-border shrink-0">
        <h3 className="text-sm font-medium truncate min-w-0 flex-1">
          {artifact.title || artifact.type}
        </h3>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
          {isImageArtifact(artifact) ? 'Image' : (TYPE_LABELS[artifact.type] || artifact.type)}
        </Badge>
        <div className="flex items-center border rounded-md overflow-hidden shrink-0">
          <button
            className={cn(
              'px-2 py-0.5 text-xs font-medium transition-colors',
              viewMode === 'preview' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
            onClick={() => setViewMode('preview')}
          >
            {t('preview')}
          </button>
          <button
            className={cn(
              'px-2 py-0.5 text-xs font-medium transition-colors',
              viewMode === 'code' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
            onClick={() => setViewMode('code')}
          >
            {t('code')}
          </button>
        </div>
        <div className="flex items-center shrink-0">
          {isImageArtifact(artifact) && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLightboxOpen(true)} title="View image">
              <ImageIcon className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy} title={copied ? t('copied') : t('copy')}>
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload} title={isImageArtifact(artifact) ? 'Download PNG' : t('download')}>
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} title="Exit fullscreen (Esc)">
            <Minimize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Content: centered with max-width ── */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-5xl 2xl:max-w-7xl mx-auto" data-artifact-content>
          {viewMode === 'preview' ? (
            <ArtifactErrorBoundary content={artifact.content}>
              <ArtifactRenderer type={artifact.type} content={artifact.content} />
            </ArtifactErrorBoundary>
          ) : (
            <pre className="p-3 bg-muted/50 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap break-all">
              <code>{artifact.content}</code>
            </pre>
          )}
        </div>
      </div>

      {/* ── Edit input ── */}
      {onEditSubmit && (
        <div className="border-t border-border px-4 py-2 shrink-0">
          <div className="max-w-5xl 2xl:max-w-7xl mx-auto flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={handleEditKeyDown}
              placeholder={t('editPlaceholder')}
              rows={1}
              disabled={isStreaming}
              className="flex-1 min-h-[36px] max-h-[80px] px-3 py-2 text-sm border rounded-lg bg-muted/50 resize-none focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground disabled:opacity-50"
            />
            <Button
              size="icon"
              className="h-9 w-9 shrink-0 rounded-lg"
              onClick={handleEditSubmit}
              disabled={!editText.trim() || isStreaming}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>

    {/* Image lightbox */}
    {lightboxOpen && (() => {
      const imgSrc = getImageSrc(artifact)
      if (!imgSrc) return null
      return (
        <ImageLightbox
          src={imgSrc}
          alt={artifact.title || 'Generated image'}
          onClose={() => setLightboxOpen(false)}
        />
      )
    })()}
    </>
  )
}
