'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { useBookingLanguage } from './booking-language-provider'

export default function AboutSection() {
  const { t } = useBookingLanguage()

  return (
    <section className="py-16 sm:py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-12 items-center">
          {/* Photo — left column (40% on desktop) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.7 }}
            className="md:col-span-2"
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src="/tapas.jpeg"
                alt={t('about.heading')}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 40vw"
              />
            </div>
          </motion.div>

          {/* Text — right column (60% on desktop) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="md:col-span-3 space-y-5"
          >
            <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-foreground">
              {t('about.heading')}
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground font-light leading-relaxed">
              {t('about.paragraph1')}
            </p>
            <p className="text-base sm:text-lg text-muted-foreground font-light leading-relaxed">
              {t('about.paragraph2')}
            </p>
            <p className="text-base sm:text-lg text-muted-foreground font-light leading-relaxed">
              {t('about.paragraph3')}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
