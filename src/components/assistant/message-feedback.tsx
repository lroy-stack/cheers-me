'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { ThumbsUp, ThumbsDown, X } from 'lucide-react'

interface MessageFeedbackProps {
  messageId: string
  conversationId: string | null
}

type Rating = 'positive' | 'negative'

const NEGATIVE_REASON_KEYS = [
  { key: 'incorrect', i18nKey: 'feedbackIncorrect' },
  { key: 'unhelpful', i18nKey: 'feedbackUnhelpful' },
  { key: 'wrong_tool', i18nKey: 'feedbackWrongTool' },
  { key: 'bad_artifact', i18nKey: 'feedbackBadArtifact' },
  { key: 'other', i18nKey: 'feedbackOther' },
] as const

export function MessageFeedback({ messageId, conversationId }: MessageFeedbackProps) {
  const t = useTranslations('common.assistant')
  const [submitted, setSubmitted] = useState<Rating | null>(null)
  const [showReasonPicker, setShowReasonPicker] = useState(false)
  const [comment, setComment] = useState('')

  const submitFeedback = useCallback(async (rating: Rating, reason?: string) => {
    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_id: messageId,
          conversation_id: conversationId,
          rating,
          reason,
          comment: comment.trim() || undefined,
        }),
      })
      setSubmitted(rating)
      setShowReasonPicker(false)
    } catch {
      // Silent fail
    }
  }, [messageId, conversationId, comment])

  const handleThumbsUp = useCallback(() => {
    submitFeedback('positive')
  }, [submitFeedback])

  const handleThumbsDown = useCallback(() => {
    setShowReasonPicker(true)
  }, [])

  if (submitted) {
    return (
      <span className="text-xs text-muted-foreground">
        {submitted === 'positive' ? t('feedbackThanks') : t('feedbackRecorded')}
      </span>
    )
  }

  return (
    <div className="inline-flex flex-col">
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 max-sm:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleThumbsUp}
          title={t('feedbackPositive')}
        >
          <ThumbsUp className="h-3 w-3 text-muted-foreground hover:text-green-500" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleThumbsDown}
          title={t('feedbackNegative')}
        >
          <ThumbsDown className="h-3 w-3 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>


      {showReasonPicker && (
        <div className="mt-1 p-2 rounded-lg border bg-card shadow-sm space-y-1.5 max-w-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">{t('feedbackWhyBad')}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => setShowReasonPicker(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          {NEGATIVE_REASON_KEYS.map(r => (
            <button
              key={r.key}
              className="block w-full text-left text-xs px-2 py-1 rounded hover:bg-muted transition-colors"
              onClick={() => submitFeedback('negative', r.key)}
            >
              {t(r.i18nKey)}
            </button>
          ))}
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder={t('feedbackComment')}
            className="w-full text-xs px-2 py-1 border rounded bg-background resize-none"
            rows={2}
          />
          {comment.trim() && (
            <Button
              variant="default"
              size="sm"
              className="w-full text-xs h-6"
              onClick={() => submitFeedback('negative', 'other')}
            >
              {t('feedbackSubmit')}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
