'use client'

import { motion } from 'framer-motion'
import { Calendar } from '@/components/ui/calendar'
import TimeSlotPicker from './time-slot-picker'
import { addDays, format, startOfToday } from 'date-fns'
import { useState, useEffect } from 'react'
import { useBookingLanguage } from './booking-language-provider'

interface StepDateTimeProps {
  date: string
  time: string
  onDateChange: (date: string) => void
  onTimeChange: (time: string) => void
  onNext: () => void
  maxAdvanceDays?: number
}

export default function StepDateTime({ date, time, onDateChange, onTimeChange, onNext, maxAdvanceDays = 30 }: StepDateTimeProps) {
  const { t } = useBookingLanguage()
  const today = startOfToday()
  const maxDate = addDays(today, maxAdvanceDays)

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    date ? new Date(date + 'T00:00:00') : undefined
  )

  useEffect(() => {
    if (date) {
      setSelectedDate(new Date(date + 'T00:00:00'))
    }
  }, [date])

  const handleDateSelect = (d: Date | undefined) => {
    if (d) {
      setSelectedDate(d)
      onDateChange(format(d, 'yyyy-MM-dd'))
    }
  }

  const handleTimeSelect = (t: string) => {
    onTimeChange(t)
    // Auto-advance after selecting time (both date and time are set)
    if (date) {
      setTimeout(onNext, 300)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-light text-foreground tracking-tight">
          {t('dateTime.heading')}
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-2 font-light">
          {t('dateTime.subheading')}
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center"
      >
        <div className="bg-card/50 rounded-2xl border border-border/40 p-5 sm:p-6 inline-block">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={[
              { before: today },
              { after: maxDate },
            ]}
            className="[--cell-size:2.75rem] sm:[--cell-size:3rem]"
          />
        </div>

        {date && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-lg"
          >
            <TimeSlotPicker
              selectedTime={time}
              onSelectTime={handleTimeSelect}
              date={date}
            />
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
