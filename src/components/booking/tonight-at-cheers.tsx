'use client'

import { motion } from 'framer-motion'
import { Music, Tv, Calendar } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useBookingLanguage } from './booking-language-provider'

interface TonightEvent {
  id: string
  title: string
  description: string
  start_time: string
  end_time: string
  event_type: string
  sport_name?: string
  home_team?: string
  away_team?: string
  dj?: { name: string; genre: string }
}

export default function TonightAtCheers() {
  const { t } = useBookingLanguage()
  const [events, setEvents] = useState<TonightEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/public/events/tonight')
      .then((r) => r.json())
      .then((data) => setEvents(data.events || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading || events.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="py-6 px-4"
    >
      <div className="max-w-4xl mx-auto">
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cheers-amber" />
          {t('tonight.heading')}
        </h3>

        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
          {events.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex-shrink-0 w-64 rounded-xl border border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-md p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                {event.event_type === 'dj_night' || event.dj ? (
                  <Music className="w-4 h-4 text-cheers-sunset" />
                ) : (
                  <Tv className="w-4 h-4 text-cheers-coral" />
                )}
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {event.event_type === 'dj_night' ? t('tonight.liveDJ') : t('tonight.sports')}
                </span>
              </div>

              <h4 className="font-semibold text-foreground text-sm">
                {event.title}
              </h4>

              {event.dj && (
                <p className="text-xs text-muted-foreground mt-1">
                  {event.dj.name} {event.dj.genre && `— ${event.dj.genre}`}
                </p>
              )}

              {event.home_team && event.away_team && (
                <p className="text-xs text-muted-foreground mt-1">
                  {event.home_team} vs {event.away_team}
                </p>
              )}

              <p className="text-xs text-cheers-amber mt-2 font-medium">
                {event.start_time} — {event.end_time}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
