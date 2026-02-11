'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Download, Copy, Check, FileImage, FileText, FileSpreadsheet, Code2 } from 'lucide-react'
import { useState, useCallback } from 'react'
import { downloadArtifact, isImageArtifact } from './artifact-download'
import type { Artifact } from '@/lib/ai/types'

interface ArtifactExportProps {
  artifact: Artifact
}

export function ArtifactExport({ artifact }: ArtifactExportProps) {
  const t = useTranslations('common.assistant')
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(artifact.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [artifact.content])

  const handleDownload = useCallback((format: 'raw' | 'html' | 'csv' | 'md') => {
    let content = artifact.content
    let mime = 'text/plain'
    let ext = 'txt'

    switch (format) {
      case 'raw': {
        const mimeMap: Record<string, string> = {
          html: 'text/html', chart: 'application/json', table: 'application/json',
          code: 'text/plain', mermaid: 'text/plain', csv: 'text/csv',
        }
        const extMap: Record<string, string> = {
          html: 'html', chart: 'json', table: 'json',
          code: 'txt', mermaid: 'mmd', csv: 'csv',
        }
        mime = mimeMap[artifact.type] || 'text/plain'
        ext = extMap[artifact.type] || 'txt'
        break
      }
      case 'html':
        mime = 'text/html'
        ext = 'html'
        break
      case 'csv': {
        try {
          const data = JSON.parse(artifact.content)
          if (data.columns && data.rows) {
            const header = data.columns.join(',')
            const rows = data.rows.map((row: unknown[]) =>
              row.map(cell => {
                const s = String(cell ?? '')
                return s.includes(',') || s.includes('"') || s.includes('\n')
                  ? `"${s.replace(/"/g, '""')}"`
                  : s
              }).join(',')
            )
            content = [header, ...rows].join('\n')
          }
        } catch { /* keep raw content */ }
        mime = 'text/csv'
        ext = 'csv'
        break
      }
      case 'md':
        mime = 'text/markdown'
        ext = 'md'
        if (artifact.type === 'code') {
          content = '```\n' + content + '\n```'
        }
        break
    }

    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${artifact.title || 'artifact'}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }, [artifact])

  const handleExportPNG = useCallback(async () => {
    setExporting(true)
    try {
      const { toPng } = await import('html-to-image')
      const artifactEl = document.querySelector('[data-artifact-content]') as HTMLElement
      if (!artifactEl) {
        handleDownload('raw')
        return
      }
      const dataUrl = await toPng(artifactEl, { quality: 0.95, pixelRatio: 2 })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${artifact.title || 'artifact'}.png`
      a.click()
    } catch {
      handleDownload('raw')
    } finally {
      setExporting(false)
    }
  }, [artifact, handleDownload])

  const handleExportPDF = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: artifact.content, title: artifact.title || 'Document' }),
      })
      if (res.ok) {
        const html = await res.text()
        const blob = new Blob([html], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
        setTimeout(() => URL.revokeObjectURL(url), 10000)
      }
    } catch {
      // silent — endpoint may not exist
    }
  }, [artifact])

  const isTable = artifact.type === 'table'
  const isHTML = artifact.type === 'html' && !isImageArtifact(artifact)
  const isCode = artifact.type === 'code'

  return (
    <div className="flex flex-wrap gap-1.5">
      <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={handleCopy}>
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? t('copied') : t('copy')}
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs h-7"
        onClick={() => {
          if (isImageArtifact(artifact)) {
            downloadArtifact(artifact)
          } else {
            handleDownload('raw')
          }
        }}
      >
        <Download className="h-3 w-3" />
        {isImageArtifact(artifact) ? 'PNG' : t('download')}
      </Button>

      {(isHTML || artifact.type === 'chart' || isTable) && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs h-7"
          onClick={handleExportPNG}
          disabled={exporting}
        >
          <FileImage className="h-3 w-3" />
          {exporting ? '...' : 'PNG'}
        </Button>
      )}

      {isHTML && (
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={handleExportPDF}>
          <FileText className="h-3 w-3" />
          PDF
        </Button>
      )}

      {isTable && (
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={() => handleDownload('csv')}>
          <FileSpreadsheet className="h-3 w-3" />
          CSV
        </Button>
      )}

      {isCode && (
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={() => handleDownload('md')}>
          <Code2 className="h-3 w-3" />
          MD
        </Button>
      )}
    </div>
  )
}
