'use client'

import { Button } from '@/components/ui/button'
import { useReducer, useCallback, useRef, useLayoutEffect, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBookingLanguage } from './booking-language-provider'
import ProgressBar from './progress-bar'
import StepOccasion from './step-occasion'
import StepDateTime from './step-datetime'
import StepPartySize from './step-party-size'
import StepGuestInfo from './step-guest-info'
import StepReview from './step-review'
import BookingSuccess from './booking-success'
import BookingAIAssistant from './booking-ai-assistant'
import {
  STEPS,
  type WizardState,
  type WizardAction,
  type BookingFormData,
  type BookingStep,
} from './types'

const initialFormData: BookingFormData = {
  occasion: null,
  reservation_date: '',
  start_time: '',
  party_size: 2,
  guest_name: '',
  guest_email: '',
  guest_phone: '',
  special_requests: '',
  language: 'en',
  privacy_consent: false,
}

const initialState: WizardState = {
  currentStep: 'occasion',
  stepIndex: 0,
  direction: 1,
  formData: initialFormData,
  availability: null,
  bookingResult: null,
  isLoading: false,
}

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'NEXT_STEP': {
      const nextIndex = Math.min(state.stepIndex + 1, STEPS.length - 1)
      return {
        ...state,
        stepIndex: nextIndex,
        currentStep: STEPS[nextIndex],
        direction: 1,
      }
    }
    case 'PREV_STEP': {
      const prevIndex = Math.max(state.stepIndex - 1, 0)
      return {
        ...state,
        stepIndex: prevIndex,
        currentStep: STEPS[prevIndex],
        direction: -1,
      }
    }
    case 'GO_TO_STEP': {
      const idx = Math.max(0, Math.min(action.index, STEPS.length - 1))
      return {
        ...state,
        stepIndex: idx,
        currentStep: STEPS[idx],
        direction: idx > state.stepIndex ? 1 : -1,
      }
    }
    case 'SET_STEP': {
      const idx = STEPS.indexOf(action.step)
      if (idx < 0) return state
      return {
        ...state,
        stepIndex: idx,
        currentStep: action.step,
        direction: idx > state.stepIndex ? 1 : -1,
      }
    }
    case 'UPDATE_FORM':
      return { ...state, formData: { ...state.formData, ...action.data } }
    case 'SET_AVAILABILITY':
      return { ...state, availability: action.result }
    case 'SET_BOOKING_RESULT':
      return { ...state, bookingResult: action.result }
    case 'SET_LOADING':
      return { ...state, isLoading: action.loading }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

/** Blur + slide transitions for step changes */
const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 120 : -120,
    opacity: 0,
    filter: 'blur(6px)',
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: 'blur(0px)',
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -120 : 120,
    opacity: 0,
    filter: 'blur(6px)',
  }),
}

export default function BookingWizard() {
  const { t } = useBookingLanguage()
  const [state, dispatch] = useReducer(reducer, initialState)
  const { currentStep, stepIndex, direction, formData, availability, bookingResult, isLoading } = state

  // Fetch reservation settings for dynamic limits
  const [maxPartySize, setMaxPartySize] = useState(20)
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(30)
  useEffect(() => {
    fetch('/api/reservations/settings')
      .then(r => r.json())
      .then(d => {
        if (d?.max_party_size) setMaxPartySize(d.max_party_size)
        if (d?.max_advance_booking_days) setMaxAdvanceDays(d.max_advance_booking_days)
      })
      .catch(() => { /* use defaults */ })
  }, [])

  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Lock container height before step change to prevent scroll jump
  const lockHeight = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.style.minHeight = `${containerRef.current.offsetHeight}px`
    }
  }, [])

  const next = useCallback(() => { hasInteracted.current = true; lockHeight(); dispatch({ type: 'NEXT_STEP' }) }, [lockHeight])
  const prev = useCallback(() => { hasInteracted.current = true; lockHeight(); dispatch({ type: 'PREV_STEP' }) }, [lockHeight])
  const goTo = useCallback((index: number) => { hasInteracted.current = true; lockHeight(); dispatch({ type: 'GO_TO_STEP', index }) }, [lockHeight])

  // Track whether user has interacted with the wizard (changed step)
  const hasInteracted = useRef(false)

  // After step renders, release locked height and keep wizard in viewport
  useLayoutEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.minHeight = ''
    }

    // Only scroll after a user-initiated step change, never on initial mount
    if (!hasInteracted.current) {
      return
    }

    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect()
      if (rect.top < 0 || rect.top > window.innerHeight * 0.4) {
        wrapperRef.current.scrollIntoView({ block: 'start', behavior: 'smooth' })
      }
    }
  }, [currentStep])

  const updateForm = useCallback(
    (data: Partial<BookingFormData>) => dispatch({ type: 'UPDATE_FORM', data }),
    []
  )

  const checkAvailability = useCallback(async () => {
    if (!formData.reservation_date || !formData.start_time) return

    dispatch({ type: 'SET_LOADING', loading: true })
    dispatch({ type: 'SET_AVAILABILITY', result: null })

    try {
      const params = new URLSearchParams({
        date: formData.reservation_date,
        time: formData.start_time,
        party_size: String(formData.party_size),
      })
      const res = await fetch(`/api/reservations/availability?${params}`)
      const data = await res.json()

      if (!res.ok || data.error) {
        dispatch({
          type: 'SET_AVAILABILITY',
          result: { available: false, reason: data.error || 'Unable to check availability' },
        })
      } else {
        dispatch({ type: 'SET_AVAILABILITY', result: data })
      }
    } catch {
      dispatch({
        type: 'SET_AVAILABILITY',
        result: { available: false, reason: 'Unable to check availability. Please try again.' },
      })
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false })
    }
  }, [formData.reservation_date, formData.start_time, formData.party_size])

  const submitBooking = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', loading: true })

    try {
      const res = await fetch('/api/public/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_name: formData.guest_name,
          guest_email: formData.guest_email || undefined,
          guest_phone: formData.guest_phone,
          party_size: formData.party_size,
          reservation_date: formData.reservation_date,
          start_time: formData.start_time,
          occasion: formData.occasion || undefined,
          special_requests: formData.special_requests || undefined,
          language: formData.language,
          privacy_consent: formData.privacy_consent,
        }),
      })

      const data = await res.json()

      if (data.success) {
        dispatch({
          type: 'SET_BOOKING_RESULT',
          result: {
            success: true,
            message: data.message,
            reservation: data.reservation,
          },
        })
      } else {
        dispatch({
          type: 'SET_BOOKING_RESULT',
          result: {
            success: false,
            message: data.error || data.message || 'Booking failed. Please try again.',
          },
        })
      }
    } catch {
      dispatch({
        type: 'SET_BOOKING_RESULT',
        result: {
          success: false,
          message: 'An error occurred. Please try again or contact us directly.',
        },
      })
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false })
    }
  }, [formData])

  const handleApplySuggestion = useCallback(
    (data: Partial<BookingFormData>) => {
      dispatch({ type: 'UPDATE_FORM', data })
    },
    []
  )

  // Show success screen
  if (bookingResult?.success) {
    return (
      <>
        <BookingSuccess
          result={bookingResult}
          onNewBooking={() => dispatch({ type: 'RESET' })}
        />
        <BookingAIAssistant onApplySuggestion={handleApplySuggestion} />
      </>
    )
  }

  // Show error and allow retry
  if (bookingResult && !bookingResult.success) {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-destructive font-medium">{bookingResult.message}</p>
        <Button
          type="button"
          onClick={() => dispatch({ type: 'SET_BOOKING_RESULT', result: null })}
          className="px-6 py-2 rounded-full bg-primary text-white font-medium glow-hover"
        >
          {t('aiAssistant.tryAgain')}
        </Button>
      </div>
    )
  }

  const renderStep = (step: BookingStep) => {
    switch (step) {
      case 'occasion':
        return (
          <StepOccasion
            selected={formData.occasion}
            onSelect={(o) => updateForm({ occasion: o })}
            onNext={next}
          />
        )
      case 'datetime':
        return (
          <StepDateTime
            date={formData.reservation_date}
            time={formData.start_time}
            onDateChange={(d) => updateForm({ reservation_date: d })}
            onTimeChange={(t) => updateForm({ start_time: t })}
            onNext={next}
            maxAdvanceDays={maxAdvanceDays}
          />
        )
      case 'party-size':
        return (
          <StepPartySize
            partySize={formData.party_size}
            onPartySizeChange={(s) => updateForm({ party_size: s })}
            onNext={next}
            maxPartySize={maxPartySize}
          />
        )
      case 'guest-info':
        return (
          <StepGuestInfo
            formData={formData}
            onUpdate={updateForm}
            onNext={next}
            onBack={prev}
          />
        )
      case 'review':
        return (
          <StepReview
            formData={formData}
            availability={availability}
            isLoading={isLoading}
            onEdit={goTo}
            onConfirm={submitBooking}
            onBack={prev}
            onCheckAvailability={checkAvailability}
          />
        )
    }
  }

  return (
    <div ref={wrapperRef} className="py-12 sm:py-16 px-4 sm:px-6 scroll-mt-4">
      <div className="max-w-2xl lg:max-w-3xl mx-auto">
        {/* Mini-hero heading */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-10"
        >
          <h2 data-testid="wizard-heading" className="text-3xl sm:text-4xl font-light text-foreground tracking-tight">
            {t('hero.reserveTable')}
          </h2>
        </motion.div>

        {/* Progress bar */}
        <ProgressBar currentIndex={stepIndex} onStepClick={goTo} />

        {/* Glass card container */}
        <div className="mt-8 sm:mt-10 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/40 p-6 sm:p-8 lg:p-10 shadow-sm">
          <div ref={containerRef} className="relative">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                {renderStep(currentStep)}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mt-12">
        <BookingAIAssistant onApplySuggestion={handleApplySuggestion} />
      </div>
    </div>
  )
}
