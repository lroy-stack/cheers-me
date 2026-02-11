'use client'

import { motion } from 'framer-motion'
import { Calendar, Clock, Users, User, Phone, Mail, MessageSquare, Pencil, Loader2, CheckCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useBookingLanguage } from './booking-language-provider'
import type { BookingFormData, OccasionType, AvailabilityResult } from './types'

interface StepReviewProps {
  formData: BookingFormData
  availability: AvailabilityResult | null
  isLoading: boolean
  onEdit: (stepIndex: number) => void
  onConfirm: () => void
  onBack: () => void
  onCheckAvailability: () => void
}

export default function StepReview({
  formData,
  availability,
  isLoading,
  onEdit,
  onConfirm,
  onBack,
  onCheckAvailability,
}: StepReviewProps) {
  const { t } = useBookingLanguage()
  const [checked, setChecked] = useState(false)

  const OCCASION_LABELS: Record<OccasionType, string> = {
    casual: t('occasion.casual'),
    birthday: t('occasion.birthday'),
    group: t('occasion.group'),
    cocktails: t('occasion.cocktails'),
    sports: t('occasion.sports'),
    party: t('occasion.party'),
  }

  // Re-check availability when this step mounts
  useEffect(() => {
    if (!checked) {
      onCheckAvailability()
      setChecked(true)
    }
  }, [checked, onCheckAvailability])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const rows = [
    {
      icon: Calendar,
      label: t('review.date'),
      value: formData.reservation_date ? formatDate(formData.reservation_date) : '—',
      editStep: 1,
    },
    {
      icon: Clock,
      label: t('review.time'),
      value: formData.start_time || '—',
      editStep: 1,
    },
    {
      icon: Users,
      label: t('review.guestsLabel'),
      value: `${formData.party_size} ${formData.party_size === 1 ? t('partySize.guest') : t('partySize.guests')}`,
      editStep: 2,
    },
    {
      icon: User,
      label: t('review.name'),
      value: formData.guest_name || '—',
      editStep: 3,
    },
    {
      icon: Phone,
      label: t('review.phone'),
      value: formData.guest_phone || '—',
      editStep: 3,
    },
    ...(formData.guest_email
      ? [{
          icon: Mail,
          label: t('review.emailLabel'),
          value: formData.guest_email,
          editStep: 3,
        }]
      : []),
    ...(formData.special_requests
      ? [{
          icon: MessageSquare,
          label: t('review.requests'),
          value: formData.special_requests,
          editStep: 3,
        }]
      : []),
  ]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">
          {t('review.heading')}
        </h2>
        <p className="text-muted-foreground mt-2">
          {t('review.subheading')}
        </p>
      </div>

      {/* Occasion badge */}
      {formData.occasion && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center"
        >
          <button
            type="button"
            onClick={() => onEdit(0)}
            className="px-4 py-1.5 rounded-full bg-primary/15 text-cheers-amber text-sm font-medium flex items-center gap-2 hover:bg-primary/20 transition-colors"
          >
            {OCCASION_LABELS[formData.occasion]}
            <Pencil className="w-3 h-3" />
          </button>
        </motion.div>
      )}

      {/* Summary card */}
      <div className="max-w-md mx-auto bg-card rounded-xl border border-border overflow-hidden">
        {rows.map(({ icon: Icon, label, value, editStep }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-center justify-between px-4 py-3 ${
              i > 0 ? 'border-t border-border' : ''
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium text-foreground truncate">{value}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onEdit(editStep)}
              className="text-cheers-amber hover:text-cheers-coral text-xs font-medium flex items-center gap-1 flex-shrink-0"
            >
              <Pencil className="w-3 h-3" /> {t('review.edit')}
            </button>
          </motion.div>
        ))}
      </div>

      {/* Availability status */}
      <div className="max-w-md mx-auto text-center">
        {isLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('review.checkingAvailability')}
          </motion.div>
        ) : availability?.available ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400"
          >
            <CheckCircle className="w-4 h-4" />
            {t('review.available')} {availability.available_tables && t('review.tablesReady', { count: availability.available_tables })}
          </motion.div>
        ) : availability ? (
          <div className="text-sm text-red-500">
            <p>{availability.reason || t('review.notAvailable')}</p>
            {availability.suggested_times && availability.suggested_times.length > 0 && (
              <p className="mt-1">
                {t('review.trySuggested', { times: availability.suggested_times.join(', ') })}
              </p>
            )}
          </div>
        ) : null}
      </div>

      {/* Buttons */}
      <div className="flex justify-center gap-3 pt-2">
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBack}
          className="px-6 py-3 rounded-xl border border-border text-muted-foreground font-medium hover:bg-muted transition-colors"
        >
          {t('review.back')}
        </motion.button>
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onConfirm}
          disabled={isLoading || (availability !== null && !availability.available)}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-cheers-amber to-cheers-coral text-white font-semibold shadow-lg hover:shadow-xl transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? t('review.checking') : t('review.confirmReservation')}
        </motion.button>
      </div>

      <p className="text-xs text-center text-muted-foreground max-w-sm mx-auto">
        {t('review.policy')}
      </p>
    </div>
  )
}
