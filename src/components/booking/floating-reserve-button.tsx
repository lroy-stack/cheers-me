'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CalendarCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useBookingLanguage } from './booking-language-provider'

export default function FloatingReserveButton() {
  const { t } = useBookingLanguage()
  const [visible, setVisible] = useState(false)

  // Show after scrolling past hero (90vh), hide when wizard is in viewport
  useEffect(() => {
    const handleScroll = () => {
      const heroHeight = window.innerHeight * 0.9
      const wizardEl = document.getElementById('booking-wizard')

      if (!wizardEl) {
        setVisible(window.scrollY > heroHeight)
        return
      }

      const wizardRect = wizardEl.getBoundingClientRect()
      const wizardInView = wizardRect.top < window.innerHeight * 0.8 && wizardRect.bottom > 0

      setVisible(window.scrollY > heroHeight && !wizardInView)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToWizard = () => {
    document.getElementById('booking-wizard')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          data-testid="floating-reserve"
          onClick={scrollToWizard}
          className="fixed z-50 bottom-20 left-4 right-4 sm:left-auto sm:right-20 sm:bottom-6 sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-primary/90 backdrop-blur-xl text-primary-foreground font-semibold text-sm shadow-2xl shadow-primary/20 glow-hover touch-manipulation"
        >
          <CalendarCheck className="w-4 h-4" />
          {t('hero.reserveTable')}
        </motion.button>
      )}
    </AnimatePresence>
  )
}
