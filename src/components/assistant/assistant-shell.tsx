'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useAIChatStream } from '@/hooks/use-ai-chat-stream'
import { AssistantSidebar } from './assistant-sidebar'
import { AssistantChat } from './assistant-chat'
import { AssistantArtifacts } from './assistant-artifacts'
import { ImageGallery } from './image-gallery'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { Artifact } from '@/lib/ai/types'

const SIDEBAR_KEY = 'assistant-sidebar-collapsed'

/**
 * Three-column layout following Claude.ai architecture:
 * [Sidebar] [Main Chat] [Artifacts Panel]
 *
 * Desktop (md+): Sidebar collapses/expands with animation
 * Mobile (<md): Sidebar as Sheet overlay
 */

export function AssistantShell() {
  const t = useTranslations('common.assistant')
  const chat = useAIChatStream()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(SIDEBAR_KEY) === 'true'
  })
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null)
  const [artifactPanelOpen, setArtifactPanelOpen] = useState(false)
  const [artifactWidth, setArtifactWidth] = useState(420)
  const [showGallery, setShowGallery] = useState(false)
  const isResizing = useRef(false)

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev
      localStorage.setItem(SIDEBAR_KEY, String(next))
      return next
    })
  }, [])

  // Keyboard shortcut: Cmd/Ctrl + Shift + S to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 's') {
        e.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleSidebar])

  const handleOpenArtifact = useCallback((artifact: Artifact) => {
    setArtifacts(prev => {
      const exists = prev.find(a => a.id === artifact.id)
      if (exists) return prev
      return [...prev, artifact]
    })
    setActiveArtifactId(artifact.id)
    setArtifactPanelOpen(true)
  }, [])

  const handleCloseArtifact = useCallback((id: string) => {
    setArtifacts(prev => {
      const remaining = prev.filter(a => a.id !== id)
      if (activeArtifactId === id) {
        setActiveArtifactId(remaining.length > 0 ? remaining[remaining.length - 1].id : null)
      }
      if (remaining.length === 0) {
        setArtifactPanelOpen(false)
      }
      return remaining
    })
  }, [activeArtifactId])

  const handleCloseArtifactPanel = useCallback(() => {
    setArtifactPanelOpen(false)
  }, [])

  const handleEditArtifact = useCallback((instruction: string) => {
    chat.sendMessage(instruction)
  }, [chat])

  const handleUpdateArtifactContent = useCallback((id: string, content: string) => {
    setArtifacts(prev => prev.map(a => a.id === id ? { ...a, content } : a))
  }, [])

  // Auto-open artifacts detected by the SSE stream
  useEffect(() => {
    if (chat.detectedArtifacts.length > 0) {
      for (const artifact of chat.detectedArtifacts) {
        handleOpenArtifact(artifact)
      }
    }
  }, [chat.detectedArtifacts, handleOpenArtifact])

  // Close mobile artifact panel on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && artifactPanelOpen) {
        setArtifactPanelOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [artifactPanelOpen])

  const showArtifacts = artifactPanelOpen && artifacts.length > 0

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    const startX = e.clientX
    const startWidth = artifactWidth

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const delta = startX - e.clientX
      const newWidth = Math.min(Math.max(startWidth + delta, 300), window.innerWidth * 0.6)
      setArtifactWidth(newWidth)
    }

    const onMouseUp = () => {
      isResizing.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [artifactWidth])

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar — collapses with smooth transition */}
      <div
        className={cn(
          'hidden md:flex flex-shrink-0 border-r border-border transition-[width] duration-300 ease-in-out overflow-hidden',
          sidebarCollapsed ? 'w-0 border-r-0' : 'w-[280px]'
        )}
      >
        <div className="w-[280px] h-full flex-shrink-0">
          <AssistantSidebar
            conversations={chat.conversations}
            activeConversationId={chat.conversationId}
            onSelectConversation={(id) => { chat.loadConversation(id); setShowGallery(false) }}
            onNewConversation={() => { chat.newConversation(); setShowGallery(false) }}
            onDeleteConversation={(id) => { chat.deleteConversation(id) }}
            onRenameConversation={(id, title) => { chat.renameConversation(id, title) }}
            onTogglePinConversation={(id) => { chat.togglePinConversation(id) }}
            onOpenGallery={() => setShowGallery(true)}
          />
        </div>
      </div>

      {/* Mobile sidebar (Sheet) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetTitle className="sr-only">{t('conversations')}</SheetTitle>
          <AssistantSidebar
            conversations={chat.conversations}
            activeConversationId={chat.conversationId}
            onSelectConversation={(id) => {
              chat.loadConversation(id)
              setShowGallery(false)
              setSidebarOpen(false)
            }}
            onNewConversation={() => {
              chat.newConversation()
              setShowGallery(false)
              setSidebarOpen(false)
            }}
            onDeleteConversation={(id) => { chat.deleteConversation(id) }}
            onRenameConversation={(id, title) => { chat.renameConversation(id, title) }}
            onTogglePinConversation={(id) => { chat.togglePinConversation(id) }}
            onOpenGallery={() => { setShowGallery(true); setSidebarOpen(false) }}
          />
        </SheetContent>
      </Sheet>

      {/* Main content area — Chat or Gallery */}
      <div className="flex-1 flex flex-col min-w-0">
        {showGallery ? (
          <ImageGallery
            onBack={() => setShowGallery(false)}
            onOpenConversation={(id) => { chat.loadConversation(id); setShowGallery(false) }}
          />
        ) : (
          <AssistantChat
            chat={chat}
            onOpenSidebar={() => setSidebarOpen(true)}
            onOpenArtifact={handleOpenArtifact}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={toggleSidebar}
          />
        )}
      </div>

      {/* Resize handle — desktop only */}
      {showArtifacts && (
        <div
          className="hidden lg:flex w-1 cursor-col-resize items-center justify-center hover:bg-primary/20 active:bg-primary/40 transition-colors flex-shrink-0 group"
          onMouseDown={startResizing}
        >
          <div className="w-0.5 h-8 rounded-full bg-border group-hover:bg-primary/40 transition-colors" />
        </div>
      )}

      {/* Mobile backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          showArtifacts ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={handleCloseArtifactPanel}
        aria-hidden="true"
      />

      {/* Artifact panel */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-full sm:w-[420px]',
          'transition-transform duration-300 ease-in-out',
          'lg:relative lg:inset-auto lg:z-auto lg:transition-none',
          'lg:border-l lg:border-border lg:flex-shrink-0',
          showArtifacts
            ? 'translate-x-0'
            : 'translate-x-full lg:translate-x-0',
          showArtifacts
            ? 'lg:flex'
            : 'lg:w-0 lg:hidden',
        )}
        style={showArtifacts ? { width: `${artifactWidth}px` } : undefined}
      >
        {showArtifacts && (
          <AssistantArtifacts
            artifacts={artifacts}
            activeArtifactId={activeArtifactId}
            onSelectArtifact={setActiveArtifactId}
            onClose={handleCloseArtifactPanel}
            onCloseTab={handleCloseArtifact}
            onEditSubmit={handleEditArtifact}
            onUpdateArtifactContent={handleUpdateArtifactContent}
            isStreaming={chat.isStreaming}
          />
        )}
      </div>
    </div>
  )
}
