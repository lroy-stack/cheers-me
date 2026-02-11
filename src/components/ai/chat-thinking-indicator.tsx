'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronUp } from 'lucide-react'
import Image from 'next/image'
import type { SubAgentEvent } from '@/lib/ai/types'

interface ChatThinkingIndicatorProps {
  subAgentEvent?: SubAgentEvent | null
}

export function ChatThinkingIndicator({ subAgentEvent }: ChatThinkingIndicatorProps) {
  const t = useTranslations('common.assistant')
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="flex gap-3 mb-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Image src="/icons/logoheader.png" alt="GC" width={16} height={16} className="h-4 w-4 object-contain" />
      </div>
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="rounded-lg px-3 py-3 bg-muted inline-flex items-center gap-1.5 cursor-pointer hover:bg-muted/80 transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
          <span className="text-xs text-muted-foreground ml-1">{t('thinking')}</span>
          {subAgentEvent && (
            expanded
              ? <ChevronUp className="h-3 w-3 text-muted-foreground ml-1" />
              : <ChevronDown className="h-3 w-3 text-muted-foreground ml-1" />
          )}
        </button>

        {expanded && subAgentEvent && (
          <div className="mt-1 ml-1 rounded-md border bg-card p-2 text-xs text-muted-foreground space-y-0.5">
            <p className="font-medium text-foreground">{subAgentEvent.agent}</p>
            {subAgentEvent.task && <p>{subAgentEvent.task}</p>}
            {subAgentEvent.step && <p className="italic">{subAgentEvent.step}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
