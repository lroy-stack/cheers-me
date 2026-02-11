import { EventType, EventStatus } from './types'

// Event type colors (matching the design system)
export const eventTypeColors: Record<EventType, { bg: string; text: string; border: string }> = {
  dj_night: {
    bg: 'bg-pink-500/10',
    text: 'text-pink-500',
    border: 'border-pink-500/20',
  },
  sports: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-500',
    border: 'border-cyan-500/20',
  },
  themed_night: {
    bg: 'bg-violet-500/10',
    text: 'text-violet-500',
    border: 'border-violet-500/20',
  },
  private_event: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-500',
    border: 'border-amber-500/20',
  },
  other: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-border',
  },
}

// Event type translation keys (use with events namespace: t(`eventTypes.${key}`))
export const eventTypeLabelKeys: Record<EventType, string> = {
  dj_night: 'eventTypes.djNight',
  sports: 'eventTypes.sportsBroadcast',
  themed_night: 'eventTypes.themedNight',
  private_event: 'eventTypes.privateEvent',
  other: 'eventTypes.other',
}

// Event type labels (fallback for non-translated contexts)
export const eventTypeLabels: Record<EventType, string> = {
  dj_night: 'DJ Night',
  sports: 'Sports Broadcast',
  themed_night: 'Themed Night',
  private_event: 'Private Event',
  other: 'Other',
}

// Event status colors
export const eventStatusColors: Record<EventStatus, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  confirmed: 'bg-green-500/10 text-green-500 border-green-500/20',
  completed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
}

// Event status translation keys (use with events namespace: t(`eventStatuses.${key}`))
export const eventStatusLabelKeys: Record<EventStatus, string> = {
  pending: 'eventStatuses.pending',
  confirmed: 'eventStatuses.confirmed',
  completed: 'eventStatuses.completed',
  cancelled: 'eventStatuses.cancelled',
}

// Event status labels (fallback for non-translated contexts)
export const eventStatusLabels: Record<EventStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

// Format time from HH:MM:SS to HH:MM
export function formatTime(time: string): string {
  return time.substring(0, 5)
}

// Get event type icon (using Lucide React icon names)
export const eventTypeIcons: Record<EventType, string> = {
  dj_night: 'Music',
  sports: 'Tv',
  themed_night: 'PartyPopper',
  private_event: 'Lock',
  other: 'Calendar',
}
