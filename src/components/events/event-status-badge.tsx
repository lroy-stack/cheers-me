import { Badge } from '@/components/ui/badge'
import { EventStatus } from './types'
import { eventStatusColors, eventStatusLabels } from './event-utils'
import { cn } from '@/lib/utils'

interface EventStatusBadgeProps {
  status: EventStatus
  className?: string
}

export function EventStatusBadge({ status, className }: EventStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'border',
        eventStatusColors[status],
        className
      )}
    >
      {eventStatusLabels[status]}
    </Badge>
  )
}
