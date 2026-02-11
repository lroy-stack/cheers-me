'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es, nl, de, enGB } from 'date-fns/locale'
import { useTranslations, useLocale } from 'next-intl'
import { Globe } from 'lucide-react'
import { localeNames, type Locale } from '@/i18n/config'
import { motion } from 'framer-motion'
import Image from 'next/image'

interface KioskIdleScreenProps {
  onTouchToBegin: () => void
}

export function KioskIdleScreen({ onTouchToBegin }: KioskIdleScreenProps) {
  const t = useTranslations('kiosk')
  const locale = useLocale()
  const [currentTime, setCurrentTime] = useState(new Date())

  const dateFnsLocale = { es, nl, de, en: enGB }[locale] || enGB
  const [showLangPicker, setShowLangPicker] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  function handleLocaleChange(locale: Locale) {
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000`
    setShowLangPicker(false)
    window.location.reload()
  }

  const hours = format(currentTime, 'HH:mm')
  const seconds = format(currentTime, 'ss')

  return (
    <div
      className="w-full min-h-screen flex flex-col items-center justify-center cursor-pointer relative bg-gradient-to-b from-background to-muted/30"
      onClick={onTouchToBegin}
      onPointerDown={onTouchToBegin}
    >
      {/* Language selector - top right */}
      <button
        className="absolute top-6 right-6 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted text-sm text-muted-foreground"
        onClick={(e) => {
          e.stopPropagation()
          setShowLangPicker(!showLangPicker)
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Globe className="h-4 w-4" />
        {t('language')}
      </button>

      {showLangPicker && (
        <div
          className="absolute top-16 right-6 bg-card border rounded-lg shadow-lg p-2 z-10"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {(Object.entries(localeNames) as [Locale, string][]).map(([key, name]) => (
            <button
              key={key}
              className="block w-full text-left px-4 py-2 rounded hover:bg-muted text-sm"
              onClick={() => handleLocaleChange(key)}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Logo and Branding */}
      <motion.div
        className="flex flex-col items-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Image
          src="/icons/logoheader.png"
          alt="GrandCafe Cheers"
          width={80}
          height={80}
          className="shadow-lg rounded-full mb-4"
        />
        <h1 className="text-4xl font-bold tracking-tight text-center">
          GrandCafe Cheers
        </h1>
      </motion.div>

      {/* Decorative separator */}
      <motion.div
        className="w-24 h-px bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent mb-8"
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      />

      {/* Large clock with seconds */}
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="flex items-start justify-center gap-2">
          <span className="text-8xl font-bold font-mono tracking-wider">
            {hours}
          </span>
          <span className="text-4xl font-bold font-mono text-muted-foreground mt-2">
            {seconds}
          </span>
        </div>
        <p className="text-2xl text-muted-foreground mt-4">
          {format(currentTime, 'EEEE, d MMMM yyyy', { locale: dateFnsLocale })}
        </p>
      </motion.div>

      {/* Touch to begin prompt with smooth pulse */}
      <motion.div
        animate={{
          opacity: [0.4, 1, 0.4],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <p className="text-xl text-muted-foreground">
          {t('touchToBegin')}
        </p>
      </motion.div>
    </div>
  )
}
