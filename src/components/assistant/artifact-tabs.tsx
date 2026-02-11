'use client'

import { useCallback } from 'react'
import { cn } from '@/lib/utils'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { FileText, BarChart3, Table2, GitBranch, Calendar, FileDown, Code2, FormInput, X } from 'lucide-react'
import type { Artifact } from '@/lib/ai/types'

interface ArtifactTabsProps {
  artifacts: Artifact[]
  activeId: string
  onSelect: (id: string) => void
  onClose?: (id: string) => void
}

const typeIconComponents: Record<string, React.ElementType> = {
  html: FileText,
  chart: BarChart3,
  table: Table2,
  mermaid: GitBranch,
  calendar: Calendar,
  pdf: FileDown,
  code: Code2,
  form: FormInput,
}

const typeLabels: Record<string, string> = {
  html: 'HTML',
  chart: 'Chart',
  table: 'Table',
  mermaid: 'Diagram',
  calendar: 'Calendar',
  pdf: 'PDF',
  code: 'Code',
  form: 'Form',
}

export function ArtifactTabs({ artifacts, activeId, onSelect, onClose }: ArtifactTabsProps) {
  const handleClose = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    onClose?.(id)
  }, [onClose])

  return (
    <ScrollArea className="border-b border-border">
      <div className="flex gap-1 px-4 py-1.5">
        {artifacts.map(artifact => {
          const Icon = typeIconComponents[artifact.type] || FileText
          return (
            <button
              key={artifact.id}
              onClick={() => onSelect(artifact.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors group',
                activeId === artifact.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              )}
            >
              <Icon className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[120px]">
                {artifact.title || typeLabels[artifact.type] || artifact.type}
              </span>
              {onClose && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleClose(e, artifact.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleClose(e as unknown as React.MouseEvent, artifact.id) }}
                  className={cn(
                    'ml-0.5 rounded-sm p-0.5 opacity-0 group-hover:opacity-100 transition-opacity',
                    activeId === artifact.id
                      ? 'hover:bg-primary-foreground/20'
                      : 'hover:bg-muted'
                  )}
                >
                  <X className="h-2.5 w-2.5" />
                </span>
              )}
            </button>
          )
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
