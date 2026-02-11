'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { Star, Clock, Beer, Music, MapPin, ChevronDown } from 'lucide-react'
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
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '20%'])
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  const scrollToWizard = () => {
    document.getElementById('booking-wizard')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div ref={ref} className="relative overflow-hidden min-h-[85vh] flex items-center justify-center">
      {/* Background image with parallax */}
      <motion.div className="absolute inset-0" style={{ y }}>
        <Image
          src="/cheers.jpeg"
          alt="GrandCafe Cheers Mallorca"
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
      </motion.div>

      {/* Content */}
      <motion.div
        className="relative z-10 py-16 sm:py-20 px-4 text-center max-w-3xl mx-auto"
        style={{ opacity }}
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <Image
            src={logoUrl}
            alt="GrandCafe Cheers"
            width={80}
            height={80}
            className="mx-auto rounded-xl shadow-lg"
          />
        </motion.div>

        {/* Title & tagline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-3 tracking-tight">
            {t('hero.title')}
          </h1>
          <p className="text-xl sm:text-2xl text-white/90 font-medium">
            {t('hero.tagline')}
          </p>
        </motion.div>

        {/* Location & hours */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4 text-white/70 text-sm"
        >
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            {t('hero.location')}
          </span>
          <span className="hidden sm:inline">|</span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {t('hero.hours')}
          </span>
        </motion.div>

        {/* Language Selector */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-4"
        >
          <LanguageSelector />
        </motion.div>

        {/* Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="flex flex-wrap justify-center gap-3 mt-6"
        >
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm text-white text-sm font-medium border border-white/20">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            {t('hero.ratingBadge')}
          </span>
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm text-white text-sm font-medium border border-white/20">
            <Beer className="w-4 h-4" />
            {t('hero.craftBeersBadge')}
          </span>
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm text-white text-sm font-medium border border-white/20">
            <Music className="w-4 h-4" />
            {t('hero.liveDjBadge')}
          </span>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-8"
        >
          <button
            onClick={scrollToWizard}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-white font-bold text-lg hover:bg-primary/90 transition-all shadow-xl hover:shadow-2xl hover:scale-105 active:scale-100"
          >
            {t('hero.reserveTable')}
            <ChevronDown className="w-5 h-5 animate-bounce" />
          </button>
        </motion.div>
      </motion.div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </div>
  )
}
