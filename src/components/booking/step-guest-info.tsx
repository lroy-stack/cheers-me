'use client'

import { motion } from 'framer-motion'
import { User, Phone, Mail, MessageSquare } from 'lucide-react'
import { useState } from 'react'
import { useBookingLanguage } from './booking-language-provider'
import type { BookingFormData } from './types'

interface StepGuestInfoProps {
  formData: BookingFormData
  onUpdate: (data: Partial<BookingFormData>) => void
  onNext: () => void
  onBack: () => void
}

const LANGUAGES = [
  { code: 'en' as const, flag: '🇬🇧', label: 'EN' },
  { code: 'nl' as const, flag: '🇳🇱', label: 'NL' },
  { code: 'es' as const, flag: '🇪🇸', label: 'ES' },
  { code: 'de' as const, flag: '🇩🇪', label: 'DE' },
]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
} as const

const item = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
}

export default function StepGuestInfo({ formData, onUpdate, onNext, onBack }: StepGuestInfoProps) {
  const { t } = useBookingLanguage()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [shakeField, setShakeField] = useState<string | null>(null)

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.guest_name.trim()) {
      newErrors.guest_name = t('guestInfo.nameRequired')
    }
    if (!formData.guest_phone.trim()) {
      newErrors.guest_phone = t('guestInfo.phoneRequired')
    } else if (formData.guest_phone.trim().length < 6) {
      newErrors.guest_phone = t('guestInfo.phoneInvalid')
    }
    if (formData.guest_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guest_email)) {
      newErrors.guest_email = t('guestInfo.emailInvalid')
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.keys(newErrors)[0]
      setShakeField(firstError)
      setTimeout(() => setShakeField(null), 500)
      return false
    }

    return true
  }

  const handleNext = () => {
    if (validate()) onNext()
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">
          {t('guestInfo.heading')}
        </h2>
        <p className="text-muted-foreground mt-2">
          {t('guestInfo.subheading')}
        </p>
      </div>

      <motion.div
        className="max-w-md mx-auto space-y-4"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Name */}
        <motion.div variants={item}>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            {t('guestInfo.fullName')} {t('guestInfo.required')}
          </label>
          <motion.div
            animate={shakeField === 'guest_name' ? { x: [0, -10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="relative"
          >
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={formData.guest_name}
              onChange={(e) => {
                onUpdate({ guest_name: e.target.value })
                if (errors.guest_name) setErrors(prev => ({ ...prev, guest_name: '' }))
              }}
              placeholder={t('guestInfo.namePlaceholder')}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-card text-foreground placeholder:text-muted-foreground transition-colors ${
                errors.guest_name
                  ? 'border-red-400 focus:ring-red-400'
                  : 'border-border focus:ring-cheers-amber'
              } focus:outline-none focus:ring-2`}
            />
          </motion.div>
          {errors.guest_name && (
            <p className="text-xs text-red-500 mt-1">{errors.guest_name}</p>
          )}
        </motion.div>

        {/* Phone */}
        <motion.div variants={item}>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            {t('guestInfo.phone')} {t('guestInfo.required')}
          </label>
          <motion.div
            animate={shakeField === 'guest_phone' ? { x: [0, -10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="relative"
          >
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="tel"
              value={formData.guest_phone}
              onChange={(e) => {
                onUpdate({ guest_phone: e.target.value })
                if (errors.guest_phone) setErrors(prev => ({ ...prev, guest_phone: '' }))
              }}
              placeholder={t('guestInfo.phonePlaceholder')}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-card text-foreground placeholder:text-muted-foreground transition-colors ${
                errors.guest_phone
                  ? 'border-red-400 focus:ring-red-400'
                  : 'border-border focus:ring-cheers-amber'
              } focus:outline-none focus:ring-2`}
            />
          </motion.div>
          {errors.guest_phone && (
            <p className="text-xs text-red-500 mt-1">{errors.guest_phone}</p>
          )}
        </motion.div>

        {/* Email */}
        <motion.div variants={item}>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            {t('guestInfo.email')} <span className="text-muted-foreground">{t('guestInfo.optional')}</span>
          </label>
          <motion.div
            animate={shakeField === 'guest_email' ? { x: [0, -10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="relative"
          >
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              value={formData.guest_email}
              onChange={(e) => {
                onUpdate({ guest_email: e.target.value })
                if (errors.guest_email) setErrors(prev => ({ ...prev, guest_email: '' }))
              }}
              placeholder={t('guestInfo.emailPlaceholder')}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-card text-foreground placeholder:text-muted-foreground transition-colors ${
                errors.guest_email
                  ? 'border-red-400 focus:ring-red-400'
                  : 'border-border focus:ring-cheers-amber'
              } focus:outline-none focus:ring-2`}
            />
          </motion.div>
          {errors.guest_email && (
            <p className="text-xs text-red-500 mt-1">{errors.guest_email}</p>
          )}
        </motion.div>

        {/* Special Requests */}
        <motion.div variants={item}>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            {t('guestInfo.specialRequests')} <span className="text-muted-foreground">{t('guestInfo.optional')}</span>
          </label>
          <div className="relative">
            <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <textarea
              value={formData.special_requests}
              onChange={(e) => onUpdate({ special_requests: e.target.value })}
              placeholder={t('guestInfo.requestsPlaceholder')}
              rows={3}
              maxLength={1000}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cheers-amber resize-none"
            />
          </div>
        </motion.div>

        {/* Language */}
        <motion.div variants={item}>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            {t('guestInfo.preferredLanguage')}
          </label>
          <div className="flex gap-2">
            {LANGUAGES.map(({ code, flag, label }) => (
              <motion.button
                key={code}
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onUpdate({ language: code })}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  formData.language === code
                    ? 'bg-cheers-amber border-cheers-amber text-white'
                    : 'bg-card border-border text-muted-foreground hover:border-cheers-coral'
                }`}
              >
                <span>{flag}</span>
                {label}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Navigation */}
      <div className="flex justify-center gap-3 pt-2">
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBack}
          className="px-6 py-3 rounded-xl border border-border text-muted-foreground font-medium hover:bg-muted transition-colors"
        >
          {t('guestInfo.back')}
        </motion.button>
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleNext}
          className="px-8 py-3 rounded-xl bg-cheers-amber text-white font-semibold shadow-lg hover:shadow-xl transition-shadow"
        >
          {t('guestInfo.continue')}
        </motion.button>
      </div>
    </div>
  )
}
