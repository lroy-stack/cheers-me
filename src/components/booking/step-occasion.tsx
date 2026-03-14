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
    setTimeout(onNext, 300)
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="text-center px-2">
        <h2 className="text-2xl sm:text-3xl font-light text-foreground tracking-tight">
          {t('occasion.heading')}
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-2 font-light">
          {t('occasion.subheading')}
        </p>
      </div>

      <motion.div
        className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4"
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
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              data-testid={`occasion-card-${type}`}
              onClick={() => handleSelect(type)}
              className={`relative p-4 sm:p-5 rounded-2xl text-left transition-all touch-manipulation min-h-[110px] sm:min-h-[130px] ${
                isSelected
                  ? 'bg-primary/8 border border-primary/30 shadow-[0_0_20px_oklch(var(--primary)/0.15)]'
                  : 'bg-card/30 border border-border/30 hover:border-border/60 hover:bg-card/50'
              }`}
            >
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-white" />
                </motion.div>
              )}
              <Icon className={`w-6 h-6 sm:w-7 sm:h-7 mb-3 transition-colors ${
                isSelected ? 'text-primary' : 'text-muted-foreground/60'
              }`} />
              <h3 className="font-medium text-foreground text-sm sm:text-base leading-tight">
                {label}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2 font-light">
                {description}
              </p>
            </motion.button>
          )
        })}
      </motion.div>
    </div>
  )
}
