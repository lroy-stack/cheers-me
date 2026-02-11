'use client'

import { motion } from 'framer-motion'
import { Sun, Sunset, Moon, Coffee, Music } from 'lucide-react'
import { useBookingLanguage } from './booking-language-provider'

interface TimeSlotPickerProps {
  selectedTime: string
  onSelectTime: (time: string) => void
  date: string
}

interface TimeSlot {
  time: string
  label: string
}

interface Period {
  key: string
  icon: typeof Sun
  slots: TimeSlot[]
}

function generateSlots(): Period[] {
  const periods: Period[] = [
    { key: 'dateTime.morning', icon: Coffee, slots: [] },
    { key: 'dateTime.afternoon', icon: Sun, slots: [] },
    { key: 'dateTime.sunset', icon: Sunset, slots: [] },
    { key: 'dateTime.night', icon: Moon, slots: [] },
  ]

  const startMinutes = 10 * 60 + 30
  const endMinutes = 26 * 60 + 30

  for (let m = startMinutes; m <= endMinutes; m += 30) {
    const displayHour = Math.floor(m / 60) % 24
    const displayMin = m % 60
    const time = `${String(displayHour).padStart(2, '0')}:${String(displayMin).padStart(2, '0')}`
    const slot = { time, label: time }

    const hour = m / 60
    if (hour < 14) periods[0].slots.push(slot)
    else if (hour < 18) periods[1].slots.push(slot)
    else if (hour < 21) periods[2].slots.push(slot)
    else periods[3].slots.push(slot)
  }

  return periods
}

const PERIODS = generateSlots()

export default function TimeSlotPicker({ selectedTime, onSelectTime }: TimeSlotPickerProps) {
  const { t } = useBookingLanguage()

  return (
    <div className="space-y-5 mt-5">
      {PERIODS.map((period) => {
        const Icon = period.icon
        return (
          <div key={period.key}>
            <div className="flex items-center gap-2 mb-3">
              <Icon className="w-4 h-4 text-cheers-amber" />
              <h4 className="text-sm font-semibold text-foreground">
                {t(period.key)}
              </h4>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {period.slots.map(({ time }) => {
                const isSelected = selectedTime === time
                const isDJ = parseInt(time.split(':')[0]) >= 22 || parseInt(time.split(':')[0]) < 3

                return (
                  <motion.button
                    key={time}
                    type="button"
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => onSelectTime(time)}
                    className={`relative py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      isSelected
                        ? 'bg-cheers-amber text-white shadow-md shadow-cheers-amber/30'
                        : 'bg-card border border-border text-foreground hover:border-cheers-coral hover:bg-accent/50'
                    }`}
                  >
                    {time}
                    {isDJ && (
                      <Music className="absolute top-1 right-1 w-3 h-3 opacity-40" />
                    )}
                  </motion.button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
