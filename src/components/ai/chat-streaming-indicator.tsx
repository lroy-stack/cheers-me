'use client'

import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileText } from 'lucide-react'
import Image from 'next/image'

interface ChatStreamingIndicatorProps {
  text: string
}

const remarkPlugins = [remarkGfm]

// Regex to match artifact blocks (complete or in-progress)
const ARTIFACT_BLOCK_REGEX = /```artifact:[\w-]+(?::[^\n]*)?\r?\n[\s\S]*?(?:```|$)/g

/**
 * Strips artifact blocks from streaming text and replaces with placeholder.
 * Only shows normal text content to the user during generation.
 */
function filterStreamingText(text: string): { displayText: string; hasArtifact: boolean } {
  const hasArtifact = ARTIFACT_BLOCK_REGEX.test(text)
  if (!hasArtifact) return { displayText: text, hasArtifact: false }

  // Reset regex lastIndex
  ARTIFACT_BLOCK_REGEX.lastIndex = 0
  const displayText = text.replace(ARTIFACT_BLOCK_REGEX, '').trim()
  return { displayText, hasArtifact: true }
}

export function ChatStreamingIndicator({ text }: ChatStreamingIndicatorProps) {
  if (!text) return null

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { displayText, hasArtifact } = useMemo(() => filterStreamingText(text), [text])

  return (
    <div className="flex gap-3 mb-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Image src="/icons/logoheader.png" alt="GC" width={16} height={16} className="h-4 w-4 object-contain" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        {displayText && (
          <div className="rounded-lg px-3 py-2 bg-muted max-w-full overflow-hidden">
            <ReactMarkdown
              remarkPlugins={remarkPlugins}
              components={{
                p: ({ children }) => (
                  <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>
                ),
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-1">{children}</ol>,
                li: ({ children }) => <li className="text-sm">{children}</li>,
                code: ({ className, children }) => {
                  const isInline = !className
                  if (isInline) {
                    return <code className="bg-background px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
                  }
                  return (
                    <pre className="bg-background border rounded-md p-3 overflow-x-auto my-2">
                      <code className="text-sm font-mono">{children}</code>
                    </pre>
                  )
                },
              }}
            >
              {displayText}
            </ReactMarkdown>
            <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
          </div>
        )}

        {hasArtifact && (
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-muted/60 border border-dashed border-primary/20">
            <FileText className="h-4 w-4 text-primary/60 animate-pulse" />
            <span className="text-xs text-muted-foreground">Generating artifact...</span>
            <span className="inline-block w-1.5 h-3 bg-primary/40 animate-pulse rounded-sm" />
          </div>
        )}

        {!displayText && !hasArtifact && (
          <div className="rounded-lg px-3 py-2 bg-muted max-w-full overflow-hidden">
            <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse rounded-sm" />
          </div>
        )}
      </div>
    </div>
  )
}
