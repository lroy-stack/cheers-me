'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { ArtifactTabs } from './artifact-tabs'
import { ArtifactRenderer } from '@/components/ai/artifact-renderer'
import { ArtifactErrorBoundary } from '@/components/ai/artifact-error-boundary'
import { X, Maximize2, Copy, Download, Check, Send, Pencil, ImageIcon } from 'lucide-react'
import { useState, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { ArtifactFullscreen } from './artifact-fullscreen'
import { downloadArtifact, isImageArtifact, getImageSrc } from './artifact-download'
import { ImageLightbox } from './image-lightbox'
import type { Artifact } from '@/lib/ai/types'

interface AssistantArtifactsProps {
  artifacts: Artifact[]
  activeArtifactId: string | null
  onSelectArtifact: (id: string) => void
  onClose: () => void
  onCloseTab?: (id: string) => void
  onEditSubmit?: (instruction: string) => void
  onUpdateArtifactContent?: (id: string, content: string) => void
  isStreaming?: boolean
}

const TYPE_LABELS: Record<string, string> = {
  html: 'HTML',
  chart: 'Chart',
  table: 'Table',
  mermaid: 'Diagram',
  calendar: 'Calendar',
  pdf: 'PDF',
  code: 'Code',
  form: 'Form',
}

/**
 * Artifact panel following Claude.ai pattern (app_spec.txt):
 *
 * ┌─ Header: Title + type badge + actions ─────────┐
 * ├─ Tabs (if multiple artifacts) ─────────────────┤
 * │                                                 │
 * │           Content Preview                       │
 * │         (fills remaining space)                 │
 * │                                                 │
 * ├─ Edit input: always visible ───────────────────┤
 * └─────────────────────────────────────────────────┘
 */
export function AssistantArtifacts({
  artifacts,
  activeArtifactId,
  onSelectArtifact,
  onClose,
  onCloseTab,
  onEditSubmit,
  onUpdateArtifactContent,
  isStreaming,
}: AssistantArtifactsProps) {
  const t = useTranslations('common.assistant')
  const [fullscreen, setFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview')
  const [editText, setEditText] = useState('')
  const [isEditingCode, setIsEditingCode] = useState(false)
  const [editCodeValue, setEditCodeValue] = useState('')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const activeArtifact = artifacts.find(a => a.id === activeArtifactId) || artifacts[artifacts.length - 1]

  const handleCopy = useCallback(async () => {
    if (!activeArtifact) return
    await navigator.clipboard.writeText(activeArtifact.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [activeArtifact])

  const handleDownload = useCallback(() => {
    if (!activeArtifact) return
    downloadArtifact(activeArtifact)
  }, [activeArtifact])

  const handleEditSubmit = useCallback(() => {
    if (!editText.trim() || !activeArtifact || !onEditSubmit) return
    onEditSubmit(`[ARTIFACT_EDIT:${activeArtifact.id}] ${editText.trim()}`)
    setEditText('')
  }, [editText, activeArtifact, onEditSubmit])

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEditSubmit()
    }
  }, [handleEditSubmit])

  if (!activeArtifact) return null

  return (
    <>
      <div className="flex flex-col h-full w-full bg-background">
        {/* ── Header: title + type badge + action buttons ── */}
        <div className="flex items-center gap-1.5 h-12 px-3 border-b border-border shrink-0">
          <h3 className="text-sm font-medium truncate min-w-0 flex-1">
            {activeArtifact.title || t('artifact')}
          </h3>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
            {isImageArtifact(activeArtifact) ? 'Image' : (TYPE_LABELS[activeArtifact.type] || activeArtifact.type)}
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
            {isImageArtifact(activeArtifact) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setLightboxOpen(true)}
                title="View image"
              >
                <ImageIcon className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCopy}
              title={copied ? t('copied') : t('copy')}
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleDownload}
              title={isImageArtifact(activeArtifact) ? 'Download PNG' : t('download')}
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setFullscreen(true)}
              title={t('fullscreen')}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* ── Tabs (only when >1 artifact) ── */}
        {artifacts.length > 1 && (
          <ArtifactTabs
            artifacts={artifacts}
            activeId={activeArtifact.id}
            onSelect={onSelectArtifact}
            onClose={onCloseTab}
          />
        )}

        {/* ── Content: fills remaining space ── */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3" data-artifact-content>
            {viewMode === 'preview' ? (
              <ArtifactErrorBoundary content={activeArtifact.content}>
                <ArtifactRenderer
                  type={activeArtifact.type}
                  content={activeArtifact.content}
                />
              </ArtifactErrorBoundary>
            ) : isEditingCode ? (
              <div className="space-y-2">
                <textarea
                  value={editCodeValue}
                  onChange={(e) => setEditCodeValue(e.target.value)}
                  className="w-full min-h-[200px] p-3 bg-muted/50 rounded-lg text-sm font-mono resize-y border focus:outline-none focus:ring-1 focus:ring-ring"
                  spellCheck={false}
                />
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      if (onUpdateArtifactContent) {
                        onUpdateArtifactContent(activeArtifact.id, editCodeValue)
                      }
                      setIsEditingCode(false)
                    }}
                  >
                    {t('save')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => { setIsEditingCode(false); setEditCodeValue('') }}
                  >
                    {t('cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative group/code">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover/code:opacity-100 transition-opacity"
                  onClick={() => { setEditCodeValue(activeArtifact.content); setIsEditingCode(true) }}
                  title={t('editArtifact')}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <pre className="p-3 bg-muted/50 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap break-all">
                  <code>{activeArtifact.content}</code>
                </pre>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* ── Edit input: always visible (Claude.ai pattern) ── */}
        {onEditSubmit && (
          <div className="border-t border-border px-3 py-2 shrink-0">
            <div className="flex items-end gap-2">
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

      {/* Fullscreen overlay */}
      {fullscreen && (
        <ArtifactFullscreen
          artifact={activeArtifact}
          onClose={() => setFullscreen(false)}
          onEditSubmit={onEditSubmit}
          isStreaming={isStreaming}
        />
      )}

      {/* Image lightbox */}
      {lightboxOpen && (() => {
        const imgSrc = getImageSrc(activeArtifact)
        if (!imgSrc) return null
        return (
          <ImageLightbox
            src={imgSrc}
            alt={activeArtifact.title || 'Generated image'}
            onClose={() => setLightboxOpen(false)}
          />
        )
      })()}
    </>
  )
}
