'use client'

import { useReducer, useCallback, useRef, useLayoutEffect } from 'react'
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

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -200 : 200,
    opacity: 0,
  }),
}

export default function BookingWizard() {
  const { t } = useBookingLanguage()
  const [state, dispatch] = useReducer(reducer, initialState)
  const { currentStep, stepIndex, direction, formData, availability, bookingResult, isLoading } = state

  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Lock container height before step change to prevent scroll jump
  const lockHeight = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.style.minHeight = `${containerRef.current.offsetHeight}px`
    }
  }, [])

  const next = useCallback(() => { lockHeight(); dispatch({ type: 'NEXT_STEP' }) }, [lockHeight])
  const prev = useCallback(() => { lockHeight(); dispatch({ type: 'PREV_STEP' }) }, [lockHeight])
  const goTo = useCallback((index: number) => { lockHeight(); dispatch({ type: 'GO_TO_STEP', index }) }, [lockHeight])

  // Track initial mount to prevent auto-scroll on page load
  const isInitialMount = useRef(true)

  // After step renders, release locked height and keep wizard in viewport
  useLayoutEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.minHeight = ''
    }

    // Skip scroll on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false
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

    // Inject occasion into special_requests
    const specialRequests = formData.occasion
      ? `[${formData.occasion}] ${formData.special_requests}`.trim()
      : formData.special_requests

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
          special_requests: specialRequests || undefined,
          language: formData.language,
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
        <p className="text-red-500 font-medium">{bookingResult.message}</p>
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_BOOKING_RESULT', result: null })}
          className="px-6 py-2 rounded-xl bg-cheers-amber text-white font-medium"
        >
          {t('aiAssistant.tryAgain')}
        </button>
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
          />
        )
      case 'party-size':
        return (
          <StepPartySize
            partySize={formData.party_size}
            onPartySizeChange={(s) => updateForm({ party_size: s })}
            onNext={next}
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
    <div ref={wrapperRef} className="py-8 px-4 sm:px-6 scroll-mt-4">
      <div className="max-w-3xl mx-auto">
        <ProgressBar currentIndex={stepIndex} onStepClick={goTo} />

        <div ref={containerRef} className="relative">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
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

      <BookingAIAssistant onApplySuggestion={handleApplySuggestion} />
    </div>
  )
}
