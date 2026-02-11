'use client'

import { motion } from 'framer-motion'
import { CalendarPlus, Share2, Copy, MapPin, Clock, Music, Car } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useBookingLanguage } from './booking-language-provider'
import type { BookingResult } from './types'

interface BookingSuccessProps {
  result: BookingResult
  onNewBooking: () => void
}

// CSS-only confetti particles
function Confetti() {
  const particles = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 1.5 + Math.random() * 2,
        rotation: Math.random() * 360,
        color: ['#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#06B6D4'][Math.floor(Math.random() * 5)],
        size: 4 + Math.random() * 8,
      })),
    []
  )

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: `${p.left}%`,
            top: -10,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            rotate: p.rotation,
          }}
          initial={{ y: -20, opacity: 1 }}
          animate={{ y: '100vh', opacity: 0, rotate: p.rotation + 360 }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeIn',
          }}
        />
      ))}
    </div>
  )
}

// Animated checkmark SVG
function AnimatedCheck() {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
      className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto"
    >
      <svg viewBox="0 0 50 50" className="w-10 h-10">
        <motion.path
          d="M14 27 L22 35 L38 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-green-600 dark:text-green-400"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.5, ease: 'easeOut' }}
        />
      </svg>
    </motion.div>
  )
}

export default function BookingSuccess({ result, onNewBooking }: BookingSuccessProps) {
  const { t } = useBookingLanguage()
  const [copied, setCopied] = useState(false)
  const reservation = result.reservation

  const shareText = reservation
    ? `I just booked a table at GrandCafe Cheers Mallorca! ${reservation.date} at ${reservation.time} for ${reservation.party_size} guests. See you there! 🎉`
    : 'I just booked a table at GrandCafe Cheers Mallorca! 🎉'

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank')
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCalendar = () => {
    if (!reservation) return
    const startDate = new Date(`${reservation.date}T${reservation.time}:00`)
    const endDate = new Date(startDate.getTime() + 90 * 60_000) // 90 min

    const pad = (n: number) => String(n).padStart(2, '0')
    const formatICS = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${formatICS(startDate)}`,
      `DTEND:${formatICS(endDate)}`,
      'SUMMARY:Reservation at GrandCafe Cheers',
      'LOCATION:Carrer de Cartago 22\\, El Arenal\\, Mallorca 07600',
      `DESCRIPTION:Table for ${reservation.party_size} guests.${reservation.table_number ? ` Table ${reservation.table_number}.` : ''}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cheers-reservation.ics'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="relative">
      <Confetti />

      <div className="space-y-6 text-center relative z-10">
        <AnimatedCheck />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-foreground">
            {t('success.title')}
          </h2>
          <p className="text-muted-foreground mt-2">
            {t('success.thankYou')}
          </p>
        </motion.div>

        {/* Reservation details */}
        {reservation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="max-w-sm mx-auto bg-card rounded-xl border border-border p-5 text-left space-y-2"
          >
            <div className="text-center mb-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('success.detailsHeading')}</p>
            </div>
            <p className="text-sm"><strong>{t('success.nameLabel')}</strong> {reservation.guest_name}</p>
            <p className="text-sm"><strong>{t('success.dateLabel')}</strong> {reservation.date}</p>
            <p className="text-sm"><strong>{t('success.timeLabel')}</strong> {reservation.time}</p>
            <p className="text-sm"><strong>{t('success.guestsLabel')}</strong> {reservation.party_size}</p>
            {reservation.table_number && (
              <p className="text-sm"><strong>{t('success.tableLabel')}</strong> #{reservation.table_number} {reservation.section && `(${reservation.section})`}</p>
            )}
            <p className="text-sm"><strong>{t('success.statusLabel')}</strong> <span className="text-primary font-medium capitalize">{reservation.status}</span></p>
          </motion.div>
        )}

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex flex-wrap justify-center gap-3"
        >
          <button
            type="button"
            onClick={handleWhatsApp}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            {t('success.shareWhatsApp')}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            <Copy className="w-4 h-4" />
            {copied ? t('success.copied') : t('success.copyLink')}
          </button>
          <button
            type="button"
            onClick={handleCalendar}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            <CalendarPlus className="w-4 h-4" />
            {t('success.addCalendar')}
          </button>
        </motion.div>

        {/* Pre-arrival tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="max-w-md mx-auto bg-primary/10 rounded-xl p-5"
        >
          <h3 className="font-semibold text-primary mb-3">
            {t('success.beforeYouArrive')}
          </h3>
          <ul className="space-y-2 text-sm text-primary text-left">
            <li className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {t('success.tipLocation')}
            </li>
            <li className="flex items-start gap-2">
              <Car className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {t('success.tipParking')}
            </li>
            <li className="flex items-start gap-2">
              <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {t('success.tipHours')}
            </li>
            <li className="flex items-start gap-2">
              <Music className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {t('success.tipDJ')}
            </li>
          </ul>
        </motion.div>

        {/* New booking */}
        <motion.button
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          onClick={onNewBooking}
          className="text-cheers-amber hover:text-cheers-coral font-medium text-sm underline underline-offset-2"
        >
          {t('success.makeAnother')}
        </motion.button>
      </div>
    </div>
  )
}
