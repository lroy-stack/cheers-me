'use client'

import { format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Event } from './types'
import { eventStatusColors, eventStatusLabelKeys, formatTime } from './event-utils'
import { Tv, Clock, Calendar, Edit, Trash2, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

interface SportsEventCardProps {
  event: Event
  onClick?: () => void
  onEdit?: () => void
  onDelete?: () => void
  compact?: boolean
}

export function SportsEventCard({
  event,
  onClick,
  onEdit,
  onDelete,
  compact = false
}: SportsEventCardProps) {
  const t = useTranslations('events')

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.()
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.()
  }

  const eventDate = new Date(event.event_date)
  const isPast = eventDate < new Date(new Date().setHours(0, 0, 0, 0))

  return (
    <Card
      className={cn(
        'transition-all hover:shadow-md cursor-pointer',
        isPast && 'opacity-60',
        'border-l-4 border-l-cyan-500'
      )}
      onClick={onClick}
    >
      <CardContent className={cn('p-4', compact && 'p-3')}>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {/* Sport Name */}
              {event.sport_name && (
                <div className="flex items-center gap-1.5 mb-1">
                  <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-500 border-cyan-500/20">
                    {event.sport_name}
                  </Badge>
                  <Badge className={cn('text-xs', eventStatusColors[event.status])}>
                    {t(eventStatusLabelKeys[event.status])}
                  </Badge>
                </div>
              )}

              {/* Teams or Title */}
              <h3 className={cn('font-semibold truncate', compact ? 'text-sm' : 'text-base')}>
                {event.home_team && event.away_team ? (
                  <span>
                    {event.home_team} <span className="text-muted-foreground">vs</span> {event.away_team}
                  </span>
                ) : (
                  event.title
                )}
              </h3>
            </div>

            {/* Action Buttons */}
            {(onEdit || onDelete) && (
              <div className="flex items-center gap-1">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleEdit}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Match Info */}
          {event.match_info && !compact && (
            <p className="text-sm text-muted-foreground">{event.match_info}</p>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {/* Date & Time */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{format(eventDate, 'EEE, MMM d, yyyy')}</span>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span>
                {formatTime(event.start_time)}
                {event.end_time && ` - ${formatTime(event.end_time)}`}
              </span>
            </div>

            {/* Broadcast Channel */}
            {event.broadcast_channel && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Tv className="h-4 w-4 flex-shrink-0" />
                <span className="truncate font-medium text-foreground">{event.broadcast_channel}</span>
              </div>
            )}

            {/* Expected Crowd (placeholder for future enhancement) */}
            {!compact && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs">{t('sports.highCrowdExpected')}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {event.description && !compact && (
            <p className="text-sm text-muted-foreground border-t pt-2 mt-2">
              {event.description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
