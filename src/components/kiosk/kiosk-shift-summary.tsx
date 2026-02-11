'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'
import type { ClockOutSummary } from '@/types'
import { format, parseISO } from 'date-fns'

interface KioskShiftSummaryProps {
  summary: ClockOutSummary
  onDismiss: () => void
  onContinueToSurvey?: () => void
}

const AUTO_DISMISS_SECONDS = 8

export function KioskShiftSummary({ summary, onDismiss, onContinueToSurvey }: KioskShiftSummaryProps) {
  const t = useTranslations('kiosk')
  const [countdown, setCountdown] = useState(AUTO_DISMISS_SECONDS)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Transition to survey if callback provided, else dismiss
          if (onContinueToSurvey) {
            onContinueToSurvey()
          } else {
            onDismiss()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [onDismiss, onContinueToSurvey])

  function formatMinutes(mins: number): string {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h}h ${m}m`
  }

  return (
    <div
      className="w-full max-w-md mx-auto px-6 cursor-pointer"
      onClick={onDismiss}
      onPointerDown={onDismiss}
    >
      <Card>
        <CardHeader className="text-center pb-2">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
          <CardTitle className="text-xl">{t('clockedOut')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('shiftSummary')}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Times */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Clock In</p>
              <p className="text-lg font-mono font-bold">
                {format(parseISO(summary.clock_in_time), 'HH:mm')}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Clock Out</p>
              <p className="text-lg font-mono font-bold">
                {format(parseISO(summary.clock_out_time), 'HH:mm')}
              </p>
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('totalHours')}</span>
              <span className="font-mono font-semibold">{formatMinutes(summary.total_minutes)}</span>
            </div>
            {summary.break_minutes > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('breakDuration')}</span>
                <span className="font-mono">{formatMinutes(summary.break_minutes)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>{t('netHours')}</span>
              <span className="font-mono">{formatMinutes(summary.net_minutes)}</span>
            </div>
          </div>

          {/* Scheduled vs actual */}
          {summary.scheduled_shift && (
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-1">{t('scheduledVsActual')}</p>
              <p className="text-sm">
                {summary.scheduled_shift.start_time} - {summary.scheduled_shift.end_time}
              </p>
            </div>
          )}

          {/* Auto-dismiss */}
          <div className="text-center pt-2">
            <p className="text-xs text-muted-foreground">
              {t('tapToDismiss')} ({countdown}s)
            </p>
            <div className="w-full bg-muted rounded-full h-1 mt-2 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-1000 ease-linear"
                style={{ width: `${(countdown / AUTO_DISMISS_SECONDS) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
