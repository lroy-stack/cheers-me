'use client'

import { useRef, useEffect, useCallback } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AssistantHeader } from './assistant-header'
import { AssistantInput } from './assistant-input'
import { AssistantWelcome } from './assistant-welcome'
import { ChatMessageRich } from '@/components/ai/chat-message-rich'
import { ChatStreamingIndicator } from '@/components/ai/chat-streaming-indicator'
import { ChatToolStatus } from '@/components/ai/chat-tool-status'
import { ChatThinkingIndicator } from '@/components/ai/chat-thinking-indicator'
import { SubAgentStatus } from './sub-agent-status'
import { MessageActions } from './message-actions'
import type { Artifact, FileAttachment } from '@/lib/ai/types'
import type { useAIChatStream } from '@/hooks/use-ai-chat-stream'

interface AssistantChatProps {
  chat: ReturnType<typeof useAIChatStream>
  onOpenSidebar: () => void
  onOpenArtifact: (artifact: Artifact) => void
  sidebarCollapsed?: boolean
  onToggleSidebar?: () => void
}

export function AssistantChat({ chat, onOpenSidebar, onOpenArtifact, sidebarCollapsed, onToggleSidebar }: AssistantChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages/streaming
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages, chat.streamingText])

  const handleSend = useCallback((message: string, attachments?: FileAttachment[]) => {
    chat.sendMessage(message, attachments)
  }, [chat])

  const handleSuggestion = useCallback((text: string) => {
    chat.sendMessage(text)
  }, [chat])

  const isEmpty = chat.messages.length === 0 && !chat.isStreaming

  return (
    <>
      <AssistantHeader
        conversationTitle={null}
        activeModel={chat.activeModel}
        modelReason={chat.modelReason}
        onOpenSidebar={onOpenSidebar}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={onToggleSidebar}
      />

      {isEmpty ? (
        <AssistantWelcome onSuggestion={handleSuggestion} />
      ) : (
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="max-w-3xl mx-auto px-4 py-6">
            {chat.messages.map((msg, idx) => (
              <div key={`${msg.timestamp.getTime()}-${idx}`} className="group/msg relative">
                <ChatMessageRich
                  message={msg}
                  messageId={`msg-${idx}`}
                  conversationId={chat.conversationId}
                  onConfirmAction={chat.confirmAction}
                  onRejectAction={chat.rejectAction}
                  isConfirming={chat.isConfirming}
                  onOpenArtifact={onOpenArtifact}
                  isStreaming={chat.isStreaming}
                  hasVoice={!!process.env.NEXT_PUBLIC_HAS_ELEVENLABS}
                />
                {!chat.isStreaming && (
                  <MessageActions
                    message={msg}
                    messageIndex={idx}
                    isLastAssistant={msg.role === 'assistant' && idx === chat.messages.length - 1}
                    onEditAndResend={chat.editAndResend}
                    onDelete={chat.deleteMessage}
                    onRegenerate={chat.regenerateLastResponse}
                  />
                )}
              </div>
            ))}

            {/* Thinking indicator — shown in the gap between sending and first response */}
            {chat.isStreaming && !chat.streamingText && chat.activeTools.length === 0 && (
              <ChatThinkingIndicator subAgentEvent={chat.subAgentEvent} />
            )}

            {/* Active + completed tools during streaming (hide delegate_ tools when sub-agent card is shown) */}
            {chat.isStreaming && (() => {
              const filterDelegate = !!chat.subAgentEvent
              const filter = (tools: string[]) => filterDelegate ? tools.filter(t => !t.startsWith('delegate_')) : tools
              const active = filter(chat.activeTools)
              const completed = filter(chat.completedTools)
              const errored = filter(chat.errorTools)
              if (active.length === 0 && completed.length === 0 && errored.length === 0) return null
              return (
                <div className="ml-11 mb-2">
                  <ChatToolStatus
                    activeTools={active}
                    completedTools={completed}
                    errorTools={errored}
                  />
                </div>
              )
            })()}

            {/* Sub-agent status */}
            {chat.subAgentEvent && (
              <SubAgentStatus event={chat.subAgentEvent} />
            )}

            {/* Streaming text */}
            {chat.isStreaming && chat.streamingText && (
              <ChatStreamingIndicator text={chat.streamingText} />
            )}

            {/* Error */}
            {chat.error && (
              <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-2 text-sm mb-4">
                {chat.error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      )}

      <AssistantInput
        onSend={handleSend}
        onStop={chat.stopGenerating}
        isStreaming={chat.isStreaming}
      />
    </>
  )
}
