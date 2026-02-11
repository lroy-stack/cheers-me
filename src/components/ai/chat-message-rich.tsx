'use client'

import { useMemo, memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { User, Download } from 'lucide-react'
import Image from 'next/image'
import { ActionConfirmation } from './action-confirmation'
import { ChatToolStatus, toolLabels } from './chat-tool-status'
import { ArtifactRenderer } from './artifact-renderer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { VoicePlayer } from '@/components/assistant/voice-player'
import { MessageFeedback } from '@/components/assistant/message-feedback'
import type { ChatMessage, Artifact, ArtifactType } from '@/lib/ai/types'

interface ChatMessageRichProps {
  message: ChatMessage
  messageId?: string
  conversationId?: string | null
  onConfirmAction?: (actionId: string) => void
  onRejectAction?: (actionId: string) => void
  isConfirming?: boolean
  onOpenArtifact?: (artifact: Artifact) => void
  isStreaming?: boolean
  hasVoice?: boolean
}

// Regex for artifact blocks — supports hyphenated types, optional title, handles \r\n
const ARTIFACT_REGEX = /```artifact:([\w-]+)(?::([^\n]*))?\r?\n([\s\S]*?)```/g

// Detect download URLs (Supabase signed URLs, data URLs for exports)
const DOWNLOAD_URL_REGEX = /(?:download[_\s]?url|signedUrl|signed_url)["\s:]*["']?(https:\/\/[^\s"']+\/storage\/v1\/object\/sign\/[^\s"']+|data:application\/[^\s"']+)["']?/gi
const MARKDOWN_DOWNLOAD_REGEX = /\[([^\]]+)\]\((https:\/\/[^\s)]+\/storage\/v1\/object\/sign\/[^\s)]+)\)/g

function extractDownloadLinks(content: string): Array<{ url: string; filename: string }> {
  const links: Array<{ url: string; filename: string }> = []
  const seen = new Set<string>()

  // Match markdown-style download links
  let match: RegExpExecArray | null
  const mdRegex = new RegExp(MARKDOWN_DOWNLOAD_REGEX.source, 'g')
  while ((match = mdRegex.exec(content)) !== null) {
    if (!seen.has(match[2])) {
      seen.add(match[2])
      links.push({ url: match[2], filename: match[1] })
    }
  }

  // Match raw download_url references
  const rawRegex = new RegExp(DOWNLOAD_URL_REGEX.source, 'gi')
  while ((match = rawRegex.exec(content)) !== null) {
    const url = match[1]
    if (url && !seen.has(url)) {
      seen.add(url)
      const filename = url.includes('data:') ? 'export.xlsx' : decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'download')
      links.push({ url, filename })
    }
  }

  return links
}

interface ContentSegment {
  type: 'text' | 'artifact'
  content: string
  artifactType?: string
  artifactTitle?: string
}

function parseContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = []
  let lastIndex = 0

  const matches = content.matchAll(ARTIFACT_REGEX)
  for (const match of matches) {
    if (match.index! > lastIndex) {
      const text = content.slice(lastIndex, match.index!)
      if (text.trim()) {
        segments.push({ type: 'text', content: text })
      }
    }
    segments.push({
      type: 'artifact',
      content: match[3].trim(),
      artifactType: match[1],
      artifactTitle: match[2]?.trim() || undefined,
    })
    lastIndex = match.index! + match[0].length
  }

  if (lastIndex < content.length) {
    const text = content.slice(lastIndex)
    if (text.trim()) {
      segments.push({ type: 'text', content: text })
    }
  }

  return segments.length > 0 ? segments : [{ type: 'text', content }]
}

// Memoized markdown components to avoid recreation every render
const markdownComponents = {
  table: ({ children, ...props }: React.ComponentPropsWithoutRef<'table'>) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full text-sm border-collapse" {...props}>
        {children}
      </table>
    </div>
  ),
  th: ({ children, ...props }: React.ComponentPropsWithoutRef<'th'>) => (
    <th className="border-b px-3 py-1.5 text-left font-medium bg-muted/50" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: React.ComponentPropsWithoutRef<'td'>) => (
    <td className="border-b px-3 py-1.5" {...props}>
      {children}
    </td>
  ),
  code: ({ className, children, ...props }: React.ComponentPropsWithoutRef<'code'> & { className?: string }) => {
    const isInline = !className
    if (isInline) {
      return (
        <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      )
    }
    return (
      <pre className="bg-background border rounded-md p-3 overflow-x-auto my-2">
        <code className={cn('text-sm font-mono', className)} {...props}>
          {children}
        </code>
      </pre>
    )
  },
  a: ({ children, href, ...props }: React.ComponentPropsWithoutRef<'a'>) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline hover:text-primary/80"
      {...props}
    >
      {children}
    </a>
  ),
  ul: ({ children, ...props }: React.ComponentPropsWithoutRef<'ul'>) => (
    <ul className="list-disc list-inside space-y-1 my-1" {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }: React.ComponentPropsWithoutRef<'ol'>) => (
    <ol className="list-decimal list-inside space-y-1 my-1" {...props}>{children}</ol>
  ),
  li: ({ children, ...props }: React.ComponentPropsWithoutRef<'li'>) => (
    <li className="text-sm" {...props}>{children}</li>
  ),
  p: ({ children, ...props }: React.ComponentPropsWithoutRef<'p'>) => (
    <p className="text-sm leading-relaxed mb-2 last:mb-0" {...props}>{children}</p>
  ),
  h1: ({ children, ...props }: React.ComponentPropsWithoutRef<'h1'>) => (
    <h1 className="text-lg font-bold mt-3 mb-1" {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }: React.ComponentPropsWithoutRef<'h2'>) => (
    <h2 className="text-base font-bold mt-2 mb-1" {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }: React.ComponentPropsWithoutRef<'h3'>) => (
    <h3 className="text-sm font-bold mt-2 mb-1" {...props}>{children}</h3>
  ),
  blockquote: ({ children, ...props }: React.ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote className="border-l-2 border-primary/40 pl-3 italic text-muted-foreground my-2" {...props}>
      {children}
    </blockquote>
  ),
  strong: ({ children, ...props }: React.ComponentPropsWithoutRef<'strong'>) => (
    <strong className="font-semibold" {...props}>{children}</strong>
  ),
  hr: () => <hr className="my-3 border-border" />,
}

const remarkPlugins = [remarkGfm]

export const ChatMessageRich = memo(function ChatMessageRich({
  message,
  messageId,
  conversationId,
  onConfirmAction,
  onRejectAction,
  isConfirming,
  onOpenArtifact,
  isStreaming,
  hasVoice,
}: ChatMessageRichProps) {
  const isAssistant = message.role === 'assistant'

  const segments = useMemo(() => {
    if (!isAssistant) return null
    return parseContent(message.content)
  }, [message.content, isAssistant])

  const downloadLinks = useMemo(() => {
    if (!isAssistant) return []
    return extractDownloadLinks(message.content)
  }, [message.content, isAssistant])

  return (
    <div
      className={cn(
        'flex gap-3 mb-4',
        isAssistant ? 'flex-row' : 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md',
          isAssistant
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}
      >
        {isAssistant ? <Image src="/icons/logoheader.png" alt="GC" width={16} height={16} className="h-4 w-4 object-contain" /> : <User className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div className={cn('flex flex-col gap-1 flex-1 min-w-0 group', !isAssistant && 'items-end')}>
        {isAssistant && segments ? (
          <div className="max-w-full space-y-1">
            {segments.map((segment, idx) => {
              if (segment.type === 'artifact') {
                // Generate stable ID based on message ID and content hash
                const contentHash = segment.content.substring(0, 50).replace(/\s/g, '')
                const artifactId = messageId
                  ? `${messageId}-artifact-${idx}-${contentHash.substring(0, 8)}`
                  : `${message.timestamp.getTime()}-artifact-${idx}`

                return (
                  <div
                    key={idx}
                    className="cursor-pointer hover:ring-2 hover:ring-primary/20 rounded-lg transition-all"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onOpenArtifact?.({
                        id: artifactId,
                        type: (segment.artifactType || 'html') as ArtifactType,
                        title: segment.artifactTitle,
                        content: segment.content,
                      })
                    }}
                  >
                    <ArtifactRenderer
                      type={segment.artifactType || 'html'}
                      content={segment.content}
                    />
                  </div>
                )
              }
              return (
                <div key={idx} className="rounded-lg px-3 py-2 bg-muted max-w-full overflow-hidden">
                  <ReactMarkdown
                    remarkPlugins={remarkPlugins}
                    components={markdownComponents}
                  >
                    {segment.content}
                  </ReactMarkdown>
                </div>
              )
            })}
          </div>
        ) : (
          <div
            className={cn(
              'rounded-lg px-3 py-2',
              isAssistant ? 'bg-muted max-w-full' : 'bg-primary text-primary-foreground max-w-[85%]'
            )}
          >
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        )}

        {/* Tools Used */}
        {isAssistant && message.tools_used && message.tools_used.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {[...new Set(message.tools_used)].map((tool, idx) => (
              <Badge key={`${tool}-${idx}`} variant="secondary" className="text-xs">
                {toolLabels[tool] || tool}
              </Badge>
            ))}
          </div>
        )}

        {/* Download links */}
        {isAssistant && downloadLinks.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {downloadLinks.map((link, idx) => (
              <a key={idx} href={link.url} download={link.filename} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7">
                  <Download className="h-3 w-3" />
                  {link.filename}
                </Button>
              </a>
            ))}
          </div>
        )}

        {/* Active tools (streaming) */}
        {isAssistant && message.activeTools && message.activeTools.length > 0 && (
          <ChatToolStatus activeTools={message.activeTools} />
        )}

        {/* Pending Action Confirmation */}
        {isAssistant && message.pending_action && onConfirmAction && onRejectAction && (
          <div className="max-w-full">
            <ActionConfirmation
              action={message.pending_action}
              onConfirm={onConfirmAction}
              onReject={onRejectAction}
              isLoading={isConfirming}
            />
          </div>
        )}

        {/* Footer: timestamp, model badge, voice, feedback */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {message.timestamp.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {message.model_used && (
            <Badge variant="outline" className="text-[10px] gap-0.5">
              {message.model_used.includes('sonnet') ? 'Sonnet' : 'Haiku'}
            </Badge>
          )}
          {isAssistant && hasVoice && !isStreaming && message.content && (
            <VoicePlayer text={message.content} />
          )}
          {isAssistant && messageId && !isStreaming && (
            <MessageFeedback messageId={messageId} conversationId={conversationId || null} />
          )}
        </div>
      </div>
    </div>
  )
})
