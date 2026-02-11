'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle } from 'lucide-react'
import type { ClockOutSummary } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'

interface KioskShiftSurveyProps {
  employeeId: string
  clockRecordId: string
  summary: ClockOutSummary
  onComplete: () => void
}

type SurveyStep = 'anomaly' | 'rating' | 'feedback' | 'submitting' | 'thankyou'

const EMOJI_RATINGS = ['😡', '😕', '😐', '🙂', '😄']

export function KioskShiftSurvey({
  employeeId,
  clockRecordId,
  summary,
  onComplete,
}: KioskShiftSurveyProps) {
  const t = useTranslations('kiosk.survey')
  const [step, setStep] = useState<SurveyStep>('anomaly')
  const [rating, setRating] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const [anomalyType, setAnomalyType] = useState<string | null>(null)
  const [anomalyReason, setAnomalyReason] = useState<string | null>(null)
  const [anomalyComment, setAnomalyComment] = useState('')

  // Detect anomalies
  const hasAnomaly = () => {
    if (!summary.scheduled_shift) return false

    // Calculate scheduled duration
    const startParts = summary.scheduled_shift.start_time.split(':')
    const endParts = summary.scheduled_shift.end_time.split(':')
    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1])
    let endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1])
    if (endMinutes < startMinutes) endMinutes += 24 * 60
    const scheduledMinutes = endMinutes - startMinutes

    const variance = summary.total_minutes - scheduledMinutes
    const breakVariance = Math.abs(summary.break_minutes - 30) // Assuming 30min standard break

    return Math.abs(variance) > 15 || breakVariance > 15
  }

  const getAnomalyMessage = () => {
    if (!summary.scheduled_shift) return null

    const startParts = summary.scheduled_shift.start_time.split(':')
    const endParts = summary.scheduled_shift.end_time.split(':')
    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1])
    let endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1])
    if (endMinutes < startMinutes) endMinutes += 24 * 60
    const scheduledMinutes = endMinutes - startMinutes

    const variance = summary.total_minutes - scheduledMinutes

    if (variance > 15) {
      setAnomalyType('overtime')
      return t('anomalyOvertime', { minutes: variance })
    }

    const breakVariance = summary.break_minutes - 30
    if (Math.abs(breakVariance) > 15) {
      setAnomalyType('break_variance')
      if (breakVariance > 0) {
        return t('anomalyBreakLonger', { minutes: breakVariance })
      } else {
        return t('anomalyBreakShorter', { minutes: Math.abs(breakVariance) })
      }
    }

    return null
  }

  // Auto-advance from anomaly if no anomaly detected
  useEffect(() => {
    if (step === 'anomaly' && !hasAnomaly()) {
      setStep('rating')
    }
  }, [step])

  // Auto-dismiss thank you
  useEffect(() => {
    if (step === 'thankyou') {
      const timer = setTimeout(() => {
        onComplete()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [step, onComplete])

  const handleAnomalyReasonSelect = (reason: string) => {
    setAnomalyReason(reason)
  }

  const handleRatingSelect = (selectedRating: number) => {
    setRating(selectedRating)
  }

  const handleSkip = () => {
    onComplete()
  }

  const handleNext = () => {
    if (step === 'anomaly') {
      setStep('rating')
    } else if (step === 'rating') {
      setStep('feedback')
    }
  }

  const handleSubmit = async () => {
    setStep('submitting')

    try {
      const response = await fetch('/api/public/kiosk/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          clock_record_id: clockRecordId,
          rating: rating || 3,
          feedback: feedback || undefined,
          anomaly_type: anomalyType || undefined,
          anomaly_reason: anomalyReason || undefined,
          anomaly_comment: anomalyComment || undefined,
        }),
      })

      if (response.ok) {
        setStep('thankyou')
      } else {
        console.error('Survey submission failed')
        setStep('thankyou') // Still show thank you to avoid confusing user
      }
    } catch (error) {
      console.error('Survey submission error:', error)
      setStep('thankyou')
    }
  }

  const anomalyReasons = [
    { key: 'high_demand', label: t('reasonHighDemand') },
    { key: 'understaffed', label: t('reasonUnderstaffed') },
    { key: 'equipment_issue', label: t('reasonEquipment') },
    { key: 'personal_decision', label: t('reasonPersonal') },
    { key: 'other', label: t('reasonOther') },
  ]

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  }

  return (
    <div className="w-full max-w-md mx-auto px-6">
      <AnimatePresence mode="wait">
        {step === 'anomaly' && hasAnomaly() && (
          <motion.div
            key="anomaly"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-xl">{t('anomalyTitle')}</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  {getAnomalyMessage()}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {anomalyReasons.map((reason) => (
                  <Button
                    key={reason.key}
                    variant={anomalyReason === reason.key ? 'default' : 'outline'}
                    className="w-full h-14 text-base"
                    onClick={() => handleAnomalyReasonSelect(reason.key)}
                  >
                    {reason.label}
                  </Button>
                ))}
                {anomalyReason === 'other' && (
                  <Textarea
                    placeholder={t('anomalyCommentPlaceholder')}
                    value={anomalyComment}
                    onChange={(e) => setAnomalyComment(e.target.value.slice(0, 500))}
                    className="mt-2 min-h-[80px]"
                  />
                )}
                <div className="flex gap-2 pt-4">
                  <Button variant="ghost" onClick={handleSkip} className="flex-1 h-12">
                    {t('skip')}
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!anomalyReason}
                    className="flex-1 h-12"
                  >
                    {t('next')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'rating' && (
          <motion.div
            key="rating"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-xl">{t('ratingTitle')}</CardTitle>
                <p className="text-sm text-muted-foreground">{t('ratingPrompt')}</p>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center gap-4 mb-6">
                  {EMOJI_RATINGS.map((emoji, index) => {
                    const ratingValue = index + 1
                    const isSelected = rating === ratingValue
                    return (
                      <motion.button
                        key={ratingValue}
                        onClick={() => handleRatingSelect(ratingValue)}
                        className="flex flex-col items-center gap-2 p-2 rounded-lg transition-all"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        animate={{
                          scale: isSelected ? 1.2 : 1,
                          backgroundColor: isSelected
                            ? 'hsl(var(--primary) / 0.15)'
                            : 'transparent',
                        }}
                        style={{ minWidth: '56px', minHeight: '56px' }}
                      >
                        <span className="text-4xl">{emoji}</span>
                        <span className="text-xs text-muted-foreground">
                          {t(`rating${ratingValue}`)}
                        </span>
                      </motion.button>
                    )
                  })}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={handleSkip} className="flex-1 h-12">
                    {t('skip')}
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!rating}
                    className="flex-1 h-12"
                  >
                    {t('next')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'feedback' && (
          <motion.div
            key="feedback"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-xl">{t('feedbackTitle')}</CardTitle>
                <p className="text-sm text-muted-foreground">{t('feedbackPrompt')}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Textarea
                    placeholder={t('feedbackPlaceholder')}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value.slice(0, 500))}
                    className="min-h-[120px] text-base"
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {t('charsRemaining', { count: 500 - feedback.length })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={handleSkip} className="flex-1 h-12">
                    {t('skip')}
                  </Button>
                  <Button onClick={handleSubmit} className="flex-1 h-12">
                    {t('submit')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'submitting' && (
          <motion.div
            key="submitting"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="flex justify-center items-center py-20"
          >
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </motion.div>
        )}

        {step === 'thankyou' && (
          <motion.div
            key="thankyou"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardContent className="text-center py-12">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', duration: 0.5 }}
                >
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">{t('thankYou')}</h2>
                <p className="text-muted-foreground">{t('thankYouMessage')}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
