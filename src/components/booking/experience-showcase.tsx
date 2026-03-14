'use client'

import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'
import Image from 'next/image'
import { Star, Beer, Music } from 'lucide-react'
import { useBookingLanguage } from './booking-language-provider'

interface ExperienceBlock {
  image: string
  titleKey: string
}

const BLOCKS: ExperienceBlock[] = [
  { image: '/tapas.jpeg', titleKey: 'worldKitchen' },
  { image: '/expresso_martini.jpeg', titleKey: 'cocktails' },
  { image: '/cheers.jpeg', titleKey: 'vibes' },
]

function ParallaxBlock({ block, index }: { block: ExperienceBlock; index: number }) {
  const { t } = useBookingLanguage()
  const ref = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const y = useTransform(scrollYProgress, [0, 1], ['5%', '-5%'])

  return (
    <div ref={ref} className="relative h-[55vh] sm:h-[60vh] overflow-hidden">
      {/* Parallax image */}
      <motion.div className="absolute inset-0 -top-[10%] -bottom-[10%]" style={{ y }}>
        <Image
          src={block.image}
          alt={t(`experience.${block.titleKey}`)}
          fill
          className="object-cover"
          sizes="100vw"
        />
      </motion.div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Text — reveal on scroll */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.7, delay: index * 0.05, ease: 'easeOut' }}
        className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 lg:p-14"
      >
        <h3 className="text-3xl sm:text-4xl lg:text-5xl font-light text-white tracking-tight">
          {t(`experience.${block.titleKey}`)}
        </h3>
      </motion.div>
    </div>
  )
}

/** Animated counter — counts from 0 to target value */
function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!isInView) return

    const duration = 1500
    const startTime = performance.now()

    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))

      if (progress < 1) {
        requestAnimationFrame(tick)
      }
    }

    requestAnimationFrame(tick)
  }, [isInView, value])

  return (
    <span ref={ref}>
      {display}{suffix}
    </span>
  )
}

export default function ExperienceShowcase() {
  const { t } = useBookingLanguage()

  const stats = [
    { icon: Star, value: 4.8, label: t('hero.ratingBadge'), isDecimal: true },
    { icon: Beer, value: 22, label: t('hero.craftBeersBadge'), isDecimal: false },
    { icon: Music, value: 7, label: t('hero.liveDjBadge'), isDecimal: false },
  ]

  return (
    <section>
      {/* Parallax image blocks */}
      {BLOCKS.map((block, i) => (
        <ParallaxBlock key={block.titleKey} block={block} index={i} />
      ))}

      {/* Stats bar */}
      <div className="py-12 sm:py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            data-testid="stats-section"
            className="flex justify-center gap-8 sm:gap-14"
          >
            {stats.map(({ icon: Icon, value, label, isDecimal }) => (
              <div key={label} className="text-center">
                <Icon className="w-5 h-5 text-primary mx-auto mb-2" />
                <p className="text-3xl sm:text-4xl font-light text-foreground tracking-tight">
                  {isDecimal ? (
                    <>
                      <AnimatedCounter value={Math.floor(value)} />
                      <span>.</span>
                      <AnimatedCounter value={Math.round((value % 1) * 10)} />
                    </>
                  ) : (
                    <AnimatedCounter value={value} />
                  )}
                  {isDecimal && <span className="text-muted-foreground text-lg">/5</span>}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
