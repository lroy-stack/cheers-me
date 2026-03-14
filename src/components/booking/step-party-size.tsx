'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Minus, Plus, Users, Phone } from 'lucide-react'
import { useBookingLanguage } from './booking-language-provider'

interface StepPartySizeProps {
  partySize: number
  onPartySizeChange: (size: number) => void
  onNext: () => void
  maxPartySize?: number
}

export default function StepPartySize({ partySize, onPartySizeChange, onNext, maxPartySize = 20 }: StepPartySizeProps) {
  const { t } = useBookingLanguage()

  const PRESETS = [
    { label: t('partySize.solo'), value: 1 },
    { label: t('partySize.couple'), value: 2 },
    { label: t('partySize.group'), value: 4 },
    { label: t('partySize.bigGroup'), value: 8 },
    { label: t('partySize.party'), value: 12 },
  ].filter(p => p.value <= maxPartySize)

  const handleChange = (delta: number) => {
    const next = Math.max(1, Math.min(maxPartySize, partySize + delta))
    onPartySizeChange(next)
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="text-center px-2">
        <h2 className="text-2xl sm:text-3xl font-light text-foreground tracking-tight">
          {t('partySize.heading')}
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-2 font-light">
          {t('partySize.subheading')}
        </p>
      </div>

      {/* Counter — dramatic size */}
      <div className="flex items-center justify-center gap-6 sm:gap-8">
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          data-testid="party-decrement"
          onClick={() => handleChange(-1)}
          disabled={partySize <= 1}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-border/50 flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-20 disabled:cursor-not-allowed transition-all touch-manipulation"
        >
          <Minus className="w-5 h-5" />
        </motion.button>

        <div data-testid="party-size-display" className="w-24 sm:w-28 text-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={partySize}
              initial={{ opacity: 0, y: -25, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 25, scale: 0.8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              data-testid="party-counter"
              className="block text-6xl sm:text-7xl font-extralight text-primary tracking-tight"
            >
              {partySize}
            </motion.span>
          </AnimatePresence>
          <span className="text-xs sm:text-sm text-muted-foreground mt-2 flex items-center justify-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {partySize === 1 ? t('partySize.guest') : t('partySize.guests')}
          </span>
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          data-testid="party-increment"
          onClick={() => handleChange(1)}
          disabled={partySize >= maxPartySize}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-border/50 flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-20 disabled:cursor-not-allowed transition-all touch-manipulation"
        >
          <Plus className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap justify-center gap-2 px-2">
        {PRESETS.map(({ label, value }) => (
          <motion.button
            key={value}
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onPartySizeChange(value)}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all touch-manipulation ${
              partySize === value
                ? 'bg-primary text-white shadow-[0_0_16px_oklch(var(--primary)/0.25)]'
                : 'bg-card/30 border border-border/30 text-muted-foreground hover:border-border/60'
            }`}
          >
            {label} ({value})
          </motion.button>
        ))}
      </div>

      {/* Large group message */}
      <AnimatePresence>
        {partySize > 12 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-primary/5 border border-primary/10 rounded-2xl p-5 text-center"
          >
            <Phone className="w-5 h-5 mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">
              {t('partySize.largeGroupMessage')}
            </p>
            <a
              href="tel:+34971XXXXXX"
              className="text-sm font-medium text-primary hover:underline mt-1 inline-block"
            >
              +34 971 XXX XXX
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next button */}
      <div className="text-center">
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          data-testid="wizard-next"
          onClick={onNext}
          className="px-8 py-3 rounded-full bg-primary text-white font-medium shadow-lg glow-hover transition-all touch-manipulation min-w-[200px]"
        >
          {t('partySize.continue')}
        </motion.button>
      </div>
    </div>
  )
}
