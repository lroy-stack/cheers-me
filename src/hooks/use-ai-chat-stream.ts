'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { ChatMessage, ConversationSummary, FileAttachment, SubAgentEvent, Artifact } from '@/lib/ai/types'

interface UseAIChatStreamReturn {
  messages: ChatMessage[]
  isStreaming: boolean
  streamingText: string
  activeTools: string[]
  completedTools: string[]
  errorTools: string[]
  error: string | null
  conversationId: string | null
  conversations: ConversationSummary[]
  activeModel: string | null
  modelReason: string | null
  subAgentEvent: SubAgentEvent | null
  detectedArtifacts: Artifact[]
  sendMessage: (message: string, attachments?: FileAttachment[]) => Promise<void>
  stopGenerating: () => void
  confirmAction: (actionId: string) => Promise<void>
  rejectAction: (actionId: string) => Promise<void>
  loadConversation: (id: string) => Promise<void>
  newConversation: () => void
  deleteConversation: (id: string) => Promise<void>
  renameConversation: (id: string, title: string) => Promise<void>
  togglePinConversation: (id: string) => Promise<void>
  loadConversations: () => Promise<void>
  editAndResend: (index: number, content: string) => Promise<void>
  deleteMessage: (index: number) => void
  regenerateLastResponse: () => Promise<void>
  isConfirming: boolean
}

/**
 * Parse SSE events from a raw text buffer.
 * SSE spec: events are separated by blank lines (\n\n).
 * Each event can have `event:` and `data:` fields.
 * Returns [parsedEvents, remainingBuffer].
 */
function parseSSEBuffer(buffer: string): [Array<{ event: string; data: string }>, string] {
  const events: Array<{ event: string; data: string }> = []

  // Split on double newlines (event boundaries)
  const parts = buffer.split('\n\n')
  // Last part may be incomplete — keep it as remaining buffer
  const remaining = parts.pop() || ''

  for (const part of parts) {
    if (!part.trim()) continue

    let eventType = 'message'
    let eventData = ''

    const lines = part.split('\n')
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7)
      } else if (line.startsWith('data: ')) {
        eventData = line.slice(6)
      }
    }

    if (eventData) {
      events.push({ event: eventType, data: eventData })
    }
  }

  return [events, remaining]
}

export function useAIChatStream(): UseAIChatStreamReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [activeTools, setActiveTools] = useState<string[]>([])
  const [completedTools, setCompletedTools] = useState<string[]>([])
  const [errorTools, setErrorTools] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [isConfirming, setIsConfirming] = useState(false)
  const [activeModel, setActiveModel] = useState<string | null>(null)
  const [modelReason, setModelReason] = useState<string | null>(null)
  const [subAgentEvent, setSubAgentEvent] = useState<SubAgentEvent | null>(null)
  const [detectedArtifacts, setDetectedArtifacts] = useState<Artifact[]>([])

  const abortRef = useRef<AbortController | null>(null)
  const streamingRef = useRef(false) // avoids stale closure

  // Load conversation list
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/conversations')
      if (res.ok) {
        const data = await res.json()
        setConversations(data)
      }
    } catch {
      // silent fail
    }
  }, [])

  // Load on mount
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort()
        abortRef.current = null
      }
    }
  }, [])

  const stopGenerating = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
  }, [])

  const sendMessage = useCallback(async (message: string, attachments?: FileAttachment[]) => {
    if (streamingRef.current) return
    streamingRef.current = true
    setIsStreaming(true)
    setError(null)
    setStreamingText('')
    setActiveTools([])
    setCompletedTools([])
    setErrorTools([])
    setSubAgentEvent(null)
    setDetectedArtifacts([])

    // Add user message immediately
    const userMsg: ChatMessage = {
      role: 'user',
      content: message,
      attachments,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])

    try {
      abortRef.current = new AbortController()

      const res = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          conversation_id: conversationId,
          attachments: attachments?.map(a => ({
            id: a.id,
            filename: a.filename,
            mimeType: a.mimeType,
            processedContent: a.processedContent,
            base64: a.base64,
          })),
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(errData.error || `HTTP ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''
      let accumulatedText = ''
      let toolsUsed: string[] = []
      let pendingAction: ChatMessage['pending_action'] | undefined
      let convId = conversationId
      let msgModel: string | undefined
      let msgModelReason: string | undefined
      const currentActiveTools = new Set<string>()
      const currentCompletedTools = new Set<string>()
      const currentErrorTools = new Set<string>()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Parse complete SSE events from buffer
        const [events, remaining] = parseSSEBuffer(buffer)
        buffer = remaining

        for (const { event: eventType, data: eventData } of events) {
          try {
            const parsed = JSON.parse(eventData)

            switch (eventType) {
              case 'message_start':
                convId = parsed.conversation_id
                setConversationId(parsed.conversation_id)
                if (parsed.model) {
                  msgModel = parsed.model
                  msgModelReason = parsed.model_reason
                  setActiveModel(parsed.model)
                  setModelReason(parsed.model_reason || null)
                }
                break

              case 'content_delta':
                accumulatedText += parsed.text
                setStreamingText(accumulatedText)
                break

              case 'tool_use':
                if (parsed.status === 'calling') {
                  currentActiveTools.add(parsed.tool)
                  setActiveTools([...currentActiveTools])
                }
                break

              case 'tool_result':
                currentActiveTools.delete(parsed.tool)
                setActiveTools([...currentActiveTools])
                if (parsed.status === 'done') {
                  currentCompletedTools.add(parsed.tool)
                  setCompletedTools([...currentCompletedTools])
                  toolsUsed = [...new Set([...toolsUsed, parsed.tool])]
                } else if (parsed.status === 'error') {
                  currentErrorTools.add(parsed.tool)
                  setErrorTools([...currentErrorTools])
                  toolsUsed = [...new Set([...toolsUsed, parsed.tool])]
                }
                break

              case 'pending_action':
                pendingAction = {
                  id: parsed.id,
                  tool: parsed.tool,
                  description: parsed.description,
                  parameters: parsed.parameters,
                }
                break

              case 'subagent_start':
                setSubAgentEvent({ agent: parsed.agent, task: parsed.task })
                break

              case 'subagent_progress':
                setSubAgentEvent(prev => prev ? { ...prev, step: parsed.step } : { agent: parsed.agent, step: parsed.step })
                break

              case 'subagent_done':
                setSubAgentEvent(prev => prev ? { ...prev, success: parsed.success, artifacts: parsed.artifacts, error: parsed.error } : null)
                // Propagate sub-agent artifacts to detectedArtifacts so they render in the chat
                if (parsed.artifacts?.length) {
                  setDetectedArtifacts(prev => [
                    ...prev,
                    ...parsed.artifacts
                      .filter((a: Artifact) => a.content)
                      .map((a: Artifact) => ({
                        ...a,
                        id: a.id || crypto.randomUUID(),
                      }))
                  ])
                }
                break

              case 'artifact':
                if (parsed.id && parsed.type && parsed.content) {
                  setDetectedArtifacts(prev => {
                    if (prev.find(a => a.id === parsed.id)) return prev
                    return [...prev, {
                      id: parsed.id,
                      type: parsed.type,
                      title: parsed.title,
                      content: parsed.content,
                    }]
                  })
                }
                break

              case 'message_done':
                toolsUsed = parsed.tools_used || toolsUsed
                if (parsed.pending_action) {
                  pendingAction = parsed.pending_action
                }
                break

              case 'error':
                setError(parsed.message || 'Stream error')
                break
            }
          } catch {
            // ignore malformed JSON
          }
        }
      }

      // Finalize: add assistant message
      if (accumulatedText || toolsUsed.length > 0 || pendingAction) {
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: accumulatedText,
          tools_used: toolsUsed.length > 0 ? [...new Set(toolsUsed)] : undefined,
          pending_action: pendingAction,
          model_used: msgModel,
          model_reason: msgModelReason,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, assistantMsg])
      }

      setStreamingText('')
      setActiveTools([])

      // Clear sub-agent event after a delay
      setTimeout(() => setSubAgentEvent(null), 2000)

      // Refresh conversations list
      if (convId) {
        setConversationId(convId)
        loadConversations()
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled — finalize what we have
        setStreamingText('')
        setActiveTools([])
        return
      }
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMsg)
      // Remove user message on error (use functional update to target exact msg)
      setMessages(prev => {
        const lastIdx = prev.length - 1
        if (lastIdx >= 0 && prev[lastIdx].role === 'user' && prev[lastIdx].content === message) {
          return prev.slice(0, lastIdx)
        }
        return prev
      })
    } finally {
      streamingRef.current = false
      setIsStreaming(false)
      setStreamingText('')
      setActiveTools([])
      abortRef.current = null
    }
  }, [conversationId, loadConversations])

  const confirmAction = useCallback(async (actionId: string) => {
    if (isConfirming) return
    setIsConfirming(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirm_action: actionId,
          conversation_id: conversationId,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Failed to confirm' }))
        throw new Error(errData.error || `HTTP ${res.status}`)
      }

      const data = await res.json()

      // Clear pending action from the message that had it
      setMessages(prev => prev.map(msg =>
        msg.pending_action?.id === actionId
          ? { ...msg, pending_action: undefined }
          : msg
      ))

      // Add result as new assistant message
      const resultMsg: ChatMessage = {
        role: 'assistant',
        content: data.response || 'Action completed.',
        tools_used: data.tools_used,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, resultMsg])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm action')
    } finally {
      setIsConfirming(false)
    }
  }, [conversationId, isConfirming])

  const rejectAction = useCallback(async (actionId: string) => {
    if (isConfirming) return
    setIsConfirming(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reject_action: actionId,
          conversation_id: conversationId,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Failed to reject' }))
        throw new Error(errData.error || `HTTP ${res.status}`)
      }

      const data = await res.json()

      // Clear pending action from the message
      setMessages(prev => prev.map(msg =>
        msg.pending_action?.id === actionId
          ? { ...msg, pending_action: undefined }
          : msg
      ))

      const resultMsg: ChatMessage = {
        role: 'assistant',
        content: data.response || 'Action cancelled.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, resultMsg])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel action')
    } finally {
      setIsConfirming(false)
    }
  }, [conversationId, isConfirming])

  const loadConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/ai/conversations/${id}`)
      if (!res.ok) throw new Error('Failed to load conversation')

      const data = await res.json()
      setConversationId(data.id)
      setMessages(
        (data.messages || []).map((m: { role: string; content: string; tools_used?: string[]; model_used?: string; created_at: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          tools_used: m.tools_used,
          model_used: m.model_used,
          timestamp: new Date(m.created_at),
        }))
      )
      setError(null)
      setSubAgentEvent(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation')
    }
  }, [])

  const newConversation = useCallback(() => {
    setConversationId(null)
    setMessages([])
    setError(null)
    setStreamingText('')
    setActiveTools([])
    setCompletedTools([])
    setErrorTools([])
    setActiveModel(null)
    setModelReason(null)
    setSubAgentEvent(null)
    setDetectedArtifacts([])
  }, [])

  const deleteConversation = useCallback(async (id: string) => {
    try {
      await fetch(`/api/ai/conversations/${id}`, { method: 'DELETE' })
      setConversations(prev => prev.filter(c => c.id !== id))
      if (conversationId === id) {
        newConversation()
      }
    } catch {
      // silent fail
    }
  }, [conversationId, newConversation])

  const renameConversation = useCallback(async (id: string, title: string) => {
    try {
      const res = await fetch(`/api/ai/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (res.ok) {
        setConversations(prev => prev.map(c =>
          c.id === id ? { ...c, title } : c
        ))
      }
    } catch {
      // silent fail
    }
  }, [])

  const togglePinConversation = useCallback(async (id: string) => {
    const conv = conversations.find(c => c.id === id)
    if (!conv) return
    const newPinned = !conv.pinned
    try {
      // Optimistic update
      setConversations(prev => prev.map(c =>
        c.id === id ? { ...c, pinned: newPinned } : c
      ))
      const res = await fetch(`/api/ai/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: newPinned }),
      })
      if (!res.ok) {
        // Revert on failure
        setConversations(prev => prev.map(c =>
          c.id === id ? { ...c, pinned: !newPinned } : c
        ))
      }
    } catch {
      // Revert on failure
      setConversations(prev => prev.map(c =>
        c.id === id ? { ...c, pinned: !newPinned } : c
      ))
    }
  }, [conversations])

  // Edit a user message and resend from that point
  const editAndResend = useCallback(async (index: number, content: string) => {
    if (streamingRef.current) return
    // Truncate messages to the edited index (remove the edited msg and everything after)
    setMessages(prev => prev.slice(0, index))
    // Send the edited content as a new message
    await sendMessage(content)
  }, [sendMessage])

  // Delete a single message
  const deleteMessage = useCallback((index: number) => {
    setMessages(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Regenerate the last assistant response
  const regenerateLastResponse = useCallback(async () => {
    if (streamingRef.current) return
    // Find the last user message
    const lastUserIdx = messages.reduce((acc, msg, idx) => msg.role === 'user' ? idx : acc, -1)
    if (lastUserIdx < 0) return
    const lastUserContent = messages[lastUserIdx].content
    const lastUserAttachments = messages[lastUserIdx].attachments
    // Remove everything from the last user message onwards, then resend
    setMessages(prev => prev.slice(0, lastUserIdx))
    await sendMessage(lastUserContent, lastUserAttachments)
  }, [messages, sendMessage])

  return {
    messages,
    isStreaming,
    streamingText,
    activeTools,
    completedTools,
    errorTools,
    error,
    conversationId,
    conversations,
    activeModel,
    modelReason,
    subAgentEvent,
    detectedArtifacts,
    sendMessage,
    stopGenerating,
    confirmAction,
    rejectAction,
    loadConversation,
    newConversation,
    deleteConversation,
    renameConversation,
    togglePinConversation,
    loadConversations,
    editAndResend,
    deleteMessage,
    regenerateLastResponse,
    isConfirming,
  }
}
