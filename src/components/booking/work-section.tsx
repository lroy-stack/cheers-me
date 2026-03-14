'use client'

import { motion } from 'framer-motion'
import { useBookingLanguage } from './booking-language-provider'

interface WorkSectionProps {
  enabled: boolean
}

export default function WorkSection({ enabled }: WorkSectionProps) {
  const { t } = useBookingLanguage()

  if (!enabled) return null

  return (
    <section className="bg-muted py-16 sm:py-20 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.7 }}
          className="space-y-6"
        >
          <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-foreground text-center">
            {t('work.heading')}
          </h2>

          <p className="text-base sm:text-lg text-muted-foreground font-light leading-relaxed">
            {t('work.subtitle')}
          </p>

          <p className="text-base text-muted-foreground leading-relaxed">
            {t('work.description')}
          </p>

          {/* Positions as pill badges */}
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {t('work.positions').split(',').map((position) => (
              <span
                key={position.trim()}
                className="inline-flex items-center px-4 py-1.5 rounded-full bg-background text-foreground text-sm font-medium border border-border"
              >
                {position.trim()}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div className="pt-4">
            <a
              href={`mailto:${t('work.email')}`}
              className="inline-flex items-center rounded-full bg-primary text-primary-foreground px-8 py-3 font-medium text-base glow-hover transition-all active:scale-[0.97] touch-manipulation"
            >
              {t('work.cta')}
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
