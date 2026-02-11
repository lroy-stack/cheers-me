'use client'

import { motion } from 'framer-motion'
import { UtensilsCrossed, PartyPopper, Users, Wine, Tv, Music, Check } from 'lucide-react'
import type { OccasionType } from './types'
import type { ComponentType } from 'react'
import { useBookingLanguage } from './booking-language-provider'

const ICONS: Record<OccasionType, ComponentType<{ className?: string }>> = {
  casual: UtensilsCrossed,
  birthday: PartyPopper,
  group: Users,
  cocktails: Wine,
  sports: Tv,
  party: Music,
}

interface StepOccasionProps {
  selected: OccasionType | null
  onSelect: (occasion: OccasionType) => void
  onNext: () => void
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
} as const

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
}

export default function StepOccasion({ selected, onSelect, onNext }: StepOccasionProps) {
  const { t } = useBookingLanguage()

  const OCCASIONS: { type: OccasionType; label: string; description: string }[] = [
    { type: 'casual', label: t('occasion.casual'), description: t('occasion.casualDesc') },
    { type: 'birthday', label: t('occasion.birthday'), description: t('occasion.birthdayDesc') },
    { type: 'group', label: t('occasion.group'), description: t('occasion.groupDesc') },
    { type: 'cocktails', label: t('occasion.cocktails'), description: t('occasion.cocktailsDesc') },
    { type: 'sports', label: t('occasion.sports'), description: t('occasion.sportsDesc') },
    { type: 'party', label: t('occasion.party'), description: t('occasion.partyDesc') },
  ]

  const handleSelect = (type: OccasionType) => {
    onSelect(type)
    // Auto-advance after a brief delay for visual feedback
    setTimeout(onNext, 300)
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">
          {t('occasion.heading')}
        </h2>
        <p className="text-muted-foreground mt-2">
          {t('occasion.subheading')}
        </p>
      </div>

      <motion.div
        className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {OCCASIONS.map(({ type, label, description }) => {
          const Icon = ICONS[type]
          const isSelected = selected === type

          return (
            <motion.button
              key={type}
              type="button"
              variants={item}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSelect(type)}
              className={`relative p-4 sm:p-6 rounded-xl border-2 text-left transition-colors ${
                isSelected
                  ? 'border-cheers-amber bg-primary/10'
                  : 'border-border bg-card hover:border-cheers-coral'
              }`}
            >
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-cheers-amber flex items-center justify-center"
                >
                  <Check className="w-4 h-4 text-white" />
                </motion.div>
              )}
              <Icon className={`w-7 h-7 mb-3 ${isSelected ? 'text-cheers-amber' : 'text-muted-foreground'}`} />
              <h3 className="font-semibold text-foreground text-sm sm:text-base">
                {label}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {description}
              </p>
            </motion.button>
          )
        })}
      </motion.div>
    </div>
  )
}
