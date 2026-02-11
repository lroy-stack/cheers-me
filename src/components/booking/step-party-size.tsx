'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Minus, Plus, Users, Phone } from 'lucide-react'
import { useBookingLanguage } from './booking-language-provider'

interface StepPartySizeProps {
  partySize: number
  onPartySizeChange: (size: number) => void
  onNext: () => void
}

export default function StepPartySize({ partySize, onPartySizeChange, onNext }: StepPartySizeProps) {
  const { t } = useBookingLanguage()

  const PRESETS = [
    { label: t('partySize.solo'), value: 1 },
    { label: t('partySize.couple'), value: 2 },
    { label: t('partySize.group'), value: 4 },
    { label: t('partySize.bigGroup'), value: 8 },
    { label: t('partySize.party'), value: 12 },
  ]
  const handleChange = (delta: number) => {
    const next = Math.max(1, Math.min(20, partySize + delta))
    onPartySizeChange(next)
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">
          {t('partySize.heading')}
        </h2>
        <p className="text-muted-foreground mt-2">
          {t('partySize.subheading')}
        </p>
      </div>

      {/* Counter */}
      <div className="flex items-center justify-center gap-6">
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleChange(-1)}
          disabled={partySize <= 1}
          className="w-14 h-14 rounded-full border-2 border-border flex items-center justify-center text-muted-foreground hover:border-cheers-amber hover:text-cheers-amber disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Minus className="w-6 h-6" />
        </motion.button>

        <div className="w-24 text-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={partySize}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.15 }}
              className="block text-6xl font-bold text-cheers-amber"
            >
              {partySize}
            </motion.span>
          </AnimatePresence>
          <span className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
            <Users className="w-4 h-4" />
            {partySize === 1 ? t('partySize.guest') : t('partySize.guests')}
          </span>
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleChange(1)}
          disabled={partySize >= 20}
          className="w-14 h-14 rounded-full border-2 border-border flex items-center justify-center text-muted-foreground hover:border-cheers-amber hover:text-cheers-amber disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap justify-center gap-2">
        {PRESETS.map(({ label, value }) => (
          <motion.button
            key={value}
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onPartySizeChange(value)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              partySize === value
                ? 'bg-cheers-amber border-cheers-amber text-white'
                : 'bg-card border-border text-muted-foreground hover:border-cheers-coral'
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
            className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center"
          >
            <Phone className="w-5 h-5 mx-auto mb-2 text-cheers-amber" />
            <p className="text-sm text-primary">
              {t('partySize.largeGroupMessage')}
            </p>
            <a
              href="tel:+34971XXXXXX"
              className="text-sm font-semibold text-cheers-amber hover:underline mt-1 inline-block"
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
          onClick={onNext}
          className="px-8 py-3 rounded-xl bg-cheers-amber text-white font-semibold shadow-lg hover:shadow-xl transition-shadow"
        >
          {t('partySize.continue')}
        </motion.button>
      </div>
    </div>
  )
}
