'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Sparkles } from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useBookingLanguage } from './booking-language-provider'
import type { BookingFormData } from './types'

interface Message {
  role: 'user' | 'assistant'
  content: string
  suggestion?: Partial<BookingFormData>
}

interface BookingAIAssistantProps {
  onApplySuggestion: (data: Partial<BookingFormData>) => void
}

export default function BookingAIAssistant({ onApplySuggestion }: BookingAIAssistantProps) {
  const { t } = useBookingLanguage()

  const QUICK_SUGGESTIONS = [
    t('aiAssistant.suggestion1'),
    t('aiAssistant.suggestion2'),
    t('aiAssistant.suggestion3'),
    t('aiAssistant.suggestion4'),
  ]
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return

    const userMessage: Message = { role: 'user', content: text.trim() }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/booking-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: messages.slice(-10).map(({ role, content }) => ({ role, content })),
        }),
      })

      const data = await res.json()

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.reply || t('aiAssistant.errorReply'),
        suggestion: data.suggestion || undefined,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t('aiAssistant.errorGeneric') },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleApplySuggestion = (suggestion: Partial<BookingFormData>) => {
    onApplySuggestion(suggestion)
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: t('aiAssistant.applied') },
    ])
  }

  return (
    <>
      {/* FAB */}
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-cheers-amber to-cheers-coral text-white shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="AI Assistant"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 max-h-[70vh] bg-card rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-cheers-amber to-cheers-coral px-4 py-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-white" />
              <div>
                <h4 className="text-white font-semibold text-sm">{t('aiAssistant.title')}</h4>
                <p className="text-white/70 text-xs">{t('aiAssistant.subtitle')}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[40vh]">
              {messages.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-4">
                  <p>{t('aiAssistant.greeting')}</p>
                  <p className="text-xs mt-1">{t('aiAssistant.greetingHint')}</p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-cheers-amber text-white rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                    }`}
                  >
                    <p>{msg.content}</p>
                    {msg.suggestion && (
                      <button
                        type="button"
                        onClick={() => handleApplySuggestion(msg.suggestion!)}
                        className="mt-2 w-full px-3 py-1.5 rounded-lg bg-white/20 dark:bg-white/10 text-xs font-medium hover:bg-white/30 transition-colors border border-white/20"
                      >
                        {t('aiAssistant.applyToBooking')}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-xl px-3 py-2 text-sm">
                    <motion.div
                      className="flex gap-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="w-2 h-2 rounded-full bg-muted-foreground"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                        />
                      ))}
                    </motion.div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick suggestions */}
            {messages.length === 0 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {QUICK_SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-cheers-amber hover:text-cheers-amber transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="border-t border-border p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  sendMessage(input)
                }}
                className="flex gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('aiAssistant.inputPlaceholder')}
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cheers-amber"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-lg bg-cheers-amber text-white flex items-center justify-center disabled:opacity-50 hover:bg-cheers-coral transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
