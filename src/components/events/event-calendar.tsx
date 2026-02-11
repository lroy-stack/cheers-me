'use client'

import { useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, startOfWeek, endOfWeek, addDays } from 'date-fns'
import { Event } from './types'
import { EventCard } from './event-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { useMediaQuery } from '@/hooks/use-media-query'
import { eventTypeColors } from './event-utils'

interface EventCalendarProps {
  events: Event[]
  selectedDate: Date
  onDateChange: (date: Date) => void
  onEventClick: (event: Event) => void
  view?: 'month' | 'week' | 'list'
  onViewChange?: (view: 'month' | 'week' | 'list') => void
}

export function EventCalendar({
  events,
  selectedDate,
  onDateChange,
  onEventClick,
  view = 'month',
  onViewChange,
}: EventCalendarProps) {
  const t = useTranslations('events')
  const isMobile = useMediaQuery('(max-width: 639px)')

  // On mobile, always force list view
  const effectiveView = isMobile ? 'list' : view

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return events
      .filter((event) => event.event_date === dateStr)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  }

  // Navigation handlers — adapt to effectiveView
  const handlePrevious = () => {
    if (effectiveView === 'list' || effectiveView === 'week') {
      onDateChange(addDays(selectedDate, -7))
    } else {
      const newDate = new Date(selectedDate)
      newDate.setMonth(newDate.getMonth() - 1)
      onDateChange(newDate)
    }
  }

  const handleNext = () => {
    if (effectiveView === 'list' || effectiveView === 'week') {
      onDateChange(addDays(selectedDate, 7))
    } else {
      const newDate = new Date(selectedDate)
      newDate.setMonth(newDate.getMonth() + 1)
      onDateChange(newDate)
    }
  }

  const handleToday = () => {
    onDateChange(new Date())
  }

  // Get calendar days based on view
  const calendarDays = useMemo(() => {
    if (effectiveView === 'week') {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }) // Monday
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })
      return eachDayOfInterval({ start: weekStart, end: weekEnd })
    } else {
      const monthStart = startOfMonth(selectedDate)
      const monthEnd = endOfMonth(selectedDate)
      const start = startOfWeek(monthStart, { weekStartsOn: 1 })
      const end = endOfWeek(monthEnd, { weekStartsOn: 1 })
      return eachDayOfInterval({ start, end })
    }
  }, [selectedDate, effectiveView])

  // Group events by date for list view
  const groupedEvents = useMemo(() => {
    const sorted = [...events].sort((a, b) => {
      const dateCmp = a.event_date.localeCompare(b.event_date)
      if (dateCmp !== 0) return dateCmp
      return a.start_time.localeCompare(b.start_time)
    })

    const groups: { date: string; events: Event[] }[] = []
    for (const event of sorted) {
      const last = groups[groups.length - 1]
      if (last && last.date === event.event_date) {
        last.events.push(event)
      } else {
        groups.push({ date: event.event_date, events: [event] })
      }
    }
    return groups
  }, [events])

  // Format date label for list group headers
  const formatGroupDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    const today = new Date()
    const tomorrow = addDays(today, 1)

    if (isSameDay(date, today)) return t('calendar.today')
    if (isSameDay(date, tomorrow)) return t('calendar.tomorrow')
    return format(date, 'EEE, MMM d')
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevious} className="h-9 w-9 p-0 sm:h-auto sm:w-auto sm:px-3">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday} className="h-9 px-2 sm:px-3">
            <CalendarDays className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">{t('calendar.today')}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleNext} className="h-9 w-9 p-0 sm:h-auto sm:w-auto sm:px-3">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="ml-2">
            <h2 className="text-base sm:text-lg font-semibold">
              {effectiveView === 'week'
                ? t('calendar.weekOf', { date: format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d, yyyy') })
                : format(selectedDate, 'MMMM yyyy')}
            </h2>
          </div>
        </div>

        {/* View Toggle — hidden on mobile since we force list */}
        {onViewChange && (
          <Tabs
            value={view}
            onValueChange={(v) => onViewChange(v as 'month' | 'week' | 'list')}
            className="hidden sm:block"
          >
            <TabsList>
              <TabsTrigger value="month">{t('calendar.month')}</TabsTrigger>
              <TabsTrigger value="week">{t('calendar.week')}</TabsTrigger>
              <TabsTrigger value="list">{t('calendar.list')}</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* Calendar Grid — month view (tablet+) */}
      {effectiveView === 'month' && (
        <div className="grid grid-cols-7 gap-1 lg:gap-2">
          {/* Day Headers */}
          {calendarDays.slice(0, 7).map((day, idx) => (
            <div key={`header-${idx}`} className="text-center font-medium text-xs lg:text-sm py-1 lg:py-2 text-muted-foreground">
              {format(day, 'EEE')}
            </div>
          ))}

          {/* Month View Days */}
          {calendarDays.map((day, idx) => {
            const dayEvents = getEventsForDate(day)
            const isCurrentMonth = day.getMonth() === selectedDate.getMonth()
            const isSelected = isSameDay(day, selectedDate)
            const isTodayDate = isToday(day)

            return (
              <Card
                key={idx}
                className={cn(
                  'min-h-[60px] sm:min-h-[80px] lg:min-h-[100px] cursor-pointer transition-colors hover:bg-muted/50',
                  !isCurrentMonth && 'opacity-40',
                  isSelected && 'ring-2 ring-primary',
                  isTodayDate && 'bg-primary/10'
                )}
                onClick={() => onDateChange(day)}
              >
                <CardContent className="p-1 sm:p-2 space-y-0.5 sm:space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      'text-xs sm:text-sm font-medium',
                      isTodayDate && 'text-primary font-bold'
                    )}>
                      {format(day, 'd')}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] sm:text-xs bg-primary text-primary-foreground rounded-full px-1 sm:px-1.5 py-0.5">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5 sm:space-y-1">
                    {/* On tablet: 1 event + badge. On desktop: 2 events */}
                    {dayEvents.slice(0, 1).map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          'text-[10px] lg:text-xs p-0.5 sm:p-1 rounded truncate',
                          eventTypeColors[event.event_type].bg,
                          eventTypeColors[event.event_type].text
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          onEventClick(event)
                        }}
                      >
                        <span className="hidden lg:inline">{format(new Date(`2000-01-01T${event.start_time}`), 'HH:mm')} </span>
                        {event.title}
                      </div>
                    ))}
                    {/* Second event only on lg+ */}
                    {dayEvents.length > 1 && (
                      <div
                        className={cn(
                          'hidden lg:block text-xs p-1 rounded truncate',
                          eventTypeColors[dayEvents[1].event_type].bg,
                          eventTypeColors[dayEvents[1].event_type].text
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          onEventClick(dayEvents[1])
                        }}
                      >
                        {format(new Date(`2000-01-01T${dayEvents[1].start_time}`), 'HH:mm')} {dayEvents[1].title}
                      </div>
                    )}
                    {/* "+N more" badge */}
                    {dayEvents.length > 2 && (
                      <div className="hidden lg:block text-xs text-muted-foreground px-1">
                        {t('calendar.moreEvents', { count: dayEvents.length - 2 })}
                      </div>
                    )}
                    {dayEvents.length > 1 && (
                      <div className="lg:hidden text-[10px] text-muted-foreground px-0.5">
                        +{dayEvents.length - 1}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Calendar Grid — week view (scrollable on tablet) */}
      {effectiveView === 'week' && (
        <div className="overflow-x-auto -mx-2 px-2">
          <div className="grid grid-cols-7 gap-1 lg:gap-2 min-w-[700px]">
            {/* Day Headers */}
            {calendarDays.slice(0, 7).map((day, idx) => (
              <div key={`header-${idx}`} className="text-center font-medium text-xs lg:text-sm py-1 lg:py-2 text-muted-foreground">
                {format(day, 'EEE d')}
              </div>
            ))}

            {/* Week View - Larger Cards */}
            {calendarDays.map((day, idx) => {
              const dayEvents = getEventsForDate(day)
              const isSelected = isSameDay(day, selectedDate)
              const isTodayDate = isToday(day)

              return (
                <Card
                  key={idx}
                  className={cn(
                    'min-h-[150px] lg:min-h-[300px] cursor-pointer transition-colors hover:bg-muted/50',
                    isSelected && 'ring-2 ring-primary',
                    isTodayDate && 'bg-primary/10'
                  )}
                  onClick={() => onDateChange(day)}
                >
                  <CardContent className="p-2 lg:p-3 space-y-1 lg:space-y-2">
                    <div className="flex items-center justify-between mb-1 lg:mb-2">
                      <span className={cn(
                        'text-sm lg:text-lg font-bold',
                        isTodayDate && 'text-primary'
                      )}>
                        {format(day, 'd')}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] sm:text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 lg:space-y-2">
                      {dayEvents.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          onClick={() => onEventClick(event)}
                          compact
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* List View — grouped by day */}
      {effectiveView === 'list' && (
        <div className="space-y-4">
          {groupedEvents.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                {t('calendar.noEvents')}
              </CardContent>
            </Card>
          ) : (
            groupedEvents.map((group) => (
              <div key={group.date}>
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-1.5 px-1 mb-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    {formatGroupDate(group.date)}
                  </h3>
                </div>
                <div className="space-y-2">
                  {group.events.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={() => onEventClick(event)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
