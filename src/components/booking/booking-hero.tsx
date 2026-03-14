'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { useBookingLanguage, LanguageSelector } from './booking-language-provider'
import Image from 'next/image'
import { useBranding } from '@/hooks/use-branding'

export default function BookingHero() {
  const { t } = useBookingLanguage()
  const { logoUrl } = useBranding()
  const ref = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })

  // Hero fades out, scales down, and blurs as user scrolls
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.7], [1, 0.95])
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 360])

  const scrollToWizard = () => {
    document.getElementById('booking-wizard')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div ref={ref} className="relative h-screen min-h-[600px] max-h-[1200px] overflow-hidden">
      {/* Background image with Ken Burns */}
      <div className="absolute inset-0">
        <Image
          src="/cheers.jpeg"
          alt="GrandCafe Cheers Mallorca"
          fill
          className="object-cover animate-ken-burns"
          sizes="100vw"
          priority
        />
        {/* Sophisticated radial gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.25)_0%,rgba(0,0,0,0.65)_70%,rgba(0,0,0,0.8)_100%)]" />
        {/* Warm amber tint */}
        <div className="absolute inset-0 bg-primary/25 mix-blend-multiply" />
      </div>

      {/* Content — sticky with scroll transforms */}
      <motion.div
        className="relative z-10 h-full flex flex-col items-center justify-center px-4"
        style={{ opacity, scale }}
      >
        {/* Language selector — top right glass pill */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="absolute top-6 right-6 sm:top-8 sm:right-8"
        >
          <div className="glass rounded-full">
            <LanguageSelector />
          </div>
        </motion.div>

        {/* Logo — blur-in with scroll-linked rotation */}
        <motion.div
          initial={{ opacity: 0, filter: 'blur(12px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.8 }}
          className="mb-6 sm:mb-8"
        >
          <motion.div style={{ rotate }}>
            <Image
              src={logoUrl}
              alt="GrandCafe Cheers"
              width={120}
              height={120}
              className="mx-auto rounded-2xl shadow-2xl"
            />
          </motion.div>
        </motion.div>

        {/* Title — extralight, dramatic */}
        <motion.h1
          initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          data-testid="hero-title"
          className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-white text-shadow-hero tracking-[0.15em] uppercase text-center"
        >
          {t('hero.title')}
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, filter: 'blur(8px)', y: 15 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-3 sm:mt-4 tracking-[0.3em] text-xs sm:text-sm uppercase font-light text-white/65 text-center max-w-lg"
        >
          {t('hero.tagline')}
        </motion.p>

        {/* CTA — glass pill */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-8 sm:mt-10"
        >
          <button
            data-testid="hero-reserve-button"
            onClick={scrollToWizard}
            className="group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full glass-strong text-white font-medium text-base sm:text-lg glow-hover transition-all hover:bg-white/15 active:scale-[0.97] touch-manipulation"
          >
            {t('hero.reserveTable')}
            <svg
              className="w-4 h-4 text-white/60 transition-transform group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </motion.div>

        {/* Scroll indicator — thin animated line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <div className="w-px h-8 bg-white/30 animate-scroll-line" />
        </motion.div>
      </motion.div>

      {/* Bottom gradient fade into background */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-20" />
    </div>
  )
}
