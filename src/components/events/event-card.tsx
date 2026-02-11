import { Card, CardContent } from '@/components/ui/card'
import { Event } from './types'
import { EventStatusBadge } from './event-status-badge'
import { eventTypeColors, eventTypeLabels, formatTime } from './event-utils'
import { cn } from '@/lib/utils'
import { Music, Tv, PartyPopper, Lock, Calendar, Clock, User } from 'lucide-react'

interface EventCardProps {
  event: Event
  onClick?: () => void
  compact?: boolean
}

export function EventCard({ event, onClick, compact = false }: EventCardProps) {
  const colors = eventTypeColors[event.event_type]

  // Select icon based on event type
  const IconComponent =
    event.event_type === 'dj_night' ? Music :
    event.event_type === 'sports' ? Tv :
    event.event_type === 'themed_night' ? PartyPopper :
    event.event_type === 'private_event' ? Lock :
    Calendar

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md border-l-4',
        colors.border,
        onClick && 'hover:scale-[1.02]'
      )}
      onClick={onClick}
    >
      <CardContent className={cn('p-3', compact ? 'space-y-1' : 'space-y-2')}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div className={cn('rounded-full p-1.5 mt-0.5 shrink-0', colors.bg)}>
              <IconComponent className={cn('h-3.5 w-3.5', colors.text)} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm line-clamp-1">{event.title}</h4>
              <p className={cn('text-xs', colors.text)}>
                {eventTypeLabels[event.event_type]}
              </p>
            </div>
          </div>
          {!compact && (
            <EventStatusBadge status={event.status} className="shrink-0" />
          )}
        </div>

        {/* Time */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            {formatTime(event.start_time)}
            {event.end_time && ` - ${formatTime(event.end_time)}`}
          </span>
        </div>

        {/* DJ or Sports Info */}
        {event.event_type === 'dj_night' && event.dj && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate">
              {event.dj.name}
              {event.dj.genre && ` • ${event.dj.genre}`}
            </span>
          </div>
        )}

        {event.event_type === 'sports' && event.home_team && event.away_team && (
          <div className="text-xs font-medium">
            <span className="truncate">
              {event.home_team} vs {event.away_team}
            </span>
            {event.broadcast_channel && (
              <p className="text-muted-foreground text-xs mt-0.5">
                {event.broadcast_channel}
              </p>
            )}
          </div>
        )}

        {/* Description (non-compact only) */}
        {!compact && event.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {event.description}
          </p>
        )}

        {/* Status badge for compact mode */}
        {compact && (
          <EventStatusBadge status={event.status} className="text-xs px-1.5 py-0" />
        )}
      </CardContent>
    </Card>
  )
}
