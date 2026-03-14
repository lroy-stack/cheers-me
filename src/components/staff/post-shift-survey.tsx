'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, AlertCircle } from 'lucide-react'
import type { ClockOutSummary } from '@/types'
import {
  EMOJI_RATINGS,
  ANOMALY_REASONS,
  calculateShiftVariance,
  type AnomalyReason,
} from '@/lib/utils/shift-variance'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface PostShiftSurveyProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  summary: ClockOutSummary
}

type SurveyStep = 'anomaly' | 'rating' | 'feedback' | 'submitting' | 'done' | 'error'

export function PostShiftSurvey({ open, onOpenChange, summary }: PostShiftSurveyProps) {
  const t = useTranslations('staff.feedback')
  const [step, setStep] = useState<SurveyStep>('anomaly')
  const [rating, setRating] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const [anomalyReason, setAnomalyReason] = useState<AnomalyReason | null>(null)
  const [anomalyComment, setAnomalyComment] = useState('')

  const variance = calculateShiftVariance(summary)

  // Auto-skip anomaly step if no anomaly
  useEffect(() => {
    if (step === 'anomaly' && (!variance || !variance.hasAnomaly)) {
      setStep('rating')
    }
  }, [step, variance])

  // Auto-dismiss done step
  useEffect(() => {
    if (step === 'done') {
      const timer = setTimeout(() => onOpenChange(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [step, onOpenChange])

  const handleSkip = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  const handleNext = () => {
    if (step === 'anomaly') setStep('rating')
    else if (step === 'rating') setStep('feedback')
  }

  const handleSubmit = async () => {
    setStep('submitting')
    try {
      const res = await fetch('/api/staff/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clock_record_id: summary.clock_record_id,
          rating: rating || 3,
          feedback: feedback || undefined,
          anomaly_type: variance?.anomalyType || undefined,
          anomaly_reason: anomalyReason || undefined,
          anomaly_comment: anomalyComment || undefined,
          worked_minutes: variance?.workedMinutes,
          scheduled_minutes: variance?.scheduledMinutes,
          variance_minutes: variance?.varianceMinutes,
          break_variance_minutes: variance?.breakVarianceMinutes,
        }),
      })
      setStep(res.ok ? 'done' : 'error')
    } catch {
      setStep('error')
    }
  }

  const anomalyReasonLabels: Record<AnomalyReason, string> = {
    high_demand: t('reasonHighDemand'),
    understaffed: t('reasonUnderstaffed'),
    equipment_issue: t('reasonEquipment'),
    personal_decision: t('reasonPersonal'),
    other: t('reasonOther'),
  }

  const getAnomalyMessage = () => {
    if (!variance) return ''
    if (variance.anomalyType === 'overtime') {
      return t('anomalyOvertime', { minutes: variance.varianceMinutes })
    }
    if (variance.anomalyType === 'undertime') {
      return t('anomalyUndertime', { minutes: Math.abs(variance.varianceMinutes) })
    }
    if (variance.anomalyType === 'break_variance') {
      return variance.breakVarianceMinutes > 0
        ? t('anomalyBreakLonger', { minutes: variance.breakVarianceMinutes })
        : t('anomalyBreakShorter', { minutes: Math.abs(variance.breakVarianceMinutes) })
    }
    return ''
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'done' ? t('thankYou') : t('surveyTitle')}
          </DialogTitle>
          {step !== 'done' && step !== 'submitting' && step !== 'error' && (
            <DialogDescription>{t('surveyOptional')}</DialogDescription>
          )}
        </DialogHeader>

        {/* Anomaly Step */}
        {step === 'anomaly' && variance?.hasAnomaly && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                {getAnomalyMessage()}
              </p>
            </div>
            <div className="space-y-2">
              {ANOMALY_REASONS.map((reason) => (
                <Button
                  key={reason}
                  variant={anomalyReason === reason ? 'default' : 'outline'}
                  className="w-full justify-start h-11"
                  onClick={() => setAnomalyReason(reason)}
                >
                  {anomalyReasonLabels[reason]}
                </Button>
              ))}
            </div>
            {anomalyReason === 'other' && (
              <Textarea
                placeholder={t('anomalyCommentPlaceholder')}
                value={anomalyComment}
                onChange={(e) => setAnomalyComment(e.target.value.slice(0, 500))}
                className="min-h-[60px]"
              />
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleSkip} className="flex-1">
                {t('skip')}
              </Button>
              <Button onClick={handleNext} disabled={!anomalyReason} className="flex-1">
                {t('next')}
              </Button>
            </div>
          </div>
        )}

        {/* Rating Step */}
        {step === 'rating' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">{t('ratingPrompt')}</p>
            <div className="flex justify-center gap-3">
              {EMOJI_RATINGS.map((emoji, index) => {
                const val = index + 1
                return (
                  <button
                    key={val}
                    onClick={() => setRating(val)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                      rating === val
                        ? 'bg-primary/15 scale-110 ring-2 ring-primary/30'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <span className="text-3xl">{emoji}</span>
                  </button>
                )
              })}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleSkip} className="flex-1">
                {t('skip')}
              </Button>
              <Button onClick={handleNext} disabled={!rating} className="flex-1">
                {t('next')}
              </Button>
            </div>
          </div>
        )}

        {/* Feedback Step */}
        {step === 'feedback' && (
          <div className="space-y-4">
            <Textarea
              placeholder={t('feedbackPlaceholder')}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value.slice(0, 500))}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground text-right">
              {500 - feedback.length} {t('charsRemaining')}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleSkip} className="flex-1">
                {t('skip')}
              </Button>
              <Button onClick={handleSubmit} className="flex-1">
                {t('submit')}
              </Button>
            </div>
          </div>
        )}

        {/* Submitting */}
        {step === 'submitting' && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="text-center py-6">
            <CheckCircle className="h-12 w-12 text-success mx-auto mb-3" />
            <p className="text-muted-foreground">{t('thankYouMessage')}</p>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="text-center py-6 space-y-3">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-sm text-destructive">{t('errorMessage')}</p>
            <div className="flex gap-2 justify-center">
              <Button variant="ghost" onClick={handleSkip}>{t('skip')}</Button>
              <Button onClick={handleSubmit}>{t('retry')}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
