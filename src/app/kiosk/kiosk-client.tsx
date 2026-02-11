'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { KioskEmployeeStatus, ClockOutSummary } from '@/types'
import { KioskIdleScreen } from '@/components/kiosk/kiosk-idle-screen'
import { KioskPinPad } from '@/components/kiosk/kiosk-pin-pad'
import { KioskDashboard } from '@/components/kiosk/kiosk-dashboard'
import { KioskShiftSummary } from '@/components/kiosk/kiosk-shift-summary'
import { KioskShiftSurvey } from '@/components/kiosk/kiosk-shift-survey'
import { KioskTurnstileWidget } from '@/components/kiosk/kiosk-turnstile-widget'
import { Loader2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

type KioskState = 'IDLE' | 'PIN_ENTRY' | 'TURNSTILE' | 'LOADING' | 'DASHBOARD' | 'SUMMARY' | 'SURVEY'

export function KioskClient() {
  const t = useTranslations('kiosk')
  const [state, setState] = useState<KioskState>('IDLE')
  const [employeeStatus, setEmployeeStatus] = useState<KioskEmployeeStatus | null>(null)
  const [summary, setSummary] = useState<ClockOutSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  // NEW: Track PIN and Turnstile token separately
  const [enteredPin, setEnteredPin] = useState<string | null>(null)
  const [_turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const goToIdle = useCallback(() => {
    setState('IDLE')
    setEmployeeStatus(null)
    setSummary(null)
    setError(null)
    setEnteredPin(null)
    setTurnstileToken(null)
    // Clear session token on logout
    localStorage.removeItem('kiosk_session_token')
  }, [])

  const handleTouchToBegin = useCallback(() => {
    setState('PIN_ENTRY')
    setError(null)
  }, [])

  // MODIFIED: Now goes to TURNSTILE instead of making API call
  const handlePinSubmit = useCallback((pin: string) => {
    setEnteredPin(pin)
    setState('TURNSTILE')
    setError(null)
  }, [])

  // NEW: Handle Turnstile success and verify PIN
  const handleTurnstileSuccess = useCallback(async (token: string) => {
    setTurnstileToken(token)
    setState('LOADING')

    try {
      const res = await fetch('/api/public/kiosk/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: enteredPin,
          turnstile_token: token,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        if (res.status === 429) {
          setError(t('accountLocked', { minutes: data.minutes || 15 }))
        } else if (res.status === 403) {
          setError(t('securityCheckFailed'))
        } else {
          setError(t('invalidPin'))
        }
        setState('PIN_ENTRY')
        setEnteredPin(null)
        setTurnstileToken(null)
        return
      }

      const status: KioskEmployeeStatus & { session_token?: string } = await res.json()

      // NEW: Store session token in localStorage
      if (status.session_token) {
        localStorage.setItem('kiosk_session_token', status.session_token)
      }

      setEmployeeStatus(status)
      setState('DASHBOARD')
    } catch (err) {
      console.error('Verification error:', err)
      setError(t('error'))
      setState('PIN_ENTRY')
      setEnteredPin(null)
      setTurnstileToken(null)
    }
  }, [enteredPin, t])

  // NEW: Handle Turnstile error
  const handleTurnstileError = useCallback((errorMessage: string) => {
    setError(errorMessage)
  }, [])

  // NEW: Handle Turnstile expiration
  const handleTurnstileExpire = useCallback(() => {
    setError(t('securityCheckExpired'))
    setState('PIN_ENTRY')
    setEnteredPin(null)
    setTurnstileToken(null)
  }, [t])

  const handleClockOut = useCallback((clockOutSummary: ClockOutSummary) => {
    setSummary(clockOutSummary)
    setState('SUMMARY')
  }, [])

  const handleContinueToSurvey = useCallback(() => {
    setState('SURVEY')
  }, [])

  const handleStatusUpdate = useCallback((updatedStatus: KioskEmployeeStatus) => {
    setEmployeeStatus(updatedStatus)
  }, [])

  // Animation variants for state transitions
  const pageVariants = {
    initial: (direction: string) => {
      if (direction === 'fade') return { opacity: 0 }
      if (direction === 'scale') return { opacity: 0, scale: 1.05 }
      if (direction === 'slide') return { opacity: 0, x: 50 }
      return { opacity: 0 }
    },
    animate: { opacity: 1, scale: 1, x: 0 },
    exit: { opacity: 0, scale: 0.98 },
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <AnimatePresence mode="wait">
        {state === 'IDLE' && (
          <motion.div
            key="idle"
            custom="fade"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            <KioskIdleScreen onTouchToBegin={handleTouchToBegin} />
          </motion.div>
        )}

        {state === 'PIN_ENTRY' && (
          <motion.div
            key="pin-entry"
            custom="scale"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <KioskPinPad
              onSubmit={handlePinSubmit}
              onCancel={goToIdle}
              error={error}
            />
          </motion.div>
        )}

        {/* NEW: Turnstile security check screen */}
        {state === 'TURNSTILE' && (
          <motion.div
            key="turnstile"
            custom="fade"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center space-y-6 p-8 max-w-md mx-auto"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold">{t('securityCheck')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('securityCheckDescription')}
              </p>
            </div>

            <KioskTurnstileWidget
              onSuccess={handleTurnstileSuccess}
              onError={handleTurnstileError}
              onExpire={handleTurnstileExpire}
            />

            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-sm text-destructive text-center">{error}</p>
              </div>
            )}

            <Button
              variant="ghost"
              onClick={() => {
                setState('PIN_ENTRY')
                setEnteredPin(null)
                setError(null)
              }}
              className="mt-4"
            >
              {t('back')}
            </Button>
          </motion.div>
        )}

        {state === 'LOADING' && (
          <motion.div
            key="loading"
            custom="fade"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-4"
          >
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">{t('verifying') || t('enterPin')}</p>
          </motion.div>
        )}

        {state === 'DASHBOARD' && employeeStatus && (
          <motion.div
            key="dashboard"
            custom="slide"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            <KioskDashboard
              employeeStatus={employeeStatus}
              onBack={goToIdle}
              onClockOut={handleClockOut}
              onStatusUpdate={handleStatusUpdate}
            />
          </motion.div>
        )}

        {state === 'SUMMARY' && summary && (
          <motion.div
            key="summary"
            custom="fade"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            <KioskShiftSummary
              summary={summary}
              onDismiss={goToIdle}
              onContinueToSurvey={handleContinueToSurvey}
            />
          </motion.div>
        )}

        {state === 'SURVEY' && summary && employeeStatus && (
          <motion.div
            key="survey"
            custom="fade"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            <KioskShiftSurvey
              employeeId={employeeStatus.employee_id}
              clockRecordId={summary.clock_record_id}
              summary={summary}
              onComplete={goToIdle}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
