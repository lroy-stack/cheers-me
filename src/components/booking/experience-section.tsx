'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { useBookingLanguage } from './booking-language-provider'

const EXPERIENCES = [
  { image: '/tapas.jpeg', key: 'worldKitchen' as const },
  { image: '/burger.jpeg', key: 'burgers' as const },
  { image: '/expresso_martini.jpeg', key: 'cocktails' as const },
  { image: '/cheers.jpeg', key: 'vibes' as const },
]

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export default function ExperienceSection() {
  const { t } = useBookingLanguage()

  return (
    <section className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl sm:text-4xl font-bold text-center mb-10 text-foreground"
        >
          {t('experience.heading')}
        </motion.h2>

        {/* Desktop: 2x2 grid, Mobile: horizontal scroll */}
        <div className="hidden sm:grid grid-cols-2 gap-4">
          {EXPERIENCES.map((exp, i) => (
            <motion.div
              key={exp.key}
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative group overflow-hidden rounded-2xl aspect-[4/3]"
            >
              <Image
                src={exp.image}
                alt={t(`experience.${exp.key}`)}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                sizes="(max-width: 1024px) 50vw, 480px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p className="text-white font-bold text-lg sm:text-xl">
                  {t(`experience.${exp.key}`)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mobile: horizontal scroll */}
        <div className="sm:hidden flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
          {EXPERIENCES.map((exp) => (
            <div
              key={exp.key}
              className="relative shrink-0 w-[75vw] snap-start overflow-hidden rounded-2xl aspect-[4/3]"
            >
              <Image
                src={exp.image}
                alt={t(`experience.${exp.key}`)}
                fill
                className="object-cover"
                sizes="75vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-white font-bold text-base">
                  {t(`experience.${exp.key}`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
