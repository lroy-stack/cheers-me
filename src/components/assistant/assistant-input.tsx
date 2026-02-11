'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Send, Square, Paperclip, X, Mic, MicOff, ImageIcon } from 'lucide-react'
import { useLocale } from 'next-intl'
import type { FileAttachment } from '@/lib/ai/types'
import { useSpeechToText } from '@/hooks/use-speech-to-text'

const ACCEPTED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILES = 5

interface AssistantInputProps {
  onSend: (message: string, attachments?: FileAttachment[]) => void
  onStop: () => void
  isStreaming: boolean
  disabled?: boolean
}

export function AssistantInput({ onSend, onStop, isStreaming, disabled }: AssistantInputProps) {
  const t = useTranslations('common.assistant')
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [imageMode, setImageMode] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const locale = useLocale()
  const speech = useSpeechToText({ locale })
  const inputBeforeListeningRef = useRef('')

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed && attachments.length === 0) return
    if (isStreaming) return

    const message = imageMode
      ? `[IMAGE_GENERATION_REQUEST] ${trimmed}`
      : trimmed
    onSend(message, attachments.length > 0 ? attachments : undefined)
    setInput('')
    setAttachments([])
    setImageMode(false)

    // Stop listening and reset transcript on send
    if (speech.isListening) {
      speech.stopListening()
    }
    speech.resetTranscript()
  }, [input, attachments, isStreaming, onSend, speech, imageMode])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
  }, [input])

  // Capture input text when speech starts
  useEffect(() => {
    if (speech.isListening) {
      inputBeforeListeningRef.current = input
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.isListening])

  // Sync final + interim transcript into input
  useEffect(() => {
    const fullTranscript = speech.transcript + (speech.interimTranscript ? speech.interimTranscript : '')
    if (fullTranscript) {
      const prefix = inputBeforeListeningRef.current
      const separator = prefix && !prefix.endsWith(' ') ? ' ' : ''
      setInput(prefix + separator + fullTranscript)
    }
  }, [speech.transcript, speech.interimTranscript])

  const handleFileUpload = useCallback((files: FileAttachment[]) => {
    setAttachments(prev => [...prev, ...files].slice(0, 5))
  }, [])

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(f => f.id !== id))
  }, [])

  const toggleMic = useCallback(() => {
    if (speech.isListening) {
      speech.stopListening()
    } else {
      speech.startListening()
    }
  }, [speech])

  const processFiles = useCallback(async (fileList: FileList) => {
    const files = Array.from(fileList).slice(0, MAX_FILES)
    const validFiles = files.filter(f =>
      ACCEPTED_TYPES.includes(f.type) && f.size <= MAX_SIZE
    )

    if (validFiles.length === 0) return

    try {
      const formData = new FormData()
      validFiles.forEach(f => formData.append('files', f))

      const res = await fetch('/api/ai/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        handleFileUpload(data.attachments)
      }
    } catch {
      // Upload failed silently
    }
  }, [handleFileUpload])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files)
    }
    // Reset input so the same file can be selected again
    e.target.value = ''
  }, [processFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files)
    }
  }, [processFiles])

  const micErrorKey = speech.error as string

  return (
    <div
      className={`border-t border-border bg-card px-4 py-3 shrink-0 transition-colors ${
        isDragging ? 'border-primary bg-primary/5' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Speech error message */}
      {speech.error && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-md bg-destructive/10 text-destructive text-xs">
          <MicOff className="h-3 w-3 shrink-0" />
          <span className="flex-1">{t(micErrorKey) || speech.error}</span>
          <button onClick={() => speech.startListening()} className="underline shrink-0">
            {t('retry')}
          </button>
        </div>
      )}

      {/* Listening indicator */}
      {speech.isListening && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-md bg-destructive/10 text-xs">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
          </span>
          <span className="text-destructive font-medium">
            {t('listening')}
          </span>
          {speech.interimTranscript && (
            <span className="text-muted-foreground italic truncate">
              {speech.interimTranscript}
            </span>
          )}
        </div>
      )}

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map(file => (
            <div
              key={file.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted text-xs"
            >
              <span className="truncate max-w-[120px]">{file.filename}</span>
              <button onClick={() => removeAttachment(file.id)} className="shrink-0">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Image mode indicator */}
      {imageMode && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-md bg-primary/10 text-xs">
          <ImageIcon className="h-3 w-3 text-primary shrink-0" />
          <span className="text-primary font-medium">{t('generateImage')}</span>
          <button onClick={() => setImageMode(false)} className="ml-auto shrink-0">
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming}
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <Button
          variant={imageMode ? 'default' : 'ghost'}
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => { setImageMode(!imageMode); textareaRef.current?.focus() }}
          disabled={isStreaming}
          title={t('generateImage')}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>

        {speech.isSupported && (
          <Button
            variant={speech.isListening ? 'destructive' : 'ghost'}
            size="icon"
            className={`h-8 w-8 shrink-0 ${speech.isListening ? 'animate-pulse' : ''}`}
            onClick={toggleMic}
            disabled={isStreaming}
            title={speech.isListening ? t('stopListening') : t('startListening')}
          >
            {speech.isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        )}

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={imageMode ? t('imagePlaceholder') : t('placeholder')}
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent border-0 outline-none text-sm leading-relaxed max-h-[200px] py-2"
        />

        {isStreaming ? (
          <Button
            variant="destructive"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onStop}
          >
            <Square className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            variant="default"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleSubmit}
            disabled={!input.trim() && attachments.length === 0}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
