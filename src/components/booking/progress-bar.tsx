'use client'

import { motion } from 'framer-motion'
import { STEPS, type BookingStep } from './types'
import { Check } from 'lucide-react'
import { useBookingLanguage } from './booking-language-provider'

interface ProgressBarProps {
  currentIndex: number
  onStepClick?: (index: number) => void
}

export default function ProgressBar({ currentIndex, onStepClick }: ProgressBarProps) {
  const { t } = useBookingLanguage()

  const STEP_LABELS: Record<BookingStep, string> = {
    'occasion': t('wizard.occasion'),
    'datetime': t('wizard.dateTime'),
    'party-size': t('wizard.guests'),
    'guest-info': t('wizard.details'),
    'review': t('wizard.confirm'),
  }
  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between relative">
        {/* Background line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted" />
        {/* Active line */}
        <motion.div
          className="absolute top-5 left-0 h-0.5 bg-cheers-amber"
          initial={false}
          animate={{ width: `${(currentIndex / (STEPS.length - 1)) * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        />

        {STEPS.map((step, i) => {
          const isCompleted = i < currentIndex
          const isCurrent = i === currentIndex
          const isClickable = i < currentIndex && onStepClick

          return (
            <button
              key={step}
              type="button"
              onClick={() => isClickable && onStepClick(i)}
              disabled={!isClickable}
              className="relative z-10 flex flex-col items-center gap-2 disabled:cursor-default"
            >
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                  isCompleted
                    ? 'bg-cheers-amber border-cheers-amber text-white'
                    : isCurrent
                      ? 'bg-card border-cheers-amber text-cheers-amber'
                      : 'bg-card border-border text-muted-foreground'
                }`}
                whileHover={isClickable ? { scale: 1.1 } : undefined}
                whileTap={isClickable ? { scale: 0.95 } : undefined}
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    <Check className="w-5 h-5" />
                  </motion.div>
                ) : (
                  i + 1
                )}
              </motion.div>
              <span
                className={`text-xs font-medium hidden sm:block ${
                  isCurrent
                    ? 'text-cheers-amber'
                    : isCompleted
                      ? 'text-muted-foreground'
                      : 'text-muted-foreground'
                }`}
              >
                {STEP_LABELS[step]}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
