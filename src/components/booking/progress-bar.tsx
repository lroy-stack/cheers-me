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

  const progress = currentIndex / (STEPS.length - 1)

  return (
    <div className="w-full max-w-lg mx-auto px-2">
      {/* Thin continuous line */}
      <div className="relative h-0.5 bg-border/50 rounded-full">
        <motion.div
          className="absolute top-0 left-0 h-full bg-primary rounded-full"
          initial={false}
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>

      {/* Dots on the line */}
      <div className="relative flex items-center justify-between -mt-[5px]">
        {STEPS.map((step, i) => {
          const isCompleted = i < currentIndex
          const isCurrent = i === currentIndex
          const isClickable = i < currentIndex && !!onStepClick

          return (
            <button
              key={step}
              type="button"
              data-testid={`progress-step-${i}`}
              onClick={() => isClickable && onStepClick?.(i)}
              disabled={!isClickable}
              className={`relative flex flex-col items-center gap-2 bg-transparent border-0 p-0 ${
                isClickable ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <motion.div
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  isCompleted
                    ? 'bg-primary scale-100'
                    : isCurrent
                      ? 'bg-primary ring-4 ring-primary/15 scale-125'
                      : 'bg-border/80 scale-100'
                }`}
                whileHover={isClickable ? { scale: 1.5 } : undefined}
                whileTap={isClickable ? { scale: 0.9 } : undefined}
              >
                {isCompleted && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <Check className="w-1.5 h-1.5 text-primary-foreground" />
                  </motion.div>
                )}
              </motion.div>

              <span
                className={`text-[10px] sm:text-xs font-medium whitespace-nowrap transition-colors ${
                  isCurrent
                    ? 'text-primary'
                    : isCompleted
                      ? 'text-muted-foreground'
                      : 'text-muted-foreground/50'
                }`}
              >
                <span className="hidden sm:inline">{STEP_LABELS[step]}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
