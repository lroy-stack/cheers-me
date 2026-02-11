'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { Sparkles, Send, Loader2, Copy, Check } from 'lucide-react'
import { ReviewCard } from './review-card'

interface Review {
  id: string
  customer_id: string | null
  platform: string
  rating: number
  review_text: string
  sentiment: 'positive' | 'neutral' | 'negative'
  response_draft: string | null
  response_sent: string | null
  created_at: string
  customer?: {
    id: string
    name: string
    email: string | null
    vip: boolean
  }
}

interface ReviewResponseDialogProps {
  review: Review
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ReviewResponseDialog({
  review,
  open,
  onOpenChange,
  onSuccess,
}: ReviewResponseDialogProps) {
  const t = useTranslations('customers.reviews')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [responseDraft, setResponseDraft] = useState(review.response_draft || '')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setResponseDraft(review.response_draft || '')
  }, [review.response_draft])

  const handleGenerateResponse = async () => {
    setIsGenerating(true)
    setError(null)
    try {
      const response = await fetch(`/api/crm/reviews/${review.id}/generate-response`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate response')
      }

      const data = await response.json()
      setResponseDraft(data.response_draft || '')
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate response')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSendResponse = async () => {
    if (!responseDraft.trim()) {
      setError('Please enter a response before sending')
      return
    }

    setIsSending(true)
    setError(null)
    try {
      const response = await fetch(`/api/crm/reviews/${review.id}/send-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response_text: responseDraft }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send response')
      }

      onSuccess()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send response')
    } finally {
      setIsSending(false)
    }
  }

  const handleCopyResponse = async () => {
    try {
      await navigator.clipboard.writeText(responseDraft)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const getPlatformUrl = (platform: string) => {
    const normalized = platform.toLowerCase()
    if (normalized.includes('tripadvisor')) {
      return 'https://www.tripadvisor.com/UserReview'
    }
    if (normalized.includes('google')) {
      return 'https://business.google.com/'
    }
    if (normalized.includes('restaurant guru')) {
      return 'https://restaurant.guru/'
    }
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('responseTitle')}</DialogTitle>
          <DialogDescription>
            {t('responseDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Review Display */}
          <ReviewCard review={review} />

          {error && (
            <Alert variant="destructive">
              <p className="text-sm">{error}</p>
            </Alert>
          )}

          {/* Response already sent */}
          {review.response_sent ? (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Check className="h-4 w-4 text-green-600" />
                <p className="text-sm font-semibold text-green-600">{t('responseSent')}</p>
              </div>
              <p className="text-sm">{review.response_sent}</p>
            </div>
          ) : (
            <>
              {/* Response Draft */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="response">{t('responseDraft')}</Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGenerateResponse}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('generating')}
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          {t('generateAI')}
                        </>
                      )}
                    </Button>
                    {responseDraft && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyResponse}
                      >
                        {copied ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            {t('copied')}
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            {t('copy')}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                <textarea
                  id="response"
                  className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder={t('responsePlaceholder')}
                  value={responseDraft}
                  onChange={(e) => setResponseDraft(e.target.value)}
                  disabled={isGenerating}
                />
                <p className="text-xs text-muted-foreground">
                  {t('responseTip', { platform: review.platform })}
                </p>
              </div>

              {/* Platform Link */}
              {getPlatformUrl(review.platform) && (
                <Alert>
                  <p className="text-sm">
                    {t('responseInstruction', { platform: review.platform })}
                  </p>
                </Alert>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          {!review.response_sent && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('cancel')}
              </Button>
              <Button
                onClick={handleSendResponse}
                disabled={!responseDraft.trim() || isSending}
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('markingSent')}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {t('markAsSent')}
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
